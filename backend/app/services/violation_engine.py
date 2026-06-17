"""
Core violation detection logic. Evaluates tracked vehicles against zone rules
and generates Violation records with congestion impact scores.
"""
import logging
import math
from typing import List, Optional, Dict, Tuple
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.violation import Violation, ViolationType, VehicleType, ViolationStatus
from app.models.zone import Zone, ZoneType
from app.models.plate import LicensePlate
from app.ml.tracker import Track
from app.ml.ocr import OCRResult

logger = logging.getLogger(__name__)

# Congestion impact weights (tunable)
DWELL_WEIGHT = 0.40
VEHICLE_TYPE_WEIGHT = 0.20
ZONE_PRIORITY_WEIGHT = 0.25
LANE_BLOCK_WEIGHT = 0.15

VEHICLE_IMPACT_SCORES = {
    "truck": 1.0, "bus": 1.0, "car": 0.6, "auto_rickshaw": 0.5,
    "motorcycle": 0.3, "bicycle": 0.1, "unknown": 0.5,
}

ZONE_TYPE_FINES = {
    ZoneType.no_parking: 1000.0,
    ZoneType.intersection: 2000.0,
    ZoneType.metro_station: 1500.0,
    ZoneType.commercial: 800.0,
    ZoneType.event: 1200.0,
    ZoneType.restricted: 1500.0,
    ZoneType.general: 500.0,
}

ZONE_TYPE_VIOLATION = {
    ZoneType.no_parking: ViolationType.no_parking_zone,
    ZoneType.intersection: ViolationType.blocking_intersection,
    ZoneType.metro_station: ViolationType.illegal_parking,
    ZoneType.commercial: ViolationType.illegal_parking,
    ZoneType.event: ViolationType.illegal_parking,
    ZoneType.restricted: ViolationType.illegal_parking,
    ZoneType.general: ViolationType.illegal_parking,
}


def compute_congestion_impact(
    vehicle_class: str,
    dwell_seconds: int,
    zone_priority: int,
    blocks_lane: bool = False,
) -> float:
    """Returns 0-100 congestion impact score."""
    dwell_norm = min(dwell_seconds / 3600, 1.0)
    vehicle_score = VEHICLE_IMPACT_SCORES.get(vehicle_class, 0.5)
    priority_norm = (zone_priority - 1) / 3.0

    score = (
        dwell_norm * DWELL_WEIGHT +
        vehicle_score * VEHICLE_TYPE_WEIGHT +
        priority_norm * ZONE_PRIORITY_WEIGHT +
        (1.0 if blocks_lane else 0.3) * LANE_BLOCK_WEIGHT
    ) * 100

    return round(min(score, 100.0), 2)


def map_vehicle_class(class_name: str) -> VehicleType:
    mapping = {
        "car": VehicleType.car,
        "motorcycle": VehicleType.motorcycle,
        "truck": VehicleType.truck,
        "bus": VehicleType.bus,
        "auto_rickshaw": VehicleType.auto_rickshaw,
        "bicycle": VehicleType.bicycle,
    }
    return mapping.get(class_name, VehicleType.unknown)


def find_containing_zone(
    db: Session, latitude: float, longitude: float
) -> Optional[Zone]:
    """Find the most restrictive active zone for a lat/lng coordinate."""
    zones = db.query(Zone).filter(Zone.is_active == True).all()
    best: Optional[Zone] = None
    for zone in zones:
        dist = math.sqrt(
            (zone.center_lat - latitude) ** 2 + (zone.center_lng - longitude) ** 2
        )
        dist_meters = dist * 111000
        if dist_meters <= zone.radius_meters:
            if best is None or zone.priority_level > best.priority_level:
                best = zone
    return best


def create_violation_from_track(
    db: Session,
    track: Track,
    camera_id: Optional[int],
    ocr_result: Optional[OCRResult],
    latitude: float,
    longitude: float,
    image_url: Optional[str] = None,
    annotated_url: Optional[str] = None,
) -> Optional[Violation]:
    """Create a Violation record from a parked track if zone rules apply."""
    zone = find_containing_zone(db, latitude, longitude)

    if zone and not _is_violation_time(zone):
        return None

    priority = zone.priority_level if zone else 2
    violation_type = ZONE_TYPE_VIOLATION.get(
        zone.zone_type if zone else ZoneType.general,
        ViolationType.illegal_parking,
    )
    fine = ZONE_TYPE_FINES.get(
        zone.zone_type if zone else ZoneType.general,
        500.0,
    )

    congestion_score = compute_congestion_impact(
        vehicle_class=track.vehicle_class,
        dwell_seconds=track.dwell_seconds,
        zone_priority=priority,
    )

    violation = Violation(
        camera_id=camera_id,
        zone_id=zone.id if zone else None,
        violation_type=violation_type,
        vehicle_type=map_vehicle_class(track.vehicle_class),
        plate_number=ocr_result.normalized if ocr_result else None,
        plate_confidence=ocr_result.confidence if ocr_result else 0.0,
        detection_confidence=0.85,
        congestion_impact_score=congestion_score,
        latitude=latitude,
        longitude=longitude,
        frame_timestamp=track.first_seen,
        dwell_seconds=track.dwell_seconds,
        status=ViolationStatus.pending_review,
        fine_amount=fine,
        bounding_box=track.bbox,
        evidence_image_url=image_url,
        annotated_image_url=annotated_url,
    )
    db.add(violation)
    db.flush()

    if ocr_result:
        plate = LicensePlate(
            violation_id=violation.id,
            raw_text=ocr_result.raw_text,
            normalized_text=ocr_result.normalized,
            state_code=ocr_result.state_code,
            district_code=ocr_result.district_code,
            series=ocr_result.series,
            number=ocr_result.number,
            confidence=ocr_result.confidence,
            needs_review=ocr_result.needs_review,
            ocr_alternatives=ocr_result.alternatives,
        )
        db.add(plate)

    db.commit()
    db.refresh(violation)
    logger.info(f"Violation {violation.id} created: {violation_type.value} @ ({latitude:.4f}, {longitude:.4f})")
    return violation


def _is_violation_time(zone: Zone) -> bool:
    """Check if current time is within enforcement hours."""
    if not zone.operating_hours:
        return True
    try:
        now = datetime.now()
        start_h, start_m = map(int, zone.operating_hours["start"].split(":"))
        end_h, end_m = map(int, zone.operating_hours["end"].split(":"))
        current_minutes = now.hour * 60 + now.minute
        start_minutes = start_h * 60 + start_m
        end_minutes = end_h * 60 + end_m
        return start_minutes <= current_minutes <= end_minutes
    except Exception:
        return True
