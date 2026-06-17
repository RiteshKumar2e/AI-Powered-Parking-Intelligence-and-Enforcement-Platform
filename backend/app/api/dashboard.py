from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime, timedelta

from app.database import get_db
from app.models.violation import Violation, ViolationStatus
from app.models.camera import Camera, CameraStatus
from app.models.zone import Zone
from app.models.congestion import CongestionMetric
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    week_start = today_start - timedelta(days=7)

    total_violations_today = db.query(Violation).filter(
        Violation.frame_timestamp >= today_start
    ).count()

    total_violations_yesterday = db.query(Violation).filter(
        Violation.frame_timestamp >= yesterday_start,
        Violation.frame_timestamp < today_start,
    ).count()

    pending_review = db.query(Violation).filter(
        Violation.status == ViolationStatus.pending_review
    ).count()

    active_cameras = db.query(Camera).filter(
        Camera.status == CameraStatus.active
    ).count()

    total_cameras = db.query(Camera).count()

    # Average congestion score (last hour)
    one_hour_ago = now - timedelta(hours=1)
    recent_metrics = db.query(CongestionMetric).filter(
        CongestionMetric.timestamp >= one_hour_ago
    ).all()
    avg_congestion = (
        sum(m.congestion_score for m in recent_metrics) / len(recent_metrics)
        if recent_metrics else 0.0
    )

    # Weekly trend
    weekly_violations = db.query(Violation).filter(
        Violation.frame_timestamp >= week_start
    ).count()

    # Violation change percentage
    change_pct = 0.0
    if total_violations_yesterday > 0:
        change_pct = ((total_violations_today - total_violations_yesterday) /
                      total_violations_yesterday * 100)

    return {
        "violations": {
            "today": total_violations_today,
            "yesterday": total_violations_yesterday,
            "change_percent": round(change_pct, 1),
            "this_week": weekly_violations,
            "pending_review": pending_review,
        },
        "cameras": {
            "active": active_cameras,
            "total": total_cameras,
            "inactive": total_cameras - active_cameras,
        },
        "congestion": {
            "current_avg_score": round(avg_congestion, 1),
            "level": "High" if avg_congestion > 70 else "Medium" if avg_congestion > 40 else "Low",
        },
        "generated_at": now.isoformat(),
    }


@router.get("/recent-violations")
def get_recent_violations(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    violations = (
        db.query(Violation)
        .order_by(Violation.frame_timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": v.id,
            "violation_type": v.violation_type.value,
            "vehicle_type": v.vehicle_type.value,
            "plate_number": v.plate_number,
            "status": v.status.value,
            "congestion_impact": v.congestion_impact_score,
            "timestamp": v.frame_timestamp.isoformat(),
            "camera_id": v.camera_id,
            "annotated_image_url": v.annotated_image_url,
        }
        for v in violations
    ]


@router.get("/violation-trend")
def get_violation_trend(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Daily violation counts for trend chart."""
    now = datetime.utcnow()
    trend = []
    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = db.query(Violation).filter(
            Violation.frame_timestamp >= day_start,
            Violation.frame_timestamp < day_end,
        ).count()
        confirmed = db.query(Violation).filter(
            Violation.frame_timestamp >= day_start,
            Violation.frame_timestamp < day_end,
            Violation.status == ViolationStatus.confirmed,
        ).count()
        trend.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "total": count,
            "confirmed": confirmed,
        })
    return {"trend": trend}


@router.get("/top-zones")
def get_top_zones(
    limit: int = 5,
    hours_back: int = 24,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(hours=hours_back)
    violations = db.query(Violation).filter(Violation.frame_timestamp >= since).all()

    zone_counts: dict = {}
    for v in violations:
        zid = v.zone_id or 0
        zone_counts[zid] = zone_counts.get(zid, 0) + 1

    top = sorted(zone_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
    result = []
    for zid, count in top:
        zone = db.query(Zone).filter(Zone.id == zid).first() if zid else None
        result.append({
            "zone_id": zid,
            "zone_name": zone.name if zone else "Unmapped",
            "zone_type": zone.zone_type.value if zone else "general",
            "violation_count": count,
            "priority_level": zone.priority_level if zone else 1,
        })
    return {"zones": result}
