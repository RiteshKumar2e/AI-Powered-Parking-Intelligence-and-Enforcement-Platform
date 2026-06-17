"""
Vehicle detection using YOLOv8. Falls back to simulation when model unavailable.
"""
import os
import random
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import numpy as np

logger = logging.getLogger(__name__)

VEHICLE_CLASSES = {
    2: "car", 3: "motorcycle", 5: "bus", 7: "truck",
    1: "bicycle", 0: "person",
}

YOLO_TO_VEHICLE = {
    "car": "car", "motorcycle": "motorcycle", "bus": "bus",
    "truck": "truck", "bicycle": "bicycle",
}


class DetectionResult:
    def __init__(self, track_id: str, vehicle_class: str, confidence: float,
                 bbox: Dict, is_parked: bool, dwell_seconds: int,
                 frame_number: int = 0):
        self.track_id = track_id
        self.vehicle_class = vehicle_class
        self.confidence = confidence
        self.bbox = bbox  # {"x": int, "y": int, "w": int, "h": int}
        self.is_parked = is_parked
        self.dwell_seconds = dwell_seconds
        self.frame_number = frame_number
        self.detected_at = datetime.utcnow()


class VehicleDetector:
    def __init__(self, model_path: str = "yolov8n.pt", confidence: float = 0.4,
                 simulate: bool = True):
        self.confidence = confidence
        self.simulate = simulate
        self.model = None
        self._track_counter = 0

        if not simulate:
            self._load_model(model_path)

    def _load_model(self, model_path: str):
        try:
            from ultralytics import YOLO
            self.model = YOLO(model_path)
            logger.info(f"YOLO model loaded: {model_path}")
        except Exception as e:
            logger.warning(f"YOLO model load failed ({e}), switching to simulation")
            self.simulate = True

    def detect(self, frame: np.ndarray, frame_number: int = 0) -> List[DetectionResult]:
        if self.simulate or self.model is None:
            return self._simulate_detections(frame_number)
        return self._run_yolo(frame, frame_number)

    def _run_yolo(self, frame: np.ndarray, frame_number: int) -> List[DetectionResult]:
        results = []
        try:
            predictions = self.model(frame, conf=self.confidence, verbose=False)
            for pred in predictions:
                for box in pred.boxes:
                    cls_id = int(box.cls[0])
                    if cls_id not in VEHICLE_CLASSES:
                        continue
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    bbox = {"x": int(x1), "y": int(y1), "w": int(x2 - x1), "h": int(y2 - y1)}
                    self._track_counter += 1
                    results.append(DetectionResult(
                        track_id=f"det_{self._track_counter}",
                        vehicle_class=VEHICLE_CLASSES[cls_id],
                        confidence=conf,
                        bbox=bbox,
                        is_parked=False,
                        dwell_seconds=0,
                        frame_number=frame_number,
                    ))
        except Exception as e:
            logger.error(f"YOLO inference error: {e}")
        return results

    def _simulate_detections(self, frame_number: int) -> List[DetectionResult]:
        """Generate realistic simulated detections for demo/testing."""
        num_vehicles = random.randint(2, 8)
        results = []
        for i in range(num_vehicles):
            self._track_counter += 1
            vehicle_class = random.choices(
                ["car", "motorcycle", "truck", "bus", "auto_rickshaw"],
                weights=[55, 20, 10, 8, 7]
            )[0]
            is_parked = random.random() < 0.35
            dwell = random.randint(60, 600) if is_parked else random.randint(0, 30)
            results.append(DetectionResult(
                track_id=f"trk_{self._track_counter:05d}",
                vehicle_class=vehicle_class,
                confidence=round(random.uniform(0.65, 0.98), 3),
                bbox={
                    "x": random.randint(50, 800),
                    "y": random.randint(50, 500),
                    "w": random.randint(80, 200),
                    "h": random.randint(50, 120),
                },
                is_parked=is_parked,
                dwell_seconds=dwell,
                frame_number=frame_number,
            ))
        return results


# Module-level singleton
_detector: Optional[VehicleDetector] = None


def get_detector() -> VehicleDetector:
    global _detector
    if _detector is None:
        from app.config import settings
        _detector = VehicleDetector(
            model_path=settings.YOLO_MODEL_PATH,
            confidence=settings.YOLO_CONFIDENCE,
            simulate=settings.SIMULATE_DETECTIONS,
        )
    return _detector
