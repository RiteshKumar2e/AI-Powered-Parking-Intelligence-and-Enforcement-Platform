"""
Train ML models on the Bengaluru parking violation dataset.

Trains two models:
  1. risk_classifier — RandomForest that predicts risk level (low/medium/high/critical)
     given: lat_grid, lng_grid, hour, day_of_week, month, vehicle_type
  2. count_regressor — RandomForest that predicts raw violation count

Saves artifacts to backend/app/ml_models/

Run from the backend/ directory:
    python -m app.scripts.train_model
"""
import sys
import os
import json
import logging

import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, mean_absolute_error

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

# ── paths ────────────────────────────────────────────────────────────────────
_BACKEND = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
CSV_PATH = os.path.join(_BACKEND, "jan to may police violation_anonymized791b166 (1).csv")
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml_models")

RISK_BINS   = [0, 2, 7, 14, float("inf")]
RISK_LABELS = ["low", "medium", "high", "critical"]

VEHICLE_MAP = {
    "CAR": "car",
    "SCOOTER": "motorcycle",
    "MOTOR CYCLE": "motorcycle",
    "MOTORCYCLE": "motorcycle",
    "BUS": "bus",
    "TANKER": "truck",
    "LORRY": "truck",
    "MAXI-CAB": "bus",
    "PASSENGER AUTO": "auto_rickshaw",
    "AUTO": "auto_rickshaw",
    "BICYCLE": "bicycle",
}


def _primary_violation(raw: str) -> str:
    try:
        lst = json.loads(raw)
        return lst[0].strip() if lst else "NO PARKING"
    except Exception:
        return "NO PARKING"


def load_and_clean(path: str) -> pd.DataFrame:
    log.info("Loading CSV …")
    df = pd.read_csv(path)
    log.info("  %s rows", f"{len(df):,}")

    df["created_datetime"] = pd.to_datetime(df["created_datetime"], utc=True, errors="coerce")
    df = df.dropna(subset=["created_datetime", "latitude", "longitude"])
    log.info("  %s rows after dropping bad timestamps / coords", f"{len(df):,}")

    # Time features
    df["hour"]        = df["created_datetime"].dt.hour
    df["day_of_week"] = df["created_datetime"].dt.dayofweek   # 0 = Monday
    df["month"]       = df["created_datetime"].dt.month

    # Spatial grid: 0.02° ≈ 2 km
    df["lat_grid"] = (df["latitude"]  * 50).round() / 50
    df["lng_grid"] = (df["longitude"] * 50).round() / 50

    # Vehicle type normalised
    df["vehicle_clean"] = (
        df["vehicle_type"]
        .fillna("OTHER")
        .str.upper()
        .str.strip()
        .map(lambda x: VEHICLE_MAP.get(x, "other"))
    )

    # Primary violation type
    df["primary_violation"] = df["violation_type"].apply(_primary_violation)

    return df


def build_feature_table(df: pd.DataFrame):
    """Aggregate individual records into (location × time × vehicle) cells."""
    log.info("Aggregating into feature cells …")
    agg = (
        df.groupby(["lat_grid", "lng_grid", "hour", "day_of_week", "month", "vehicle_clean"])
          .size()
          .reset_index(name="violation_count")
    )
    log.info("  %s unique feature cells", f"{len(agg):,}")
    return agg


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)

    df  = load_and_clean(CSV_PATH)
    agg = build_feature_table(df)

    # Risk label from violation count
    agg["risk_label"] = pd.cut(
        agg["violation_count"],
        bins=RISK_BINS,
        labels=RISK_LABELS,
        right=True,
    ).astype(str)

    # Encode vehicle type
    le_vehicle = LabelEncoder()
    agg["vehicle_enc"] = le_vehicle.fit_transform(agg["vehicle_clean"])

    feature_cols = ["lat_grid", "lng_grid", "hour", "day_of_week", "month", "vehicle_enc"]
    X      = agg[feature_cols].values.astype(float)
    y_cls  = agg["risk_label"].values
    y_reg  = agg["violation_count"].values.astype(float)

    log.info("\nClass distribution:\n%s", pd.Series(y_cls).value_counts().to_string())

    X_tr, X_te, yc_tr, yc_te, yr_tr, yr_te = train_test_split(
        X, y_cls, y_reg, test_size=0.2, random_state=42, stratify=y_cls
    )

    # ── Classifier ───────────────────────────────────────────────────────────
    log.info("\nTraining risk classifier (RandomForest, 200 trees) …")
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=14,
        min_samples_leaf=2,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42,
    )
    clf.fit(X_tr, yc_tr)
    yc_pred = clf.predict(X_te)
    log.info("\n%s", classification_report(yc_te, yc_pred))

    # ── Regressor ────────────────────────────────────────────────────────────
    log.info("Training count regressor (RandomForest, 150 trees) …")
    reg = RandomForestRegressor(
        n_estimators=150,
        max_depth=12,
        n_jobs=-1,
        random_state=42,
    )
    reg.fit(X_tr, yr_tr)
    yr_pred = reg.predict(X_te)
    log.info("  MAE = %.3f violations", mean_absolute_error(yr_te, yr_pred))

    # ── Save ─────────────────────────────────────────────────────────────────
    joblib.dump(clf,        os.path.join(MODEL_DIR, "risk_classifier.pkl"),  compress=3)
    joblib.dump(reg,        os.path.join(MODEL_DIR, "count_regressor.pkl"),  compress=3)
    joblib.dump(le_vehicle, os.path.join(MODEL_DIR, "le_vehicle.pkl"))

    meta = {
        "feature_cols":    feature_cols,
        "risk_labels":     RISK_LABELS,
        "vehicle_classes": list(le_vehicle.classes_),
        "lat_center":  float(df["latitude"].mean()),
        "lng_center":  float(df["longitude"].mean()),
        "lat_std":     float(df["latitude"].std()),
        "lng_std":     float(df["longitude"].std()),
        "lat_min":     float(df["latitude"].min()),
        "lat_max":     float(df["latitude"].max()),
        "lng_min":     float(df["longitude"].min()),
        "lng_max":     float(df["longitude"].max()),
        "training_rows":  int(len(df)),
        "training_cells": int(len(agg)),
        "peak_hours": df.groupby("hour").size().nlargest(3).index.tolist(),
    }
    with open(os.path.join(MODEL_DIR, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)

    log.info("\nSaved to %s/", MODEL_DIR)
    log.info("  risk_classifier.pkl  count_regressor.pkl  le_vehicle.pkl  meta.json")
    log.info("Done.")


if __name__ == "__main__":
    main()
