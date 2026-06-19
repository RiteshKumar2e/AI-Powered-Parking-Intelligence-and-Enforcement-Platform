"""
Performance evaluation module for the ParkIQ ML pipeline.

Computes and persists:
  - Risk classifier metrics: Accuracy, Precision, Recall, F1-score per class
  - Count regressor metrics: MAE, RMSE, R²
  - Detection benchmarks: inference latency, throughput
  - Model metadata and training provenance

Can be run standalone:
    python -m app.scripts.evaluate_model

Or accessed via API:
    GET /api/v1/evaluation/metrics
"""
import os
import sys
import json
import time
import logging
from typing import Dict, Optional
from datetime import datetime

import numpy as np

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

_BACKEND = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
_MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml_models")
_EVAL_FILE = os.path.join(_MODEL_DIR, "evaluation_results.json")
_CSV_PATH = os.path.join(_BACKEND, "jan to may police violation_anonymized791b166 (1).csv")


def _load_trained_models():
    """Load the trained models and label encoder."""
    import joblib
    paths = {
        "clf": os.path.join(_MODEL_DIR, "risk_classifier.pkl"),
        "reg": os.path.join(_MODEL_DIR, "count_regressor.pkl"),
        "le":  os.path.join(_MODEL_DIR, "le_vehicle.pkl"),
    }
    if not all(os.path.exists(p) for p in paths.values()):
        log.error("Model files not found. Run: python -m app.scripts.train_model")
        return None, None, None

    clf = joblib.load(paths["clf"])
    reg = joblib.load(paths["reg"])
    le  = joblib.load(paths["le"])
    return clf, reg, le


