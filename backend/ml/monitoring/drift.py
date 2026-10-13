import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[3]))
from backend.ml.utils import get_logger, load_params, save_json

logger = get_logger("monitoring.drift")

def calculate_psi(
    expected: np.ndarray,
    actual: np.ndarray,
    num_bins: int = 10,
    epsilon: float = 1e-4,
) -> Tuple[float, List[Dict[str, Any]]]:
    """
    Computes the Population Stability Index (PSI) between an expected (baseline)
    distribution and an actual (monitoring/target) distribution.
    
    Formula:
      PSI = sum( (Actual% - Expected%) * ln(Actual% / Expected%) )
    """
    # Clean NaNs
    expected = expected[~np.isnan(expected)]
    actual = actual[~np.isnan(actual)]

    if len(expected) == 0 or len(actual) == 0:
        return 0.0, []

    # Derive bin breakpoints using quantiles from the baseline distribution
    quantiles = np.linspace(0, 100, num_bins + 1)
    bin_edges = np.percentile(expected, quantiles)
    # Ensure strictly increasing edges
    bin_edges = np.unique(bin_edges)
    if len(bin_edges) <= 1:
        # Uniform or single-value series
        return 0.0, []

    bin_edges[0] = -np.inf
    bin_edges[-1] = np.inf

    # Compute frequency counts in each bin
    expected_counts, _ = np.histogram(expected, bins=bin_edges)
    actual_counts, _ = np.histogram(actual, bins=bin_edges)

    # Convert to fractions
    expected_pct = expected_counts / len(expected)
    actual_pct = actual_counts / len(actual)

    # Apply epsilon smoothing to prevent log(0) and div-by-zero
    expected_pct = np.where(expected_pct == 0, epsilon, expected_pct)
    actual_pct = np.where(actual_pct == 0, epsilon, actual_pct)

    # Normalize back to sum to 1
    expected_pct = expected_pct / np.sum(expected_pct)
    actual_pct = actual_pct / np.sum(actual_pct)

    # Bin-level PSI
    bin_psi = (actual_pct - expected_pct) * np.log(actual_pct / expected_pct)
    total_psi = float(np.sum(bin_psi))

    breakdown = []
    for i in range(len(bin_psi)):
        low_label = "-inf" if np.isneginf(bin_edges[i]) else f"{bin_edges[i]:.2f}"
        high_label = "inf" if np.isposinf(bin_edges[i+1]) else f"{bin_edges[i+1]:.2f}"
        breakdown.append({
            "bin_index": i + 1,
            "bin_range": f"[{low_label}, {high_label})",
            "expected_pct": round(float(expected_pct[i] * 100), 2),
            "actual_pct": round(float(actual_pct[i] * 100), 2),
            "psi_contribution": round(float(bin_psi[i]), 5),
        })

    return total_psi, breakdown

