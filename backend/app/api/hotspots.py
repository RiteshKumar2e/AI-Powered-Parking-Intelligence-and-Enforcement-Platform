from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_analyst_or_above
from app.services.congestion import compute_hotspots, get_heatmap_data

router = APIRouter(prefix="/hotspots", tags=["Hotspots & Heatmaps"])


@router.get("/heatmap")
def get_heatmap(
    hours_back: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns heatmap data points for frontend map rendering."""
    data = get_heatmap_data(db, hours_back=hours_back)
    return {"points": data, "count": len(data), "period_hours": hours_back}


@router.get("/")
def list_hotspots(
    hours_back: int = Query(24, ge=1, le=168),
    min_severity: int = Query(1, ge=1, le=5),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.models.hotspot import Hotspot
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(hours=hours_back)
    hotspots = (
        db.query(Hotspot)
        .filter(Hotspot.period_start >= since)
        .filter(Hotspot.severity_level >= min_severity)
        .order_by(Hotspot.severity_level.desc(), Hotspot.violation_count.desc())
        .limit(100)
        .all()
    )
    return {"hotspots": hotspots, "total": len(hotspots)}


@router.post("/recompute")
def recompute_hotspots(
    background_tasks: BackgroundTasks,
    hours_back: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_analyst_or_above),
):
    """Trigger hotspot recomputation (runs in background)."""
    background_tasks.add_task(compute_hotspots, db, hours_back)
    return {"message": f"Hotspot computation triggered for last {hours_back} hours"}
