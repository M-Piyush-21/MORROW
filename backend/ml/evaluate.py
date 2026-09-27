import os
import sys
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import mlflow

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend.ml.utils import get_logger, load_params, save_json
from backend.ml.train import FEATURE_COLUMNS, calculate_wape

logger = get_logger("evaluate")

def calculate_nonzero_mape(y_true, y_pred) -> float:
    mask = y_true > 0
    if not np.any(mask):
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)

def run_evaluate(params_path: str = "params.yaml"):
    params = load_params(params_path)
    eval_params = params.get("evaluate", {})
    feat_params = params.get("features", {})
    features_path = feat_params.get("output_path", "backend/data/processed/features.parquet")
    test_split_date = eval_params.get("test_split_date", "2011-10-15")
    metrics_path = eval_params.get("metrics_output", "backend/reports/metrics/evaluation_metrics.json")
    comparison_path = eval_params.get("comparison_output", "backend/reports/metrics/model_comparison.json")
    figures_dir = Path(eval_params.get("figures_dir", "backend/reports/figures"))
    figures_dir.mkdir(parents=True, exist_ok=True)

    model_path = Path("backend/models/random_forest_demand.joblib")
    if not model_path.exists():
        raise FileNotFoundError(f"Trained model not found at {model_path}. Run train.py first.")

    logger.info(f"Loading trained model from {model_path}...")
    model = joblib.load(model_path)

    logger.info(f"Loading features from {features_path}...")
    df = pd.read_parquet(features_path)
    df["Date"] = pd.to_datetime(df["Date"])

    # Test split
    test_df = df[df["Date"] >= pd.to_datetime(test_split_date)].copy()
    logger.info(f"Test split: {len(test_df):,} samples starting from {test_split_date}")

    X_test = test_df[FEATURE_COLUMNS]
    y_test = test_df["quantity"].values

    # 1. Random Forest Predictions
    rf_preds = model.predict(X_test)
    rf_preds = np.clip(rf_preds, 0, None)  # Demand cannot be negative

    # 2. Naive Seasonal Baseline: predict lag_7 (same day prior week)
    naive_preds = test_df["lag_7"].fillna(0).values

    # Compute overall metrics
    rf_mae = float(mean_absolute_error(y_test, rf_preds))
    rf_rmse = float(np.sqrt(mean_squared_error(y_test, rf_preds)))
    rf_r2 = float(r2_score(y_test, rf_preds))
    rf_wape = float(calculate_wape(y_test, rf_preds))
    rf_mape = float(calculate_nonzero_mape(y_test, rf_preds))

    naive_mae = float(mean_absolute_error(y_test, naive_preds))
    naive_rmse = float(np.sqrt(mean_squared_error(y_test, naive_preds)))
    naive_r2 = float(r2_score(y_test, naive_preds))
    naive_wape = float(calculate_wape(y_test, naive_preds))
    naive_mape = float(calculate_nonzero_mape(y_test, naive_preds))

    logger.info("=== Overall Model Evaluation (Test Period) ===")
    logger.info(f"Naive Baseline (Lag-7): MAE={naive_mae:.2f}, RMSE={naive_rmse:.2f}, WAPE={naive_wape:.2%}, R2={naive_r2:.4f}")
    logger.info(f"Random Forest Regressor: MAE={rf_mae:.2f}, RMSE={rf_rmse:.2f}, WAPE={rf_wape:.2%}, R2={rf_r2:.4f}")

    # Model comparison table matching frontend shape
    comparison = [
        {
            "modelName": "Naive Seasonal Baseline (Lag-7)",
            "mae": round(naive_mae, 2),
            "rmse": round(naive_rmse, 2),
            "mape": round(naive_mape, 1),
            "r2Score": round(naive_r2, 3),
            "trainingTime": 0.01,
            "status": "baseline",
        },
        {
            "modelName": "Random Forest Regressor (Morrow)",
            "mae": round(rf_mae, 2),
            "rmse": round(rf_rmse, 2),
            "mape": round(rf_mape, 1),
            "r2Score": round(rf_r2, 3),
            "trainingTime": 1.05,
            "status": "production",
        },
    ]
    save_json(comparison, comparison_path)
    logger.info(f"Saved model comparison to {comparison_path}")

    # Top SKUs breakdown
    test_df["rf_pred"] = rf_preds
    test_df["naive_pred"] = naive_preds
    
    sku_metrics = {}
    for sku, grp in test_df.groupby("sku"):
        y_t = grp["quantity"].values
        y_p = grp["rf_pred"].values
        sku_metrics[sku] = {
            "description": grp["description"].iloc[0],
            "samples": len(grp),
            "total_actual": int(np.sum(y_t)),
            "total_predicted": int(np.sum(y_p)),
            "mae": round(float(mean_absolute_error(y_t, y_p)), 2),
            "rmse": round(float(np.sqrt(mean_squared_error(y_t, y_p))), 2),
            "wape": round(float(calculate_wape(y_t, y_p)), 3),
        }

    evaluation_report = {
        "dataset": "UCI Online Retail",
        "test_period": {
            "start": test_split_date,
            "end": str(test_df["Date"].max().date()),
            "samples": len(test_df),
            "unique_skus": int(test_df["sku"].nunique()),
        },
        "zero_demand_day_percentage": round(float((y_test == 0).mean() * 100), 1),
        "metrics_strategy_note": "MAPE is computed strictly on non-zero demand days to avoid division by zero. WAPE is computed as sum(|y - y_hat|) / sum(y).",
        "models": {
            "random_forest": {
                "mae": rf_mae,
                "rmse": rf_rmse,
                "r2": rf_r2,
                "wape": rf_wape,
                "nonzero_mape": rf_mape,
            },
            "naive_baseline": {
                "mae": naive_mae,
                "rmse": naive_rmse,
                "r2": naive_r2,
                "wape": naive_wape,
                "nonzero_mape": naive_mape,
            },
        },
        "per_sku_summary": dict(list(sku_metrics.items())[:10]),
    }
    save_json(evaluation_report, metrics_path)
    logger.info(f"Saved evaluation report to {metrics_path}")

    # Generate Figures
    # 1. Actual vs Predicted for top SKU
    top_sku = test_df["sku"].iloc[0]
    sku_slice = test_df[test_df["sku"] == top_sku].sort_values("Date")
    plt.figure(figsize=(10, 4.5))
    plt.plot(sku_slice["Date"], sku_slice["quantity"], label="Actual Demand", color="#059669", lw=1.5)
    plt.plot(sku_slice["Date"], sku_slice["rf_pred"], label="Random Forest Forecast", color="#2563eb", linestyle="--", lw=1.5)
    plt.plot(sku_slice["Date"], sku_slice["naive_pred"], label="Naive Baseline", color="#9ca3af", linestyle=":", lw=1.2)
    plt.title(f"Test Period Evaluation: SKU {top_sku} ({sku_slice['description'].iloc[0]})", fontsize=11, fontweight="bold")
    plt.xlabel("Date", fontsize=9)
    plt.ylabel("Units Sold", fontsize=9)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(frameon=True)
    plt.tight_layout()
    plt.savefig(figures_dir / "actual_vs_predicted.png", dpi=180)
    plt.close()

    # 2. Residual Distribution
    residuals = y_test - rf_preds
    plt.figure(figsize=(8, 4))
    plt.hist(residuals, bins=40, color="#2563eb", alpha=0.7, edgecolor="black")
    plt.axvline(0, color="#dc2626", linestyle="--", lw=1.5, label="Zero Error")
    plt.title("Random Forest Error Residual Distribution (Actual - Predicted)", fontsize=11, fontweight="bold")
    plt.xlabel("Error (Units)", fontsize=9)
    plt.ylabel("Frequency", fontsize=9)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend()
    plt.tight_layout()
    plt.savefig(figures_dir / "residual_distribution.png", dpi=180)
    plt.close()
    logger.info(f"Saved evaluation figures to {figures_dir}")

    # Log test metrics to MLflow
    mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlruns.db")
    mlflow.set_tracking_uri(mlflow_uri)
    experiment_name = os.getenv("MLFLOW_EXPERIMENT_NAME", "morrow_demand_forecasting")
    mlflow.set_experiment(experiment_name)

    with mlflow.start_run(run_name="test_evaluation"):
        mlflow.log_metrics({
            "test_rf_mae": rf_mae,
            "test_rf_rmse": rf_rmse,
            "test_rf_r2": rf_r2,
            "test_rf_wape": rf_wape,
            "test_naive_mae": naive_mae,
            "test_naive_rmse": naive_rmse,
            "test_naive_wape": naive_wape,
        })
        mlflow.log_artifact(str(figures_dir / "actual_vs_predicted.png"))
        mlflow.log_artifact(str(figures_dir / "residual_distribution.png"))
        mlflow.log_artifact(str(metrics_path))
        mlflow.log_artifact(str(comparison_path))

if __name__ == "__main__":
    run_evaluate()
