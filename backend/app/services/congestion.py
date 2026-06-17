"""
Congestion scoring and hotspot analysis.
"""
import math
import logging
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.congestion import CongestionMetric
from app.models.hotspot import Hotspot
from app.models.violation import Violation
from app.models.camera import Camera

logger = logging.getLogger(__name__)

# Scoring parameters
BASE_CAPACITY = 20  # vehicles per block
PARKED_PENALTY = 3.0  # blocked vehicle equivalent
SPEED_THRESHOLD_KMH = 15.0


def compute_congestion_score(
    vehicle_count: int,
    parked_count: int,
    moving_count: int,
    average_speed: float,
    violation_count: int,
    blocked_lanes: int,
) -> float:
    """
    Returns 0-100 congestion score.
    Higher = worse congestion.
    """
    # Effective blocked capacity (parked vehicles consume more road space)
    effective_load = moving_count + parked_count * PARKED_PENALTY
    load_ratio = min(effective_load / BASE_CAPACITY, 1.0)

    # Speed component (low speed = high congestion)
    if average_speed > 0:
        speed_factor = max(0, 1 - (average_speed / 60.0))
    else:
        speed_factor = 0.5

    # Violation impact
    violation_factor = min(violation_count / 5.0, 1.0)

    # Lane block impact
    lane_factor = min(blocked_lanes / 2.0, 1.0)

    score = (
        load_ratio * 40 +
        speed_factor * 25 +
        violation_factor * 20 +
        lane_factor * 15
    )
    return round(min(score, 100.0), 2)


def record_congestion_snapshot(
    db: Session,
    camera: Camera,
    detections: List[Dict],
    violation_count: int,
) -> CongestionMetric:
    """Save a congestion metric snapshot from current frame detections."""
    vehicle_count = len(detections)
    parked_count = sum(1 for d in detections if d.get("is_parked", False))
    moving_count = vehicle_count - parked_count
    avg_speed = 25.0 if moving_count > 0 else 0.0
    blocked_lanes = min(parked_count // 2, 3)

    score = compute_congestion_score(
        vehicle_count=vehicle_count,
        parked_count=parked_count,
        moving_count=moving_count,
        average_speed=avg_speed,
        violation_count=violation_count,
        blocked_lanes=blocked_lanes,
    )

    metric = CongestionMetric(
        camera_id=camera.id,
        latitude=camera.latitude,
        longitude=camera.longitude,
        timestamp=datetime.utcnow(),
        vehicle_count=vehicle_count,
        parked_vehicle_count=parked_count,
        moving_vehicle_count=moving_count,
        average_speed_kmh=avg_speed,
        congestion_score=score,
        violation_count=violation_count,
        blocked_lanes=blocked_lanes,
        flow_rate=round(moving_count / 1.0, 2),
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


def compute_hotspots(db: Session, hours_back: int = 24) -> List[Hotspot]:
    """Aggregate violations into hotspot grid and upsert Hotspot records."""
    since = datetime.utcnow() - timedelta(hours=hours_back)
    violations = (
        db.query(Violation)
        .filter(Violation.frame_timestamp >= since)
        .filter(Violation.latitude != None)
        .all()
    )

    # Grid bucket: round to 3 decimal places (~111m grid)
    grid: Dict[Tuple[float, float], List[Violation]] = {}
    for v in violations:
        cell = (round(v.latitude, 3), round(v.longitude, 3))
        grid.setdefault(cell, []).append(v)

    hotspots = []
    period_start = since
    period_end = datetime.utcnow()

    for (lat, lng), viols in grid.items():
        violation_count = len(viols)
        avg_score = sum(v.congestion_impact_score for v in viols) / violation_count

        # Violation type breakdown
        type_breakdown: Dict[str, int] = {}
        for v in viols:
            key = v.violation_type.value
            type_breakdown[key] = type_breakdown.get(key, 0) + 1

        # Severity: 1-5 based on count
        severity = min(5, max(1, violation_count // 3 + 1))

        # Peak hour
        hours = [v.frame_timestamp.hour for v in viols]
        peak_hour = max(set(hours), key=hours.count) if hours else None

        # Look for existing hotspot in this period
        existing = (
            db.query(Hotspot)
            .filter(Hotspot.latitude == lat, Hotspot.longitude == lng)
            .filter(Hotspot.computed_at >= since)
            .first()
        )
        if existing:
            existing.violation_count = violation_count
            existing.avg_congestion_score = avg_score
            existing.severity_level = severity
            existing.peak_hour = peak_hour
            existing.violation_type_breakdown = type_breakdown
            existing.computed_at = datetime.utcnow()
            hotspots.append(existing)
        else:
            hs = Hotspot(
                latitude=lat,
                longitude=lng,
                violation_count=violation_count,
                avg_congestion_score=round(avg_score, 2),
                severity_level=severity,
                peak_hour=peak_hour,
                period_start=period_start,
                period_end=period_end,
                violation_type_breakdown=type_breakdown,
                trend="rising" if violation_count > 5 else "stable",
            )
            db.add(hs)
            hotspots.append(hs)

    db.commit()
    logger.info(f"Computed {len(hotspots)} hotspot cells from {len(violations)} violations")
    return hotspots


def get_heatmap_data(db: Session, hours_back: int = 24) -> List[Dict]:
    """Return heatmap points for frontend rendering."""
    since = datetime.utcnow() - timedelta(hours=hours_back)
    hotspots = (
        db.query(Hotspot)
        .filter(Hotspot.computed_at >= since)
        .order_by(Hotspot.severity_level.desc())
        .limit(500)
        .all()
    )
    if not hotspots:
        # Fallback: return all hotspots regardless of time (e.g., fresh seed data)
        hotspots = (
            db.query(Hotspot)
            .order_by(Hotspot.severity_level.desc())
            .limit(500)
            .all()
        )
    return [
        {
            "lat": h.latitude,
            "lng": h.longitude,
            "intensity": h.avg_congestion_score / 100.0,
            "violation_count": h.violation_count,
            "severity": h.severity_level,
        }
        for h in hotspots
    ]
