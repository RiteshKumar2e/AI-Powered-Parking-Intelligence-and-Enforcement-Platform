"""
Frame ingestion service. Processes uploaded images/video frames through
the ML pipeline (detect → track → OCR → violation engine).
"""
import io
import logging
import random
import base64
from typing import Optional, List, Dict
from datetime import datetime, timedelta

import numpy as np
from sqlalchemy.orm import Session
from PIL import Image, ImageDraw, ImageFont

from app.models.camera import Camera
from app.models.violation import Violation
from app.ml.detector import get_detector, DetectionResult
from app.ml.ocr import get_ocr
from app.ml.tracker import VehicleTracker
from app.services.violation_engine import create_violation_from_track
from app.services.congestion import record_congestion_snapshot
from app.services.storage import get_storage

logger = logging.getLogger(__name__)

# Per-camera tracker instances
_camera_trackers: Dict[int, VehicleTracker] = {}


def _get_tracker(camera_id: int) -> VehicleTracker:
    if camera_id not in _camera_trackers:
        _camera_trackers[camera_id] = VehicleTracker()
    return _camera_trackers[camera_id]


_MOVING_COLOR = "#1A91F0"   # blue  — moving / ok
_PARKED_COLOR = "#FF6B00"   # orange — parked / violation
_BOX_THICK    = 3
_PAD          = 5


def _get_font(size: int):
    """Return a TrueType font at given size, falling back to PIL default."""
    for name in ["arial.ttf", "Arial.ttf", "DejaVuSans-Bold.ttf", "FreeSansBold.ttf"]:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    try:
        return ImageFont.load_default()
    except Exception:
        return None


def _text_size(draw: "ImageDraw.ImageDraw", text: str, font) -> tuple:
    """Return (width, height) of text string."""
    try:
        bb = draw.textbbox((0, 0), text, font=font)
        return bb[2] - bb[0], bb[3] - bb[1]
    except Exception:
        return len(text) * 7, 13


def _draw_label(draw: "ImageDraw.ImageDraw", text: str, x1: int, y1: int,
                color: str, font) -> int:
    """White badge with colored border at (x1, y1-h). Returns badge top y."""
    tw, th = _text_size(draw, text, font)
    bx1, by1 = x1, max(0, y1 - th - _PAD * 2)
    bx2, by2 = x1 + tw + _PAD * 2, y1
    draw.rectangle([bx1, by1, bx2, by2], fill="white", outline=color, width=2)
    draw.text((bx1 + _PAD, by1 + _PAD - 1), text, fill="#111111", font=font)
    return by1


def _draw_plate_badge(draw: "ImageDraw.ImageDraw", plate: str,
                      x1: int, x2: int, above_y: int, font) -> None:
    """White pill centered above the vehicle with • plate • text."""
    text = f" • {plate} • "
    tw, th = _text_size(draw, text, font)
    cx  = (x1 + x2) // 2
    bx1 = cx - tw // 2 - _PAD
    by1 = max(0, above_y - th - _PAD * 2 - 4)
    bx2 = cx + tw // 2 + _PAD
    by2 = by1 + th + _PAD * 2
    draw.rectangle([bx1, by1, bx2, by2], fill="white", outline="#222222", width=2)
    draw.text((bx1 + _PAD, by1 + _PAD), text, fill="#111111", font=font)


def _annotate_frame(
    image_bytes: bytes,
    detections: List[DetectionResult],
    violations: List[Violation],
    plate_texts: Dict[str, str] = None,
) -> bytes:
    """Draw styled bounding boxes with numbered labels and plate badges."""
    try:
        img  = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        draw = ImageDraw.Draw(img)
        iw, ih = img.size

        font_label = _get_font(14)
        font_plate = _get_font(12)

        # Per-type counter for numbering (CAR 1, CAR 2 …)
        type_counts: Dict[str, int] = {}

        for det in detections:
            b  = det.bbox
            x1 = max(0, b["x"])
            y1 = max(0, b["y"])
            x2 = min(iw, b["x"] + b["w"])
            y2 = min(ih, b["y"] + b["h"])
            if x2 <= x1 or y2 <= y1:
                continue

            # Display name + numbering
            vtype = {
                "motorcycle": "BIKE", "bicycle": "CYCLE",
                "auto_rickshaw": "AUTO",
            }.get(det.vehicle_class, det.vehicle_class.upper())

            type_counts[vtype] = type_counts.get(vtype, 0) + 1
            label = f"{vtype} {type_counts[vtype]}"

            color = _PARKED_COLOR if det.is_parked else _MOVING_COLOR

            # Thick bounding box (draw stacked rects for thickness)
            for d in range(_BOX_THICK):
                draw.rectangle([x1 - d, y1 - d, x2 + d, y2 + d], outline=color)

            # Label badge (top-left, hugging the box)
            label_top_y = _draw_label(draw, label, x1, y1, color, font_label)

            # Plate badge (floats above label, centred on vehicle)
            plate = (plate_texts or {}).get(det.track_id)
            if plate:
                _draw_plate_badge(draw, plate, x1, x2, label_top_y, font_plate)

        output = io.BytesIO()
        img.save(output, format="JPEG", quality=90)
        return output.getvalue()
    except Exception as e:
        logger.warning(f"Frame annotation failed: {e}")
        return image_bytes


