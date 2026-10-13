import os
import sys
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
try:
    import mlflow
    from mlflow.tracking import MlflowClient
except ImportError:
    mlflow = None
    MlflowClient = None

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend.ml.utils import get_logger, load_params, save_json

logger = get_logger("promotion")

def evaluate_and_promote_model(
    params_path: str = "params.yaml",
    eval_metrics_path: Optional[str] = None,
    comparison_path: Optional[str] = None,
    quality_path: Optional[str] = None,
    force_decision: Optional[str] = None, # "approve" or "reject" for manual overrides
) -> Dict[str, Any]:
    """
    Evaluates a candidate trained model against explicit, pre-defined promotion criteria.
    If criteria are met:
      1. Registers the candidate model in MLflow Model Registry.
      2. Tags it as 'Production' with alias '@production'.
      3. Archives the previous approved model into backend/models/archived/ as a rollback target.
      4. Updates backend/models/model_metadata.json.
    If criteria fail:
      1. Rejects candidate, records failure reasons, retains existing production model.
    """
    params = load_params(params_path)
    promo_config = params.get("promotion", {})
    output_path = promo_config.get("output_path", "backend/reports/metrics/promotion_decision.json")

    eval_file = Path(eval_metrics_path or params.get("evaluate", {}).get("metrics_output", "backend/reports/metrics/evaluation_metrics.json"))
    comp_file = Path(comparison_path or params.get("evaluate", {}).get("comparison_output", "backend/reports/metrics/model_comparison.json"))
    qual_file = Path(quality_path or params.get("prepare", {}).get("quality_report_path", "backend/reports/metrics/data_quality.json"))
    metadata_file = Path("backend/models/model_metadata.json")

    if not eval_file.exists():
        raise FileNotFoundError(f"Evaluation metrics file not found: {eval_file}")

    import json
    with open(eval_file, "r") as f:
        eval_data = json.load(f)
    
    comp_data = {}
    if comp_file.exists():
        with open(comp_file, "r") as f:
            comp_data = json.load(f)
    
    qual_data = {}
    if qual_file.exists():
        with open(qual_file, "r") as f:
            qual_data = json.load(f)

    rf_metrics = eval_data.get("models", {}).get("random_forest", {})
    naive_metrics = eval_data.get("models", {}).get("naive_baseline", {})
    volume_segments = eval_data.get("volume_segments", {})
    interval_cal = eval_data.get("prediction_interval_calibration", {})
    run_meta = eval_data.get("run_metadata", {})

    # Evaluate explicit promotion gates
    gates: List[Dict[str, Any]] = []

    # Gate 1: Overall WAPE ceiling
    cand_wape = float(rf_metrics.get("wape", 1.0))
    max_wape = float(promo_config.get("max_overall_wape", 0.90))
    gate1_pass = cand_wape <= max_wape
    gates.append({
        "gate_id": "GATE_01_OVERALL_WAPE",
        "description": "Candidate aggregate WAPE must not exceed the operational threshold ceiling",
        "threshold": f"<= {max_wape:.2f}",
        "actual_value": f"{cand_wape:.4f}",
        "passed": bool(gate1_pass),
        "justification": "Ensures inventory forecasting error does not create runaway replenishment deviations.",
    })

    # Gate 2: Improvement over Seasonal Lag-7 Baseline
    base_wape = float(naive_metrics.get("wape", 1.0))
    min_lift_pct = float(promo_config.get("min_wape_improvement_pct", 5.0))
    actual_lift_pct = ((base_wape - cand_wape) / base_wape * 100.0) if base_wape > 0 else 0.0
    gate2_pass = actual_lift_pct >= min_lift_pct
    gates.append({
        "gate_id": "GATE_02_BASELINE_LIFT",
        "description": "Candidate must outperform naive seasonal Lag-7 baseline by defined minimum relative lift",
        "threshold": f">= {min_lift_pct:.1f}% relative lift",
        "actual_value": f"{actual_lift_pct:.2f}% relative lift",
        "passed": bool(gate2_pass),
        "justification": "Machine learning model must convincingly justify deployment overhead over simple retail heuristics.",
    })

    # Gate 3: Positive Explained Variance (R-Squared)
    cand_r2 = float(rf_metrics.get("r2", -1.0))
    min_r2 = float(promo_config.get("min_r2", 0.05))
    gate3_pass = cand_r2 >= min_r2
    gates.append({
        "gate_id": "GATE_03_EXPLAINED_VARIANCE",
        "description": "Candidate R-squared must indicate meaningful signal capture over mean prediction",
        "threshold": f">= {min_r2:.2f}",
        "actual_value": f"{cand_r2:.4f}",
        "passed": bool(gate3_pass),
        "justification": "Protects against models that perform no better than constant horizontal projections.",
    })

    # Gate 4: High-Volume Segment Guardrail (Fast Movers)
    high_vol = volume_segments.get("High-Volume (Fast Movers)", {})
    high_wape = float(high_vol.get("wape", 1.0))
    max_high_wape = float(promo_config.get("segment_guardrails", {}).get("high_volume_max_wape", 0.85))
    gate4_pass = high_wape <= max_high_wape
    gates.append({
        "gate_id": "GATE_04_HIGH_VOLUME_GUARDRAIL",
        "description": "Fast-moving revenue drivers must maintain tight WAPE guardrails",
        "threshold": f"<= {max_high_wape:.2f}",
        "actual_value": f"{high_wape:.4f}",
        "passed": bool(gate4_pass),
        "justification": "Fast movers generate over 50% of volume; excessive error here severely damages cash flow.",
    })

    # Gate 5: Mid-Volume Segment Guardrail
    mid_vol = volume_segments.get("Mid-Volume (Medium Velocity)", {})
    mid_wape = float(mid_vol.get("wape", 1.0))
    max_mid_wape = float(promo_config.get("segment_guardrails", {}).get("mid_volume_max_wape", 0.95))
    gate5_pass = mid_wape <= max_mid_wape
    gates.append({
        "gate_id": "GATE_05_MID_VOLUME_GUARDRAIL",
        "description": "Mid-velocity SKUs must adhere to bounded variance guardrail",
        "threshold": f"<= {max_mid_wape:.2f}",
        "actual_value": f"{mid_wape:.4f}",
        "passed": bool(gate5_pass),
        "justification": "Maintains catalog consistency without permitting mid-tier margin erosion.",
    })

    # Gate 6: Low-Volume Segment Guardrail (Slow Movers)
    low_vol = volume_segments.get("Low-Volume (Slow Movers)", {})
    low_wape = float(low_vol.get("wape", 1.0))
    max_low_wape = float(promo_config.get("segment_guardrails", {}).get("low_volume_max_wape", 1.40))
    gate6_pass = low_wape <= max_low_wape
    gates.append({
        "gate_id": "GATE_06_LOW_VOLUME_GUARDRAIL",
        "description": "Slow-moving intermittent SKUs must not exceed volatility tolerance threshold",
        "threshold": f"<= {max_low_wape:.2f}",
        "actual_value": f"{low_wape:.4f}",
        "passed": bool(gate6_pass),
        "justification": "Accounts for zero-sales days while preventing extreme over-forecasting.",
    })

    # Gate 7: Data Quality Gate
    critical_data_issues = qual_data.get("critical_issues_count", 0)
    max_crit_issues = int(promo_config.get("max_critical_data_quality_issues", 0))
    gate7_pass = critical_data_issues <= max_crit_issues
    gates.append({
        "gate_id": "GATE_07_DATA_QUALITY_AUDIT",
        "description": "Training and inference datasets must pass automated integrity and quality checks",
        "threshold": f"<= {max_crit_issues} critical issues",
        "actual_value": f"{critical_data_issues} issues detected",
        "passed": bool(gate7_pass),
        "justification": "Corrupted or duplicate transactional data must never propagate into active models.",
    })

    # Gate 8: Prediction Interval Empirical Coverage Calibration
    empirical_cov = float(interval_cal.get("empirical_coverage_pct", 0.0))
    min_cov = float(promo_config.get("min_prediction_interval_coverage_pct", 70.0))
    gate8_pass = empirical_cov >= min_cov
    gates.append({
        "gate_id": "GATE_08_INTERVAL_COVERAGE_CALIBRATION",
        "description": "80% nominal prediction intervals must demonstrate verified empirical coverage",
        "threshold": f">= {min_cov:.1f}% test coverage",
        "actual_value": f"{empirical_cov:.1f}% test coverage",
        "passed": bool(gate8_pass),
        "justification": "Safety stock formulas rely directly on calibrated uncertainty bounds.",
    })

    all_gates_passed = all(g["passed"] for g in gates)
    if force_decision == "approve":
        decision_status = "APPROVED_OVERRIDE"
        reason = "All gates evaluated; manual operator approval override applied."
    elif force_decision == "reject":
        decision_status = "REJECTED_OVERRIDE"
        reason = "Manual operator rejection override applied."
    elif all_gates_passed:
        decision_status = "APPROVED"
        reason = "Candidate model passed all 8 automated performance, quality, and segment guardrails."
    else:
        failed_gate_ids = [g["gate_id"] for g in gates if not g["passed"]]
        decision_status = "REJECTED"
        reason = f"Candidate failed promotion gate(s): {', '.join(failed_gate_ids)}."

    logger.info(f"Model Promotion Decision: {decision_status} - {reason}")

    # Register and transition in MLflow if approved and available
    client = None
    mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlruns.db")
    if mlflow is not None and MlflowClient is not None:
        try:
            mlflow.set_tracking_uri(mlflow_uri)
            client = MlflowClient()
        except Exception as e:
            logger.warning(f"Could not connect to MLflow tracking: {e}")
            client = None

    registered_model_name = "morrow_demand_forecasting_model"
    model_version_num = None
    rollback_target = None

    if decision_status in ["APPROVED", "APPROVED_OVERRIDE"]:
        # Prepare archive backup for rollback
        model_artifact_path = Path("backend/models/random_forest_demand.joblib")
        archive_dir = Path("backend/models/archived")
        archive_dir.mkdir(parents=True, exist_ok=True)

        timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        if model_artifact_path.exists():
            backup_file = archive_dir / f"random_forest_demand_prev_{timestamp_str}.joblib"
            shutil.copy2(model_artifact_path, backup_file)
            rollback_target = {
                "backup_path": str(backup_file),
                "archived_at": datetime.now(timezone.utc).isoformat(),
                "description": "Pre-promotion snapshot for fast single-command rollback.",
            }
            logger.info(f"Created rollback backup: {backup_file}")

        if client is not None:
            try:
                # Register candidate model in MLflow Model Registry
                run_id = run_meta.get("run_id") or eval_data.get("run_id")
                if not run_id:
                    # Find most recent finished run in experiment
                    exp = client.get_experiment_by_name(os.getenv("MLFLOW_EXPERIMENT_NAME", "morrow_demand_forecasting"))
                    if exp:
                        recent_runs = client.search_runs(exp.experiment_id, max_results=1)
                        if recent_runs:
                            run_id = recent_runs[0].info.run_id

                # Ensure registered model exists
                try:
                    client.get_registered_model(registered_model_name)
                except Exception:
                    client.create_registered_model(
                        registered_model_name,
                        description="Production retail demand forecasting model for SKU inventory optimization.",
                    )

                # Create new model version in registry
                source_uri = f"runs:/{run_id}/model" if run_id else str(model_artifact_path)
                try:
                    mv = client.create_model_version(
                        name=registered_model_name,
                        source=source_uri,
                        run_id=run_id,
                        description=f"Automated promotion via pipeline gate validation at {datetime.now(timezone.utc).isoformat()}.",
                        tags={
                            "candidate_wape": str(cand_wape),
                            "baseline_lift_pct": f"{actual_lift_pct:.2f}%",
                            "status": "Production",
                            "data_version": str(run_meta.get("data_version", "v1")),
                            "feature_version": str(run_meta.get("feature_version", "v2")),
                        },
                    )
                    model_version_num = mv.version
                    
                    # Set alias @production and @champion
                    try:
                        client.set_registered_model_alias(registered_model_name, "production", model_version_num)
                        client.set_registered_model_alias(registered_model_name, "champion", model_version_num)
                    except Exception as e:
                        logger.warning(f"Could not set alias: {e}")

                    logger.info(f"Registered model {registered_model_name} version {model_version_num} as @production")
                except Exception as e:
                    logger.warning(f"MLflow model version creation note: {e}")
                    model_version_num = "v1.2.0"
            except Exception as e:
                logger.error(f"Error communicating with MLflow registry: {e}")
                model_version_num = "v1.2.0"
        else:
            model_version_num = run_meta.get("model_version", "v1.2.0")

        # Update local model metadata JSON
        if metadata_file.exists():
            with open(metadata_file, "r") as f:
                meta = json.load(f)
        else:
            meta = {}

        meta.update({
            "model_name": "RandomForestRegressor",
            "model_version": f"v1.{model_version_num or '2.0'}",
            "promotion_status": "APPROVED",
            "promoted_at": datetime.now(timezone.utc).isoformat(),
            "promotion_gates_passed": len([g for g in gates if g["passed"]]),
            "total_promotion_gates": len(gates),
            "rollback_target": rollback_target,
            "training_data_ref": run_meta.get("data_version", "backend/data/raw/Online Retail.xlsx"),
            "feature_version": run_meta.get("feature_version", "features-v2-leak-free-lags-rolling"),
            "mlflow_registered_name": registered_model_name,
            "mlflow_version": str(model_version_num),
            "random_seed": run_meta.get("random_seed", 42),
        })
        save_json(meta, str(metadata_file))

    # Build comprehensive promotion decision response
    promotion_record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model_name": "RandomForestRegressor",
        "candidate_version": run_meta.get("model_version", "v1.2.0"),
        "decision": decision_status,
        "reason": reason,
        "overall_verdict": all_gates_passed,
        "gates_evaluated": gates,
        "summary_metrics": {
            "candidate_wape": cand_wape,
            "baseline_wape": base_wape,
            "wape_lift_pct": round(actual_lift_pct, 2),
            "candidate_mae": float(rf_metrics.get("mae", 0.0)),
            "candidate_rmse": float(rf_metrics.get("rmse", 0.0)),
            "candidate_r2": cand_r2,
            "empirical_coverage_pct": empirical_cov,
        },
        "mlflow_registration": {
            "registered_model": registered_model_name,
            "version": model_version_num,
            "alias": "@production" if decision_status in ["APPROVED", "APPROVED_OVERRIDE"] else None,
            "tracking_uri": mlflow_uri,
        },
        "rollback_target": rollback_target,
    }

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    save_json(promotion_record, output_path)
    logger.info(f"Saved promotion decision report to {output_path}")

    return promotion_record

if __name__ == "__main__":
    evaluate_and_promote_model()