def evaluate_risk_classifier(clf, X_test, y_test) -> Dict:
    """Compute classification metrics: Accuracy, Precision, Recall, F1."""
    from sklearn.metrics import (
        accuracy_score,
        precision_score,
        recall_score,
        f1_score,
        classification_report,
        confusion_matrix,
    )

    y_pred = clf.predict(X_test)

    labels = sorted(set(y_test) | set(y_pred))
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test, y_pred, labels=labels)

    return {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "macro_precision": round(float(precision_score(y_test, y_pred, average="macro", zero_division=0)), 4),
        "macro_recall": round(float(recall_score(y_test, y_pred, average="macro", zero_division=0)), 4),
        "macro_f1": round(float(f1_score(y_test, y_pred, average="macro", zero_division=0)), 4),
        "weighted_precision": round(float(precision_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        "weighted_recall": round(float(recall_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        "weighted_f1": round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        "per_class": {
            label: {
                "precision": round(report[label]["precision"], 4),
                "recall": round(report[label]["recall"], 4),
                "f1_score": round(report[label]["f1-score"], 4),
                "support": int(report[label]["support"]),
            }
            for label in labels if label in report
        },
        "confusion_matrix": cm.tolist(),
        "class_labels": labels,
        "test_samples": int(len(y_test)),
    }


def evaluate_count_regressor(reg, X_test, y_test) -> Dict:
    """Compute regression metrics: MAE, RMSE, R²."""
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

    y_pred = reg.predict(X_test)
    y_pred = np.maximum(y_pred, 0)  # violations can't be negative

    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    r2 = float(r2_score(y_test, y_pred))

    # Prediction distribution
    residuals = y_test - y_pred

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2_score": round(r2, 4),
        "mean_residual": round(float(np.mean(residuals)), 4),
        "std_residual": round(float(np.std(residuals)), 4),
        "max_error": round(float(np.max(np.abs(residuals))), 2),
        "predictions_summary": {
            "mean_predicted": round(float(np.mean(y_pred)), 2),
            "mean_actual": round(float(np.mean(y_test)), 2),
            "std_predicted": round(float(np.std(y_pred)), 2),
            "std_actual": round(float(np.std(y_test)), 2),
        },
        "test_samples": int(len(y_test)),
    }


def benchmark_inference(clf, reg, X_sample, n_iterations: int = 1000) -> Dict:
    """Measure prediction latency and throughput."""
    # Single prediction latency
    latencies = []
    for _ in range(n_iterations):
        row = X_sample[np.random.randint(len(X_sample))].reshape(1, -1)
        start = time.perf_counter()
        clf.predict(row)
        reg.predict(row)
        elapsed = (time.perf_counter() - start) * 1000  # ms
        latencies.append(elapsed)

    latencies = np.array(latencies)

    # Batch throughput
    batch_start = time.perf_counter()
    clf.predict(X_sample)
    reg.predict(X_sample)
    batch_time = time.perf_counter() - batch_start

    return {
        "single_prediction_ms": {
            "mean": round(float(np.mean(latencies)), 4),
            "median": round(float(np.median(latencies)), 4),
            "p95": round(float(np.percentile(latencies, 95)), 4),
            "p99": round(float(np.percentile(latencies, 99)), 4),
            "min": round(float(np.min(latencies)), 4),
            "max": round(float(np.max(latencies)), 4),
        },
        "batch_throughput": {
            "batch_size": int(len(X_sample)),
            "total_time_sec": round(batch_time, 4),
            "predictions_per_second": round(len(X_sample) / batch_time, 1),
        },
        "iterations": n_iterations,
    }


def run_full_evaluation() -> Dict:
    """
    Run the complete evaluation pipeline:
      1. Reload dataset and split (same seed as training)
      2. Evaluate classifier
      3. Evaluate regressor
      4. Benchmark inference speed
      5. Save results to JSON
    """
    import pandas as pd
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import LabelEncoder

    clf, reg, le_vehicle = _load_trained_models()
    if clf is None:
        return {"error": "Models not trained. Run: python -m app.scripts.train_model"}

    # Rebuild dataset (same as training)
    log.info("Loading dataset for evaluation...")
    if not os.path.exists(_CSV_PATH):
        return {"error": f"Dataset not found: {_CSV_PATH}"}

    df = pd.read_csv(_CSV_PATH)
    df["created_datetime"] = pd.to_datetime(df["created_datetime"], utc=True, errors="coerce")
    df = df.dropna(subset=["created_datetime", "latitude", "longitude"])

    df["hour"] = df["created_datetime"].dt.hour
    df["day_of_week"] = df["created_datetime"].dt.dayofweek
    df["month"] = df["created_datetime"].dt.month
    df["lat_grid"] = (df["latitude"] * 50).round() / 50
    df["lng_grid"] = (df["longitude"] * 50).round() / 50

    VEHICLE_MAP = {
        "CAR": "car", "SCOOTER": "motorcycle", "MOTOR CYCLE": "motorcycle",
        "MOTORCYCLE": "motorcycle", "BUS": "bus", "TANKER": "truck",
        "LORRY": "truck", "MAXI-CAB": "bus", "PASSENGER AUTO": "auto_rickshaw",
        "AUTO": "auto_rickshaw", "BICYCLE": "bicycle",
    }
    df["vehicle_clean"] = (
        df["vehicle_type"].fillna("OTHER").str.upper().str.strip()
        .map(lambda x: VEHICLE_MAP.get(x, "other"))
    )

    agg = (
        df.groupby(["lat_grid", "lng_grid", "hour", "day_of_week", "month", "vehicle_clean"])
          .size().reset_index(name="violation_count")
    )

    RISK_BINS = [0, 2, 7, 14, float("inf")]
    RISK_LABELS = ["low", "medium", "high", "critical"]
    agg["risk_label"] = pd.cut(
        agg["violation_count"], bins=RISK_BINS, labels=RISK_LABELS, right=True,
    ).astype(str)

    le = LabelEncoder()
    agg["vehicle_enc"] = le.fit_transform(agg["vehicle_clean"])

    feature_cols = ["lat_grid", "lng_grid", "hour", "day_of_week", "month", "vehicle_enc"]
    X = agg[feature_cols].values.astype(float)
    y_cls = agg["risk_label"].values
    y_reg = agg["violation_count"].values.astype(float)

    X_tr, X_te, yc_tr, yc_te, yr_tr, yr_te = train_test_split(
        X, y_cls, y_reg, test_size=0.2, random_state=42, stratify=y_cls,
    )

    log.info("Evaluating risk classifier...")
    clf_metrics = evaluate_risk_classifier(clf, X_te, yc_te)

    log.info("Evaluating count regressor...")
    reg_metrics = evaluate_count_regressor(reg, X_te, yr_te)

    log.info("Benchmarking inference speed...")
    bench = benchmark_inference(clf, reg, X_te, n_iterations=500)

    # Load training meta
    meta_path = os.path.join(_MODEL_DIR, "meta.json")
    training_meta = {}
    if os.path.exists(meta_path):
        with open(meta_path) as f:
            training_meta = json.load(f)

    results = {
        "evaluated_at": datetime.utcnow().isoformat(),
        "dataset": {
            "total_records": int(len(df)),
            "feature_cells": int(len(agg)),
            "test_set_size": int(len(X_te)),
            "train_set_size": int(len(X_tr)),
        },
        "risk_classifier": clf_metrics,
        "count_regressor": reg_metrics,
        "inference_benchmark": bench,
        "training_metadata": training_meta,
        "model_files": {
            name: {
                "path": path,
                "size_bytes": os.path.getsize(path) if os.path.exists(path) else 0,
            }
            for name, path in [
                ("risk_classifier", os.path.join(_MODEL_DIR, "risk_classifier.pkl")),
                ("count_regressor", os.path.join(_MODEL_DIR, "count_regressor.pkl")),
                ("label_encoder", os.path.join(_MODEL_DIR, "le_vehicle.pkl")),
            ]
        },
    }

    # Save to disk
    with open(_EVAL_FILE, "w") as f:
        json.dump(results, f, indent=2)
    log.info("Evaluation results saved to %s", _EVAL_FILE)

    # Print summary
    log.info("\n" + "=" * 60)
    log.info("EVALUATION SUMMARY")
    log.info("=" * 60)
    log.info("\nRisk Classifier:")
    log.info("  Accuracy:           %.4f", clf_metrics["accuracy"])
    log.info("  Weighted Precision: %.4f", clf_metrics["weighted_precision"])
    log.info("  Weighted Recall:    %.4f", clf_metrics["weighted_recall"])
    log.info("  Weighted F1:        %.4f", clf_metrics["weighted_f1"])
    log.info("\nPer-class F1:")
    for label, data in clf_metrics["per_class"].items():
        log.info("  %-10s  P=%.3f  R=%.3f  F1=%.3f  (n=%d)",
                 label, data["precision"], data["recall"], data["f1_score"], data["support"])
    log.info("\nCount Regressor:")
    log.info("  MAE:   %.4f", reg_metrics["mae"])
    log.info("  RMSE:  %.4f", reg_metrics["rmse"])
    log.info("  R²:    %.4f", reg_metrics["r2_score"])
    log.info("\nInference Speed:")
    log.info("  Median latency:  %.3f ms", bench["single_prediction_ms"]["median"])
    log.info("  Throughput:      %.0f pred/sec", bench["batch_throughput"]["predictions_per_second"])
    log.info("=" * 60)

    return results


def get_cached_evaluation() -> Optional[Dict]:
    """Load last evaluation results from disk (fast, no re-computation)."""
    if os.path.exists(_EVAL_FILE):
        with open(_EVAL_FILE) as f:
            return json.load(f)
    return None


if __name__ == "__main__":
    run_full_evaluation()
