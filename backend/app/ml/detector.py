"""
Vehicle detection using YOLOv8.
"""
import random
import logging
from typing import List, Dict, Optional
from datetime import datetime
import numpy as np

logger = logging.getLogger(__name__)

# COCO class IDs that we care about
VEHICLE_CLASSES = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
    1: "bicycle",
}

# Persons / pedestrians — tracked separately for violation classification
PERSON_CLASSES = {
    0: "person",
}

# ── adaptive truck-correction constants ──────────────────────────────────────
# A real truck/lorry is significantly larger than regular cars in the same scene.
# If a YOLO "truck" box is smaller than TRUCK_SIZE_RATIO × median(all boxes)
# it is almost certainly a misclassified Indian SUV/MPV (Innova, Creta, Scorpio…)
_TRUCK_SIZE_RATIO  = 2.2   # truck must be ≥ 2.2× the scene median to stay "truck"
_TRUCK_ASPECT_FLAT = 2.8   # OR clearly a side-view lorry (very wide)
_TRUCK_MIN_CONF    = 0.62  # AND must have reasonable confidence


def _areas(boxes: List[Dict]) -> List[float]:
    return [b["w"] * b["h"] for b in boxes]


def _correct_truck_labels(
    raw: List[Dict],          # each: {cls, conf, bbox}
) -> List[str]:
    """
    Scene-adaptive truck / car correction.
    Computes the median bounding-box area of ALL detections, then demotes
    any 'truck' that is not substantially larger than that median.
    Works regardless of whether the scene is a close-up street view or
    a bird's-eye parking lot.
    """
    all_areas = _areas([r["bbox"] for r in raw])
    if not all_areas:
        return [r["cls"] for r in raw]

    median_area = float(np.median(all_areas))

    corrected = []
    for r in raw:
        cls, conf, bbox = r["cls"], r["conf"], r["bbox"]
        if cls != "truck":
            corrected.append(cls)
            continue

        box_area = bbox["w"] * bbox["h"]
        aspect   = bbox["w"] / max(bbox["h"], 1)

        # Keep as truck only if:
        #   1. Clearly a flat-bed / lorry seen from the side (very wide), OR
        #   2. Substantially larger than other vehicles AND high confidence
        if aspect >= _TRUCK_ASPECT_FLAT:
            corrected.append("truck")
        elif box_area >= _TRUCK_SIZE_RATIO * median_area and conf >= _TRUCK_MIN_CONF:
            corrected.append("truck")
        else:
            logger.debug(
                "truck→car  area=%.0f  median=%.0f  ratio=%.2f  aspect=%.2f  conf=%.2f",
                box_area, median_area, box_area / max(median_area, 1), aspect, conf,
            )
            corrected.append("car")

    return corrected


class DetectionResult:
    def __init__(self, track_id: str, vehicle_class: str, confidence: float,
                 bbox: Dict, is_parked: bool, dwell_seconds: int,
                 frame_number: int = 0):
        self.track_id      = track_id
        self.vehicle_class = vehicle_class
        self.confidence    = confidence
        self.bbox          = bbox
        self.is_parked     = is_parked
        self.dwell_seconds = dwell_seconds
        self.frame_number  = frame_number
        self.detected_at   = datetime.utcnow()


class PersonDetectionResult:
    """A detected person / pedestrian (COCO class 0)."""
    def __init__(self, track_id: str, confidence: float, bbox: Dict,
                 frame_number: int = 0):
        self.track_id     = track_id
        self.confidence   = confidence
        self.bbox         = bbox
        self.frame_number = frame_number
        self.detected_at  = datetime.utcnow()


