from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.congestion import CongestionMetric
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/congestion", tags=["Congestion"])


@router.get("/metrics")
def get_congestion_metrics(
    camera_id: Optional[int] = None,
    hours_back: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(hours=hours_back)
    query = db.query(CongestionMetric).filter(CongestionMetric.timestamp >= since)
    if camera_id:
        query = query.filter(CongestionMetric.camera_id == camera_id)
    metrics = query.order_by(CongestionMetric.timestamp.desc()).limit(1000).all()
    return metrics


@router.get("/timeline")
def get_congestion_timeline(
    hours_back: int = Query(24, ge=1, le=168),
    interval_minutes: int = Query(30, ge=5, le=120),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns aggregated congestion score by time bucket for charts."""
    since = datetime.utcnow() - timedelta(hours=hours_back)
    metrics = (
        db.query(CongestionMetric)
        .filter(CongestionMetric.timestamp >= since)
        .order_by(CongestionMetric.timestamp.asc())
        .all()
    )

    # Bucket by interval
    buckets: dict = {}
    for m in metrics:
        bucket_ts = m.timestamp.replace(
            minute=(m.timestamp.minute // interval_minutes) * interval_minutes,
            second=0, microsecond=0,
        )
        key = bucket_ts.isoformat()
        if key not in buckets:
            buckets[key] = {"timestamp": key, "scores": [], "vehicle_counts": []}
        buckets[key]["scores"].append(m.congestion_score)
        buckets[key]["vehicle_counts"].append(m.vehicle_count)

    timeline = []
    for key, data in sorted(buckets.items()):
        scores = data["scores"]
        timeline.append({
            "timestamp": data["timestamp"],
            "avg_congestion_score": round(sum(scores) / len(scores), 2),
            "max_congestion_score": round(max(scores), 2),
            "avg_vehicle_count": round(sum(data["vehicle_counts"]) / len(data["vehicle_counts"]), 1),
        })

    return {"timeline": timeline, "period_hours": hours_back}


@router.get("/current")
def get_current_congestion(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Latest congestion reading per camera."""
    from sqlalchemy import func
    subq = (
        db.query(
            CongestionMetric.camera_id,
            func.max(CongestionMetric.timestamp).label("max_ts"),
        )
        .group_by(CongestionMetric.camera_id)
        .subquery()
    )
    latest = (
        db.query(CongestionMetric)
        .join(subq, (CongestionMetric.camera_id == subq.c.camera_id) &
              (CongestionMetric.timestamp == subq.c.max_ts))
        .all()
    )
    return {
        "readings": [
            {
                "camera_id": m.camera_id,
                "latitude": m.latitude,
                "longitude": m.longitude,
                "congestion_score": m.congestion_score,
                "vehicle_count": m.vehicle_count,
                "parked_count": m.parked_vehicle_count,
                "violation_count": m.violation_count,
                "timestamp": m.timestamp.isoformat(),
            }
            for m in latest
        ]
    }