def process_frame(
    db: Session,
    camera: Camera,
    image_bytes: bytes,
    frame_number: int = 0,
    frame_timestamp: Optional[datetime] = None,
) -> Dict:
    """
    Full ML pipeline for a single frame.
    Returns dict with detections, violations created, and congestion score.
    """
    if frame_timestamp is None:
        frame_timestamp = datetime.utcnow()

    detector = get_detector()
    ocr = get_ocr()
    tracker = _get_tracker(camera.id)
    storage = get_storage()

    # Decode image to numpy array for YOLO
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        frame_array = np.array(img)
    except Exception as e:
        logger.error(f"Image decode error: {e}")
        return {"error": str(e)}

    # Run detection
    detections = detector.detect(frame_array, frame_number=frame_number)

    # Update tracker
    det_dicts = [
        {"vehicle_class": d.vehicle_class, "bbox": d.bbox, "confidence": d.confidence}
        for d in detections
    ]
    active_tracks = tracker.update(det_dicts)

    # Sync parked status from tracker back to detections
    parked_tracks = tracker.get_parked_tracks()
    for det in detections:
        for pt in parked_tracks:
            if det.vehicle_class == pt.vehicle_class:
                det.is_parked = True
                det.dwell_seconds = pt.dwell_seconds
                break

    # Run OCR on every detected vehicle crop → build plate_texts dict
    plate_results: Dict[str, object] = {}
    plate_texts:   Dict[str, str]    = {}
    for det in detections:
        try:
            crop = img.crop((
                det.bbox["x"], det.bbox["y"],
                det.bbox["x"] + det.bbox["w"],
                det.bbox["y"] + det.bbox["h"],
            ))
            result = ocr.read_plate(np.array(crop))
            if result:
                plate_results[det.track_id] = result
                plate_texts[det.track_id]   = result.normalized
        except Exception:
            pass

    # Save original frame
    orig_path, orig_url = storage.save_image(image_bytes, subfolder="evidence")

    # Annotate frame with styled boxes + plate badges
    annotated_bytes = _annotate_frame(image_bytes, detections, [], plate_texts=plate_texts)
    ann_path, ann_url = storage.save_image(annotated_bytes, subfolder="annotated")

    # Create violations for parked vehicles beyond threshold
    new_violations = []
    for det in detections:
        if not det.is_parked:
            continue

        plate_result = plate_results.get(det.track_id)

        # Assign geo coordinates (camera location + small random offset for demo)
        lat = camera.latitude + random.uniform(-0.001, 0.001)
        lng = camera.longitude + random.uniform(-0.001, 0.001)

        violation = create_violation_from_track(
            db=db,
            track=type("Track", (), {
                "track_id": det.track_id,
                "vehicle_class": det.vehicle_class,
                "dwell_seconds": det.dwell_seconds,
                "bbox": det.bbox,
                "first_seen": frame_timestamp - timedelta(seconds=det.dwell_seconds),
                "last_seen": frame_timestamp,
            })(),
            camera_id=camera.id,
            ocr_result=plate_result,
            latitude=lat,
            longitude=lng,
            image_url=orig_url,
            annotated_url=ann_url,
        )
        if violation:
            new_violations.append(violation)

    # Record congestion metric
    congestion = record_congestion_snapshot(
        db=db,
        camera=camera,
        detections=[{"is_parked": d.is_parked} for d in detections],
        violation_count=len(new_violations),
    )

    # Update camera last_active
    camera.last_active = datetime.utcnow()
    db.commit()

    return {
        "frame_number": frame_number,
        "vehicle_count": len(detections),
        "parked_count": sum(1 for d in detections if d.is_parked),
        "violations_created": len(new_violations),
        "violation_ids": [v.id for v in new_violations],
        "congestion_score": congestion.congestion_score,
        "annotated_image_url": ann_url,
    }
