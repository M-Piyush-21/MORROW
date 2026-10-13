import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[3]))
from backend.ml.utils import get_logger, load_params, save_json
from backend.ml.train import FEATURE_COLUMNS, calculate_wape

logger = get_logger("monitoring.performance")

def run_performance_monitoring(
    params_path: str = "params.yaml",
    features_path: Optional[str] = None,
    model_path: Optional[str] = None,
    output_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Evaluates realized forecasting performance against observed actual demand:
      1. Rolling evaluation windows (7, 14, 30 days)
      2. SKU-level error tracking (MAE, RMSE, WAPE)
      3. Forecast bias & tracking signal (detects chronic over/under ordering)
      4. Highlights top underperforming SKUs needing operational adjustment
    """
    params = load_params(params_path)
    mon_config = params.get("monitoring", {}).get("performance", {})
    feat_path = features_path or params.get("features", {}).get("output_path", "backend/data/processed/features.parquet")
    mod_path = model_path or "backend/models/random_forest_demand.joblib"
    out_file = output_path or mon_config.get("output_path", "backend/reports/metrics/monitoring_performance.json")
    alert_thresh_wape = float(mon_config.get("wape_alert_threshold", 1.05))

    test_split_date = params.get("evaluate", {}).get("test_split_date", "2011-10-15")

    logger.info(f"Running realized forecast performance monitoring on {feat_path}...")
    if not Path(feat_path).exists():
        raise FileNotFoundError(f"Features file not found: {feat_path}")
    if not Path(mod_path).exists():
        raise FileNotFoundError(f"Model file not found: {mod_path}")

    df = pd.read_parquet(feat_path)
    df["Date"] = pd.to_datetime(df["Date"])
    test_df = df[df["Date"] >= pd.to_datetime(test_split_date)].copy()

    model = joblib.load(mod_path)
    test_df["prediction"] = np.clip(model.predict(test_df[FEATURE_COLUMNS]), 0, None)
    test_df["error"] = test_df["quantity"] - test_df["prediction"]
    test_df["abs_error"] = np.abs(test_df["error"])

    # 1. Window evaluation: 7-day, 14-day, 30-day realized performance
    max_date = test_df["Date"].max()
    windows_config = mon_config.get("evaluation_windows_days", [7, 14, 30])
    window_metrics = []

    for w_days in windows_config:
        cutoff = max_date - pd.Timedelta(days=w_days)
        w_df = test_df[test_df["Date"] > cutoff]
        if w_df.empty:
            continue

        w_actual = w_df["quantity"].to_numpy()
        w_pred = w_df["prediction"].to_numpy()

        w_mae = float(np.mean(np.abs(w_actual - w_pred)))
        w_rmse = float(np.sqrt(np.mean((w_actual - w_pred) ** 2)))
        w_wape = float(calculate_wape(w_actual, w_pred))

        # Tracking signal / bias: sum(error) / MAD
        total_error = float(np.sum(w_actual - w_pred))
        total_abs_error = float(np.sum(np.abs(w_actual - w_pred)))
        bias_pct = (total_error / total_abs_error * 100.0) if total_abs_error > 0 else 0.0

        window_metrics.append({
            "window_name": f"Last {w_days} Days",
            "window_days": w_days,
            "start_date": str(cutoff.date()),
            "end_date": str(max_date.date()),
            "sample_count": len(w_df),
            "mae": round(w_mae, 2),
            "rmse": round(w_rmse, 2),
            "wape": round(w_wape, 4),
            "wape_pct": round(w_wape * 100, 2),
            "bias_direction": "OVER_FORECASTING" if bias_pct < -5 else ("UNDER_FORECASTING" if bias_pct > 5 else "BALANCED"),
            "bias_pct": round(bias_pct, 1),
            "status": "HEALTHY" if w_wape < alert_thresh_wape else "ALERT_ELEVATED_ERROR",
        })

    # 2. SKU-level performance breakdown
    sku_groups = test_df.groupby("sku")
    sku_performance = []

    for sku, group in sku_groups:
        s_actual = group["quantity"].to_numpy()
        s_pred = group["prediction"].to_numpy()
        s_wape = calculate_wape(s_actual, s_pred)
        s_mae = float(np.mean(np.abs(s_actual - s_pred)))
        s_rmse = float(np.sqrt(np.mean((s_actual - s_pred) ** 2)))
        s_total_qty = int(group["quantity"].sum())

        sku_performance.append({
            "sku": str(sku),
            "description": str(group["description"].iloc[0] if "description" in group.columns else "General Merchandise"),
            "total_demand": s_total_qty,
            "observation_days": len(group),
            "mae": round(s_mae, 2),
            "rmse": round(s_rmse, 2),
            "wape": round(s_wape, 4),
            "wape_pct": round(s_wape * 100, 2),
            "status": "EXCELLENT" if s_wape < 0.75 else ("ACCEPTABLE" if s_wape < 1.05 else "HIGH_ERROR"),
        })

    # Sort SKUs by WAPE descending to pinpoint highest error items
    sku_performance.sort(key=lambda x: x["wape"], reverse=True)
    high_error_skus = [s for s in sku_performance if s["wape"] > alert_thresh_wape]

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model_path": mod_path,
        "evaluation_period": {
            "start": test_split_date,
            "end": str(max_date.date()),
            "total_test_observations": len(test_df),
        },
        "overall_test_wape": round(calculate_wape(test_df["quantity"].to_numpy(), test_df["prediction"].to_numpy()), 4),
        "overall_test_mae": round(float(test_df["abs_error"].mean()), 2),
        "rolling_window_performance": window_metrics,
        "total_skus_monitored": len(sku_performance),
        "high_error_skus_count": len(high_error_skus),
        "top_challenging_skus": sku_performance[:8],
        "top_performing_skus": sorted(sku_performance, key=lambda x: x["wape"])[:5],
    }

    Path(out_file).parent.mkdir(parents=True, exist_ok=True)
    save_json(report, out_file)
    logger.info(f"Performance monitoring completed: overall_wape={report['overall_test_wape']}, high_error_skus={len(high_error_skus)}")
    return report

if __name__ == "__main__":
    rep = run_performance_monitoring()
    print("Performance monitoring summary: WAPE =", rep["overall_test_wape"])
