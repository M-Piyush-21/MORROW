import os
import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend.ml.utils import get_logger, load_params, save_json
from backend.ml.prepare_data import run_prepare_data
from backend.ml.build_features import run_build_features
from backend.ml.train import run_train
from backend.ml.evaluate import run_evaluate
from backend.ml.promotion import evaluate_and_promote_model

logger = get_logger("pipeline")

def run_repeatable_pipeline(
    params_path: str = "params.yaml",
    smoke_test: bool = False,
    skip_prepare: bool = False,
) -> Dict[str, Any]:
    """
    Executes the complete operational ML lifecycle pipeline:
      1. Validate data & clean transactions
      2. Build shift-1 leak-free lag & rolling features
      3. Train candidate models & log experiment parameters
      4. Multi-horizon, segment, and calibrated interval evaluation
      5. Benchmark comparison with seasonal baseline
      6. Register candidate & execute promotion criteria gatekeeper (approve or reject)
    """
    pipeline_start = datetime.now(timezone.utc)
    logger.info("=" * 70)
    logger.info(f"STARTING MORROW OPERATIONAL ML PIPELINE (smoke_test={smoke_test})")
    logger.info("=" * 70)

    stages_executed = []

    # 1. Validate & Prepare Data
    if not skip_prepare:
        logger.info("--> STAGE 1/5: Validate Data Quality & Prepare Transactions...")
        run_prepare_data(params_path=params_path)
        stages_executed.append("prepare_data")
    else:
        logger.info("--> STAGE 1/5: Skipping prepare_data (using existing processed parquet).")

    # 2. Build Features
    logger.info("--> STAGE 2/5: Engineering Leak-Free Lag & Rolling Features...")
    run_build_features(params_path=params_path)
    stages_executed.append("build_features")

    # 3. Train Candidate Models
    logger.info("--> STAGE 3/5: Training Candidate Random Forest Model & MLflow Logging...")
    run_train(params_path=params_path)
    stages_executed.append("train")

    # 4. Evaluate & Baseline Comparison
    logger.info("--> STAGE 4/5: Comprehensive Evaluation (Horizons, Segments, Intervals)...")
    eval_metrics = run_evaluate(params_path=params_path)
    stages_executed.append("evaluate")

    # 5. Model Registry & Promotion Criteria Gatekeeper
    logger.info("--> STAGE 5/5: Evaluating Promotion Criteria & MLflow Registration...")
    promotion_result = evaluate_and_promote_model(params_path=params_path)
    stages_executed.append("promotion_and_registry")

    pipeline_end = datetime.now(timezone.utc)
    duration_secs = (pipeline_end - pipeline_start).total_seconds()

    summary = {
        "pipeline_status": "COMPLETED",
        "started_at": pipeline_start.isoformat(),
        "completed_at": pipeline_end.isoformat(),
        "duration_seconds": round(duration_secs, 2),
        "stages_executed": stages_executed,
        "promotion_decision": promotion_result.get("decision"),
        "promotion_reason": promotion_result.get("reason"),
        "model_version": promotion_result.get("mlflow_registration", {}).get("version"),
        "gates_passed": len([g for g in promotion_result.get("gates_evaluated", []) if g["passed"]]),
        "total_gates": len(promotion_result.get("gates_evaluated", [])),
    }

    report_path = "backend/reports/metrics/pipeline_run_summary.json"
    Path(report_path).parent.mkdir(parents=True, exist_ok=True)
    save_json(summary, report_path)
    logger.info(f"Pipeline completed in {duration_secs:.2f}s. Report saved to {report_path}")
    logger.info(f"Final Model Decision: {summary['promotion_decision']}")
    return summary

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run operational MORROW ML lifecycle pipeline")
    parser.add_argument("--smoke-test", action="store_true", help="Run lightweight validation smoke test")
    parser.add_argument("--skip-prepare", action="store_true", help="Skip heavy raw Excel data parsing if parquet exists")
    args = parser.parse_args()

    run_repeatable_pipeline(smoke_test=args.smoke_test, skip_prepare=args.skip_prepare)
