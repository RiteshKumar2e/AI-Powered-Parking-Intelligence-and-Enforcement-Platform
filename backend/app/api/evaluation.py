"""
Performance evaluation API — exposes ML model metrics, benchmarks,
and detection accuracy assessments.
"""
from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])


@router.get("/metrics")
def get_evaluation_metrics(
    current_user: User = Depends(get_current_user),
):
    """
    Return cached performance evaluation results.

    Includes:
      - Risk classifier: Accuracy, Precision, Recall, F1-score (per-class + macro/weighted)
      - Count regressor: MAE, RMSE, R²
      - Inference benchmarks: latency (ms), throughput (pred/sec)
      - Confusion matrix
      - Training metadata

    Run `python -m app.scripts.evaluate_model` to generate/refresh these metrics.
    """
    from app.scripts.evaluate_model import get_cached_evaluation

    results = get_cached_evaluation()
    if not results:
        raise HTTPException(
            status_code=404,
            detail="Evaluation results not found. Run: python -m app.scripts.evaluate_model",
        )

    return {
        "status": "ok",
        "evaluation": results,
    }


@router.post("/run")
def run_evaluation(
    current_user: User = Depends(get_current_user),
):
    """
    Trigger a fresh evaluation run (recomputes all metrics).
    This may take a few seconds as it loads the dataset and runs predictions.

    Requires admin role.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    from app.scripts.evaluate_model import run_full_evaluation

    try:
        results = run_full_evaluation()
        if "error" in results:
            raise HTTPException(status_code=500, detail=results["error"])
        return {
            "status": "ok",
            "message": "Evaluation completed successfully",
            "evaluation": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.get("/summary")
def get_evaluation_summary(
    current_user: User = Depends(get_current_user),
):
    """
    Return a condensed summary of the evaluation metrics
    suitable for dashboard display.
    """
    from app.scripts.evaluate_model import get_cached_evaluation

    results = get_cached_evaluation()
    if not results:
        return {
            "status": "not_evaluated",
            "message": "Run evaluation first: python -m app.scripts.evaluate_model",
        }

    clf = results.get("risk_classifier", {})
    reg = results.get("count_regressor", {})
    bench = results.get("inference_benchmark", {})
    dataset = results.get("dataset", {})

    return {
        "status": "ok",
        "evaluated_at": results.get("evaluated_at"),
        "dataset_size": dataset.get("total_records", 0),
        "test_set_size": dataset.get("test_set_size", 0),
        "classifier": {
            "accuracy": clf.get("accuracy", 0),
            "weighted_f1": clf.get("weighted_f1", 0),
            "macro_f1": clf.get("macro_f1", 0),
        },
        "regressor": {
            "mae": reg.get("mae", 0),
            "rmse": reg.get("rmse", 0),
            "r2_score": reg.get("r2_score", 0),
        },
        "speed": {
            "median_latency_ms": bench.get("single_prediction_ms", {}).get("median", 0),
            "throughput_per_sec": bench.get("batch_throughput", {}).get("predictions_per_second", 0),
        },
    }
