"""
Hotspot prediction API. Uses simple statistical forecasting;
replace with XGBoost/LSTM model for production.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
import random

from app.database import get_db
from app.models.prediction import Prediction
from app.models.violation import Violation
from app.models.zone import Zone
from app.models.user import User
from app.api.deps import get_current_user, require_analyst_or_above

router = APIRouter(prefix="/predictions", tags=["Predictions"])

RISK_THRESHOLDS = {"low": 2, "medium": 5, "high": 10, "critical": 20}


def _risk_level(predicted_count: float) -> str:
    if predicted_count >= RISK_THRESHOLDS["critical"]:
        return "critical"
    if predicted_count >= RISK_THRESHOLDS["high"]:
        return "high"
    if predicted_count >= RISK_THRESHOLDS["medium"]:
        return "medium"
    return "low"


def _patrol_count(risk: str) -> int:
    return {"low": 1, "medium": 2, "high": 3, "critical": 5}.get(risk, 1)


@router.get("/forecast")
def get_forecast(
    hours_ahead: int = Query(24, ge=1, le=72),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return upcoming violation predictions per zone."""
    # Use recent data for statistical projection
    since = datetime.utcnow() - timedelta(hours=48)
    violations = (
        db.query(Violation)
        .filter(Violation.frame_timestamp >= since)
        .filter(Violation.zone_id != None)
        .all()
    )

    # Aggregate per zone
    zone_data: dict = {}
    for v in violations:
        zid = v.zone_id
        if zid not in zone_data:
            zone_data[zid] = {"count": 0, "total_congestion": 0.0}
        zone_data[zid]["count"] += 1
        zone_data[zid]["total_congestion"] += v.congestion_impact_score

    zones = db.query(Zone).filter(Zone.is_active == True).all()
    predictions = []

    for zone in zones:
        historical = zone_data.get(zone.id, {"count": 0, "total_congestion": 0.0})
        # Simple projection: extrapolate from last 48h to next N hours
        rate = historical["count"] / 48.0
        predicted_count = rate * hours_ahead * (0.8 + random.random() * 0.4)
        avg_congestion = (
            historical["total_congestion"] / historical["count"]
            if historical["count"] > 0 else 0.0
        )
        predicted_congestion = avg_congestion * (0.9 + random.random() * 0.2)

        risk = _risk_level(predicted_count)
        patrol = _patrol_count(risk)

        pred = {
            "zone_id": zone.id,
            "zone_name": zone.name,
            "zone_type": zone.zone_type.value,
            "latitude": zone.center_lat,
            "longitude": zone.center_lng,
            "forecast_timestamp": (datetime.utcnow() + timedelta(hours=hours_ahead)).isoformat(),
            "predicted_violation_count": round(predicted_count, 1),
            "predicted_congestion_score": round(min(predicted_congestion, 100), 1),
            "confidence_lower": round(predicted_count * 0.7, 1),
            "confidence_upper": round(predicted_count * 1.4, 1),
            "risk_level": risk,
            "recommended_patrol_count": patrol,
            "recommendation": f"Deploy {patrol} patrol unit(s) to {zone.name} — {risk.upper()} risk",
        }
        predictions.append(pred)

    predictions.sort(key=lambda x: x["predicted_violation_count"], reverse=True)
    return {"predictions": predictions, "hours_ahead": hours_ahead, "generated_at": datetime.utcnow().isoformat()}


@router.get("/recommendations")
def get_enforcement_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Prioritized enforcement deployment recommendations."""
    since = datetime.utcnow() - timedelta(hours=24)
    violations = (
        db.query(Violation)
        .filter(Violation.frame_timestamp >= since)
        .all()
    )

    zone_stats: dict = {}
    for v in violations:
        zid = v.zone_id or 0
        if zid not in zone_stats:
            zone = db.query(Zone).filter(Zone.id == zid).first() if zid else None
            zone_stats[zid] = {
                "zone_name": zone.name if zone else "Unmapped Area",
                "count": 0, "congestion": 0.0,
                "priority": zone.priority_level if zone else 1,
            }
        zone_stats[zid]["count"] += 1
        zone_stats[zid]["congestion"] += v.congestion_impact_score

    recommendations = []
    for zid, data in sorted(zone_stats.items(),
                            key=lambda x: x[1]["count"] * x[1]["priority"], reverse=True)[:5]:
        avg_cong = data["congestion"] / data["count"] if data["count"] else 0
        risk = _risk_level(data["count"])
        recommendations.append({
            "zone_id": zid,
            "zone_name": data["zone_name"],
            "violations_24h": data["count"],
            "avg_congestion_impact": round(avg_cong, 1),
            "priority": data["priority"],
            "risk_level": risk,
            "action": f"Immediate patrol deployment recommended" if risk in ("high", "critical")
                      else f"Schedule regular patrol",
            "patrol_count": _patrol_count(risk),
        })

    return {"recommendations": recommendations, "generated_at": datetime.utcnow().isoformat()}
