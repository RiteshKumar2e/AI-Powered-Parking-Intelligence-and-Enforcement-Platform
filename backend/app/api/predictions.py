"""
Hotspot prediction API — powered by the RandomForest model trained on
the Bengaluru parking violation dataset (Jan–May, ~298k records).

If model files are absent, falls back to statistical projection.
Train models first: python -m app.scripts.train_model
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
import random

from app.database import get_db
from app.models.violation import Violation
from app.models.zone import Zone
from app.models.user import User
from app.api.deps import get_current_user
from app.services.ml_predictor import predict_risk, get_model_meta, is_model_loaded

router = APIRouter(prefix="/predictions", tags=["Predictions"])

RISK_THRESHOLDS = {"low": 2, "medium": 5, "high": 10, "critical": 20}


def _risk_level(count: float) -> str:
    if count >= RISK_THRESHOLDS["critical"]:
        return "critical"
    if count >= RISK_THRESHOLDS["high"]:
        return "high"
    if count >= RISK_THRESHOLDS["medium"]:
        return "medium"
    return "low"


def _patrol_count(risk: str) -> int:
    return {"low": 1, "medium": 2, "high": 3, "critical": 5}.get(risk, 1)


@router.get("/ml-status")
def ml_model_status(current_user: User = Depends(get_current_user)):
    """Return ML model load status and training metadata."""
    meta = get_model_meta()
    return {
        "model_loaded": meta.get("loaded", False),
        "info": meta,
        "message": (
            "ML model active — trained on Bengaluru dataset"
            if meta.get("loaded")
            else "ML model not loaded. Run: python -m app.scripts.train_model"
        ),
    }


@router.get("/forecast")
def get_forecast(
    hours_ahead: int = Query(24, ge=1, le=72),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return violation risk predictions per zone, ML-enhanced when available."""
    now = datetime.utcnow()
    target_hour = (now + timedelta(hours=hours_ahead // 2)).hour
    target_dow  = (now + timedelta(hours=hours_ahead // 2)).weekday()
    target_month = (now + timedelta(hours=hours_ahead // 2)).month

    # Historical context for base rates (last 48 h)
    since = now - timedelta(hours=48)
    violations = (
        db.query(Violation)
        .filter(Violation.frame_timestamp >= since)
        .filter(Violation.zone_id != None)
        .all()
    )
    zone_hist: dict = {}
    for v in violations:
        zid = v.zone_id
        if zid not in zone_hist:
            zone_hist[zid] = {"count": 0, "total_congestion": 0.0}
        zone_hist[zid]["count"] += 1
        zone_hist[zid]["total_congestion"] += v.congestion_impact_score

    zones = db.query(Zone).filter(Zone.is_active == True).all()
    use_ml = is_model_loaded()
    predictions = []

    for zone in zones:
        hist = zone_hist.get(zone.id, {"count": 0, "total_congestion": 0.0})

        if use_ml and zone.center_lat and zone.center_lng:
            ml = predict_risk(
                lat=zone.center_lat,
                lng=zone.center_lng,
                hour=target_hour,
                day_of_week=target_dow,
                month=target_month,
                vehicle_type="car",
            )
            predicted_count = ml["predicted_count"]
            # Blend ML prediction with local historical rate (70/30)
            hist_rate = hist["count"] / 48.0 * hours_ahead
            predicted_count = 0.7 * predicted_count + 0.3 * hist_rate
            risk = ml["risk_level"]
            confidence = ml["confidence"]
        else:
            # Statistical fallback
            rate = hist["count"] / 48.0
            predicted_count = rate * hours_ahead * (0.8 + random.random() * 0.4)
            risk = _risk_level(predicted_count)
            confidence = 0.5

        avg_congestion = (
            hist["total_congestion"] / hist["count"]
            if hist["count"] > 0 else 0.0
        )
        predicted_congestion = avg_congestion * (0.9 + random.random() * 0.2)
        patrol = _patrol_count(risk)

        predictions.append({
            "zone_id":                   zone.id,
            "zone_name":                 zone.name,
            "zone_type":                 zone.zone_type.value,
            "latitude":                  zone.center_lat,
            "longitude":                 zone.center_lng,
            "forecast_timestamp":        (now + timedelta(hours=hours_ahead)).isoformat(),
            "predicted_violation_count": round(predicted_count, 1),
            "predicted_congestion_score": round(min(predicted_congestion, 100), 1),
            "confidence_lower":          round(predicted_count * 0.7, 1),
            "confidence_upper":          round(predicted_count * 1.4, 1),
            "risk_level":                risk,
            "confidence":                round(confidence, 3),
            "recommended_patrol_count":  patrol,
            "ml_powered":                use_ml,
            "recommendation": (
                f"Deploy {patrol} patrol unit(s) to {zone.name} — {risk.upper()} risk"
            ),
        })

    predictions.sort(key=lambda x: x["predicted_violation_count"], reverse=True)
    return {
        "predictions":    predictions,
        "hours_ahead":    hours_ahead,
        "ml_powered":     use_ml,
        "generated_at":   now.isoformat(),
    }


@router.get("/recommendations")
def get_enforcement_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Prioritized enforcement deployment recommendations."""
    since = datetime.utcnow() - timedelta(hours=24)
    violations = db.query(Violation).filter(Violation.frame_timestamp >= since).all()

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
    for zid, data in sorted(
        zone_stats.items(), key=lambda x: x[1]["count"] * x[1]["priority"], reverse=True
    )[:5]:
        avg_cong = data["congestion"] / data["count"] if data["count"] else 0
        risk = _risk_level(data["count"])
        recommendations.append({
            "zone_id":               zid,
            "zone_name":             data["zone_name"],
            "violations_24h":        data["count"],
            "avg_congestion_impact": round(avg_cong, 1),
            "priority":              data["priority"],
            "risk_level":            risk,
            "action": (
                "Immediate patrol deployment recommended"
                if risk in ("high", "critical")
                else "Schedule regular patrol"
            ),
            "patrol_count": _patrol_count(risk),
        })

    return {
        "recommendations": recommendations,
        "generated_at":    datetime.utcnow().isoformat(),
    }
