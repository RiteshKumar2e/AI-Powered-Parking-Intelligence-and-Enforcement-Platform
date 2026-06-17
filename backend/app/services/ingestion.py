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


def _annotate_frame(
    image_bytes: bytes,
    detections: List[DetectionResult],
    violations: List[Violation],
) -> bytes:
    """Draw bounding boxes and violation labels on the frame."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        draw = ImageDraw.Draw(img)

        violation_track_ids = {v.notes for v in violations if v.notes}

        for det in detections:
            bbox = det.bbox
            x, y, w, h = bbox["x"], bbox["y"], bbox["w"], bbox["h"]

            color = "#FF4444" if det.is_parked else "#00CC44"
            draw.rectangle([x, y, x + w, y + h], outline=color, width=3)

            label = f"{det.vehicle_class.upper()} {'PARKED' if det.is_parked else ''}"
            draw.rectangle([x, y - 18, x + len(label) * 7, y], fill=color)
            draw.text((x + 2, y - 16), label, fill="white")

        output = io.BytesIO()
        img.save(output, format="JPEG", quality=85)
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

    # Save original frame
    orig_path, orig_url = storage.save_image(image_bytes, subfolder="evidence")

    # Annotate frame
    annotated_bytes = _annotate_frame(image_bytes, detections, [])
    ann_path, ann_url = storage.save_image(annotated_bytes, subfolder="annotated")

    # Create violations for parked vehicles beyond threshold
    new_violations = []
    for det in detections:
        if not det.is_parked:
            continue

        # Run OCR on parked vehicle crop
        try:
            crop = img.crop((
                det.bbox["x"], det.bbox["y"],
                det.bbox["x"] + det.bbox["w"],
                det.bbox["y"] + det.bbox["h"],
            ))
            plate_result = ocr.read_plate(np.array(crop))
        except Exception:
            plate_result = None

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