def run_drift_monitoring(
    params_path: str = "params.yaml",
    features_path: Optional[str] = None,
    output_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluates input feature drift using Population Stability Index (PSI).
    Compares baseline validation distribution (2011-09-01 to 2011-10-15)
    against target held-out test distribution (>= 2011-10-15).
    """
    params = load_params(params_path)
    mon_config = params.get("monitoring", {}).get("drift", {})
    feat_path = features_path or params.get("features", {}).get("output_path", "backend/data/processed/features.parquet")
    out_file = output_path or mon_config.get("output_path", "backend/reports/metrics/monitoring_drift.json")

    features_to_monitor = mon_config.get("features_to_monitor", [
        "lag_1", "lag_7", "rolling_mean_7", "rolling_mean_28", "unit_price"
    ])
    num_bins = int(mon_config.get("num_bins", 10))
    stable_thresh = float(mon_config.get("psi_stable_threshold", 0.10))
    warn_thresh = float(mon_config.get("psi_warning_threshold", 0.25))
    limitations_note = mon_config.get("limitations_note", "").strip()

    train_params = params.get("train", {})
    val_split_date = train_params.get("val_split_date", "2011-10-15")
    train_split_date = train_params.get("train_split_date", "2011-09-01")

    logger.info(f"Running input feature drift monitoring on {feat_path}...")
    if not Path(feat_path).exists():
        raise FileNotFoundError(f"Features file not found: {feat_path}")

    df = pd.read_parquet(feat_path)
    df["Date"] = pd.to_datetime(df["Date"])

    # Baseline distribution: Validation window
    baseline_df = df[(df["Date"] >= pd.to_datetime(train_split_date)) & (df["Date"] < pd.to_datetime(val_split_date))]
    # Target distribution: Production test window
    target_df = df[df["Date"] >= pd.to_datetime(val_split_date)]

    logger.info(
        f"PSI Comparison: Baseline window ({len(baseline_df):,} samples, {train_split_date} to {val_split_date}) "
        f"vs Target window ({len(target_df):,} samples, >= {val_split_date})"
    )

    feature_drift_results: Dict[str, Any] = {}
    total_psi_scores = []
    features_in_drift = []
    features_in_warning = []

    for feat in features_to_monitor:
        if feat not in df.columns:
            logger.warning(f"Feature {feat} not found in feature dataset. Skipping.")
            continue

        exp_vals = baseline_df[feat].to_numpy()
        act_vals = target_df[feat].to_numpy()

        psi_score, bin_breakdown = calculate_psi(exp_vals, act_vals, num_bins=num_bins)
        total_psi_scores.append(psi_score)

        if psi_score < stable_thresh:
            status = "STABLE"
            interpretation = "Minimal or negligible distribution shift; feature remains statistically consistent."
        elif psi_score < warn_thresh:
            status = "MODERATE_SHIFT"
            interpretation = "Noticeable distribution movement detected. Feature should be monitored."
            features_in_warning.append(feat)
        else:
            status = "SIGNIFICANT_DRIFT"
            interpretation = "Substantial distribution shift relative to validation baseline. Requires domain investigation."
            features_in_drift.append(feat)

        feature_drift_results[feat] = {
            "feature_name": feat,
            "psi": round(psi_score, 4),
            "status": status,
            "interpretation": interpretation,
            "baseline_mean": round(float(np.nanmean(exp_vals)), 2),
            "target_mean": round(float(np.nanmean(act_vals)), 2),
            "baseline_std": round(float(np.nanstd(exp_vals)), 2),
            "target_std": round(float(np.nanstd(act_vals)), 2),
            "bin_details": bin_breakdown[:5], # Store top bins for review
        }

    overall_avg_psi = float(np.mean(total_psi_scores)) if total_psi_scores else 0.0
    if len(features_in_drift) > 0:
        overall_status = "DRIFT_DETECTED"
    elif len(features_in_warning) > 0:
        overall_status = "MODERATE_SHIFT"
    else:
        overall_status = "STABLE"

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "method": "Population Stability Index (PSI)",
        "overall_status": overall_status,
        "average_feature_psi": round(overall_avg_psi, 4),
        "thresholds": {
            "stable_threshold": stable_thresh,
            "warning_threshold": warn_thresh,
            "significant_drift_threshold": warn_thresh,
        },
        "windows": {
            "baseline_window": {
                "start": train_split_date,
                "end": val_split_date,
                "sample_count": len(baseline_df),
                "description": "Validation split feature distributions",
            },
            "monitoring_window": {
                "start": val_split_date,
                "sample_count": len(target_df),
                "description": "Held-out test / live inference feature distributions",
            },
        },
        "features_evaluated_count": len(feature_drift_results),
        "features_in_drift": features_in_drift,
        "features_in_warning": features_in_warning,
        "feature_metrics": feature_drift_results,
        "operational_guidance": {
            "retraining_philosophy": (
                "CRITICAL PRINCIPLE: Feature distribution drift does NOT automatically imply that retraining is required. "
                "In retail, seasonal shopping patterns, promotional calendars, and price updates regularly alter input distributions. "
                "Drift must be treated as a trigger for investigative triage and residual validation rather than an automated retraining command."
            ),
            "recommended_investigation_steps": [
                "1. Cross-reference high-PSI features with known retail events (e.g. Q4 Black Friday surge).",
                "2. Check whether model forecast residuals (WAPE, MAE) degraded on the drifted SKUs.",
                "3. If downstream accuracy remains resilient, do not trigger retraining; update reference baseline.",
                "4. If forecast accuracy deteriorated alongside drift, validate new training window before retraining.",
            ],
            "limitations_note": limitations_note,
        },
    }

    Path(out_file).parent.mkdir(parents=True, exist_ok=True)
    save_json(report, out_file)
    logger.info(
        f"Drift monitoring completed: overall_status={overall_status}, "
        f"avg_psi={overall_avg_psi:.4f}, drifted_features={features_in_drift}"
    )
    return report

if __name__ == "__main__":
    rep = run_drift_monitoring()
    print("Drift status:", rep["overall_status"], "Avg PSI:", rep["average_feature_psi"])