class VehicleDetector:
    def __init__(self, model_path: str = "yolov8s.pt", confidence: float = 0.40,
                 simulate: bool = True):
        self.confidence     = confidence
        self.simulate       = simulate
        self.model          = None
        self._track_counter = 0

        if not simulate:
            self._load_model(model_path)

    def _resolve_model_path(self, model_path: str) -> str:
        """
        Check local paths first so the model works offline after first download.
        Search order:
          1. Exact path as given (absolute or relative to cwd)
          2. backend/models/<name>
          3. Let ultralytics resolve (downloads if missing)
        """
        from pathlib import Path
        p = Path(model_path)
        if p.is_absolute() and p.exists():
            return str(p)

        name = p.name
        candidates = [
            p,                                                    # as-is (relative)
            Path(__file__).parent.parent.parent / "models" / name,  # backend/models/
            Path(__file__).parent / "models" / name,
        ]
        for c in candidates:
            if c.exists():
                logger.info("YOLO model found locally: %s", c)
                return str(c)

        logger.info("YOLO model not found locally — ultralytics will download: %s", name)
        return name   # let ultralytics handle download + cache

    def _load_model(self, model_path: str):
        try:
            from ultralytics import YOLO
            resolved = self._resolve_model_path(model_path)
            self.model = YOLO(resolved)
            logger.info("YOLO model loaded: %s", resolved)
        except Exception as e:
            logger.warning("YOLO load failed (%s) — simulation mode", e)
            self.simulate = True

    def detect(self, frame: np.ndarray, frame_number: int = 0):
        """
        Returns (vehicle_detections, person_detections).
        """
        if self.simulate or self.model is None:
            return self._simulate_detections(frame_number)
        return self._run_yolo(frame, frame_number)

    def _run_yolo(self, frame: np.ndarray, frame_number: int):
        raw_vehicles = []
        raw_persons  = []
        try:
            predictions = self.model(frame, conf=self.confidence, verbose=False)
            for pred in predictions:
                for box in pred.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    bbox = {
                        "x": int(x1), "y": int(y1),
                        "w": int(x2 - x1), "h": int(y2 - y1),
                    }
                    if cls_id in VEHICLE_CLASSES:
                        raw_vehicles.append({"cls": VEHICLE_CLASSES[cls_id], "conf": conf, "bbox": bbox})
                    elif cls_id in PERSON_CLASSES:
                        raw_persons.append({"conf": conf, "bbox": bbox})
        except Exception as e:
            logger.error("YOLO inference error: %s", e)
            return [], []

        # ── adaptive truck correction ─────────────────────────────────────
        corrected_classes = _correct_truck_labels(raw_vehicles)

        vehicle_results = []
        for item, final_cls in zip(raw_vehicles, corrected_classes):
            self._track_counter += 1
            vehicle_results.append(DetectionResult(
                track_id      = f"det_{self._track_counter}",
                vehicle_class = final_cls,
                confidence    = item["conf"],
                bbox          = item["bbox"],
                is_parked     = False,
                dwell_seconds = 0,
                frame_number  = frame_number,
            ))

        person_results = []
        for item in raw_persons:
            self._track_counter += 1
            person_results.append(PersonDetectionResult(
                track_id     = f"ped_{self._track_counter}",
                confidence   = item["conf"],
                bbox         = item["bbox"],
                frame_number = frame_number,
            ))

        return vehicle_results, person_results

    def _simulate_detections(self, frame_number: int):
        vehicle_results = []
        person_results  = []

        # Simulate vehicles
        for _ in range(random.randint(2, 8)):
            self._track_counter += 1
            vehicle_class = random.choices(
                ["car", "motorcycle", "truck", "bus"],
                weights=[65, 20, 8, 7],
            )[0]
            is_parked = random.random() < 0.35
            vbbox = {
                "x": random.randint(50, 800), "y": random.randint(50, 500),
                "w": random.randint(80, 200),  "h": random.randint(50, 120),
            }
            vehicle_results.append(DetectionResult(
                track_id      = f"trk_{self._track_counter:05d}",
                vehicle_class = vehicle_class,
                confidence    = round(random.uniform(0.65, 0.98), 3),
                bbox          = vbbox,
                is_parked     = is_parked,
                dwell_seconds = random.randint(60, 600) if is_parked else 0,
                frame_number  = frame_number,
            ))

        # Simulate persons (riders / pedestrians)
        for _ in range(random.randint(0, 5)):
            self._track_counter += 1
            # Place persons near vehicles with some overlap
            ref = random.choice(vehicle_results) if vehicle_results else None
            if ref:
                px = ref.bbox["x"] + random.randint(-20, 30)
                py = ref.bbox["y"] - random.randint(0, 40)
            else:
                px = random.randint(50, 800)
                py = random.randint(50, 500)
            person_results.append(PersonDetectionResult(
                track_id     = f"ped_{self._track_counter:05d}",
                confidence   = round(random.uniform(0.60, 0.95), 3),
                bbox         = {
                    "x": max(0, px), "y": max(0, py),
                    "w": random.randint(30, 60), "h": random.randint(60, 140),
                },
                frame_number = frame_number,
            ))

        return vehicle_results, person_results


# ── singleton ────────────────────────────────────────────────────────────────
_detector: Optional[VehicleDetector] = None


def get_detector() -> VehicleDetector:
    global _detector
    if _detector is None:
        from app.config import settings
        _detector = VehicleDetector(
            model_path = settings.YOLO_MODEL_PATH,
            confidence = settings.YOLO_CONFIDENCE,
            simulate   = settings.SIMULATE_DETECTIONS,
        )
    return _detector


def reset_detector():
    global _detector
    _detector = None
