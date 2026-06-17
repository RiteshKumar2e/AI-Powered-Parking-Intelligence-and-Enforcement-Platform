"""
ML-based violation risk predictor.

Loads the RandomForest models trained by app.scripts.train_model and exposes
a single predict_risk() function used by the predictions API.

If model files are absent (not yet trained), falls back to a simple rule-based
estimate so the API still works without crashing.
"""
import os
import json
import logging
from typing import Optional

import numpy as np

log = logging.getLogger(__name__)

_MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml_models")

# Module-level singletons — loaded once on first call
_clf = None
_reg = None
_le_vehicle = None
_meta: Optional[dict] = None
_load_attempted = False


def _load_models() -> bool:
    global _clf, _reg, _le_vehicle, _meta, _load_attempted
    if _load_attempted:
        return _clf is not None
    _load_attempted = True

    paths = {
        "clf":  os.path.join(_MODEL_DIR, "risk_classifier.pkl"),
        "reg":  os.path.join(_MODEL_DIR, "count_regressor.pkl"),
        "le":   os.path.join(_MODEL_DIR, "le_vehicle.pkl"),
        "meta": os.path.join(_MODEL_DIR, "meta.json"),
    }
    if not all(os.path.exists(p) for p in paths.values()):
        log.warning(
            "ML model files not found in %s. "
            "Run: python -m app.scripts.train_model",
            _MODEL_DIR,
        )
        return False

    try:
        import joblib
        _clf        = joblib.load(paths["clf"])
        _reg        = joblib.load(paths["reg"])
        _le_vehicle = joblib.load(paths["le"])
        with open(paths["meta"]) as f:
            _meta = json.load(f)
        log.info("ML models loaded from %s", _MODEL_DIR)
        return True
    except Exception as exc:
        log.error("Failed to load ML models: %s", exc)
        return False


def is_model_loaded() -> bool:
    return _load_models()


def get_model_meta() -> dict:
    if not _load_models():
        return {"loaded": False}
    return {
        "loaded": True,
        "training_rows":  _meta.get("training_rows"),
        "training_cells": _meta.get("training_cells"),
        "vehicle_classes": _meta.get("vehicle_classes"),
        "risk_labels":    _meta.get("risk_labels"),
        "peak_hours":     _meta.get("peak_hours"),
        "lat_center":     _meta.get("lat_center"),
        "lng_center":     _meta.get("lng_center"),
    }


def predict_risk(
    lat: float,
    lng: float,
    hour: int,
    day_of_week: int,
    month: int,
    vehicle_type: str = "car",
) -> dict:
    """
    Predict violation risk for a given location + time window.

    Returns:
        {
          risk_level: "low" | "medium" | "high" | "critical",
          predicted_count: float,
          confidence: float (0-1),
          model_based: bool,
        }
    """
    if not _load_models():
        return _fallback_risk(lat, lng, hour)

    # Snap to same grid used during training (0.02° buckets)
    lat_grid = round(lat * 50) / 50
    lng_grid = round(lng * 50) / 50

    # Encode vehicle type
    vt = vehicle_type.lower().strip()
    if vt not in _le_vehicle.classes_:
        vt = "other"
    try:
        vt_enc = int(_le_vehicle.transform([vt])[0])
    except Exception:
        vt_enc = 0

    X = np.array([[lat_grid, lng_grid, hour, day_of_week, month, vt_enc]], dtype=float)

    risk_level     = str(_clf.predict(X)[0])
    risk_proba     = _clf.predict_proba(X)[0]
    confidence     = float(max(risk_proba))
    predicted_count = float(max(_reg.predict(X)[0], 0.0))

    return {
        "risk_level":      risk_level,
        "predicted_count": round(predicted_count, 1),
        "confidence":      round(confidence, 3),
        "model_based":     True,
    }


def batch_predict(locations: list[dict], hour: int, day_of_week: int, month: int) -> list[dict]:
    """
    Predict risk for multiple locations at once.
    Each item in locations must have: lat, lng, vehicle_type (optional), zone_name (optional).
    """
    results = []
    for loc in locations:
        pred = predict_risk(
            lat=loc["lat"],
            lng=loc["lng"],
            hour=hour,
            day_of_week=day_of_week,
            month=month,
            vehicle_type=loc.get("vehicle_type", "car"),
        )
        pred["zone_name"] = loc.get("zone_name", "")
        pred["zone_id"]   = loc.get("zone_id", 0)
        results.append(pred)
    return results


# ── fallback ──────────────────────────────────────────────────────────────────

_RISK_LEVELS = ["low", "medium", "high", "critical"]
_RISK_COUNTS = [1.0, 4.5, 10.0, 20.0]


def _fallback_risk(lat: float, lng: float, hour: int) -> dict:
    """Simple heuristic used when ML models are not loaded."""
    # Score based on being near a known busy area + peak-hour multiplier
    lat_dev = abs(lat - 12.97)
    lng_dev = abs(lng - 77.59)
    base = (1 - min(lat_dev + lng_dev, 1.0)) * 3
    if hour in range(8, 11) or hour in range(17, 20):
        base *= 1.6
    elif hour in range(12, 14):
        base *= 1.2
    idx = min(int(base), 3)
    return {
        "risk_level":      _RISK_LEVELS[idx],
        "predicted_count": _RISK_COUNTS[idx],
        "confidence":      0.45,
        "model_based":     False,
    }
