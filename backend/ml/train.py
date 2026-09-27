import os
import sys
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import mlflow
import mlflow.sklearn

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend.ml.utils import get_logger, load_params, save_json

logger = get_logger("train")

FEATURE_COLUMNS = [
    "lag_1", "lag_7", "lag_14", "lag_21", "lag_28",
    "rolling_mean_7", "rolling_std_7",
    "rolling_mean_14", "rolling_std_14",
    "rolling_mean_28", "rolling_std_28",
    "day_of_week", "day_of_month", "month", "is_weekend",
    "unit_price",
]

def calculate_wape(y_true, y_pred) -> float:
    denom = np.sum(np.abs(y_true))
    if denom == 0:
        return 0.0
    return float(np.sum(np.abs(y_true - y_pred)) / denom)

def run_train(params_path: str = "params.yaml"):
    params = load_params(params_path)
    train_params = params.get("train", {})
    input_path = train_params.get("input_path", "backend/data/processed/features.parquet")
    model_dir = Path(train_params.get("model_dir", "backend/models"))
    model_dir.mkdir(parents=True, exist_ok=True)
    
    train_split_date = train_params.get("train_split_date", "2011-09-01")
    val_split_date = train_params.get("val_split_date", "2011-10-15")
    
    random_state = train_params.get("random_state", 42)
    n_estimators = train_params.get("n_estimators", 120)
    max_depth = train_params.get("max_depth", 14)
    min_samples_split = train_params.get("min_samples_split", 4)

    logger.info(f"Loading features from {input_path}...")
    df = pd.read_parquet(input_path)
    df["Date"] = pd.to_datetime(df["Date"])

    # Chronological Split
    train_mask = df["Date"] < pd.to_datetime(train_split_date)
    val_mask = (df["Date"] >= pd.to_datetime(train_split_date)) & (df["Date"] < pd.to_datetime(val_split_date))
    test_mask = df["Date"] >= pd.to_datetime(val_split_date)

    train_df = df[train_mask]
    val_df = df[val_mask]
    test_df = df[test_mask]

    logger.info(
        f"Chronological split: Train ({len(train_df):,} samples, up to {train_split_date}), "
        f"Val ({len(val_df):,} samples, {train_split_date} to {val_split_date}), "
        f"Test ({len(test_df):,} samples, >= {val_split_date})"
    )

    X_train = train_df[FEATURE_COLUMNS]
    y_train = train_df["quantity"]
    
    X_val = val_df[FEATURE_COLUMNS]
    y_val = val_df["quantity"]

    # Set up MLflow
    mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlruns.db")
    mlflow.set_tracking_uri(mlflow_uri)
    experiment_name = os.getenv("MLFLOW_EXPERIMENT_NAME", "morrow_demand_forecasting")
    mlflow.set_experiment(experiment_name)

    with mlflow.start_run(run_name="random_forest_regressor") as run:
        logger.info(f"Started MLflow run ID: {run.info.run_id}")

        # Train Random Forest
        rf = RandomForestRegressor(
            n_estimators=n_estimators,
            max_depth=max_depth,
            min_samples_split=min_samples_split,
            random_state=random_state,
            n_jobs=-1,
        )
        logger.info("Training Random Forest model...")
        rf.fit(X_train, y_train)

        # Validation evaluation
        val_preds = rf.predict(X_val)
        val_mae = mean_absolute_error(y_val, val_preds)
        val_rmse = np.sqrt(mean_squared_error(y_val, val_preds))
        val_r2 = r2_score(y_val, val_preds)
        val_wape = calculate_wape(y_val, val_preds)

        logger.info(f"Validation Metrics -> MAE: {val_mae:.2f}, RMSE: {val_rmse:.2f}, R2: {val_r2:.4f}, WAPE: {val_wape:.2%}")

        # Log parameters & validation metrics to MLflow
        mlflow.log_params({
            "model_type": "RandomForestRegressor",
            "n_estimators": n_estimators,
            "max_depth": max_depth,
            "min_samples_split": min_samples_split,
            "random_state": random_state,
            "train_samples": len(train_df),
            "val_samples": len(val_df),
            "test_samples": len(test_df),
            "feature_count": len(FEATURE_COLUMNS),
            "train_split_date": train_split_date,
            "val_split_date": val_split_date,
        })
        mlflow.log_metrics({
            "val_mae": val_mae,
            "val_rmse": val_rmse,
            "val_r2": val_r2,
            "val_wape": val_wape,
        })

        # Save local model artifact
        model_path = model_dir / "random_forest_demand.joblib"
        joblib.dump(rf, model_path)
        logger.info(f"Saved model artifact to {model_path}")

        # Log model to MLflow artifact store
        try:
            mlflow.sklearn.log_model(
                rf,
                name="model",
                serialization_format="cloudpickle",
            )
        except Exception as e:
            logger.warning(f"mlflow.sklearn.log_model fallback to log_artifact due to: {e}")
            mlflow.log_artifact(str(model_path), artifact_path="model")

        # Save metadata
        metadata = {
            "model_name": "RandomForestRegressor",
            "model_version": "1.0.0",
            "run_id": run.info.run_id,
            "created_at": pd.Timestamp.now().isoformat(),
            "feature_names": FEATURE_COLUMNS,
            "train_split_date": train_split_date,
            "val_split_date": val_split_date,
            "validation_metrics": {
                "mae": float(val_mae),
                "rmse": float(val_rmse),
                "r2": float(val_r2),
                "wape": float(val_wape),
            },
            "status": "trained",
        }
        metadata_path = model_dir / "model_metadata.json"
        save_json(metadata, str(metadata_path))
        logger.info(f"Saved model metadata to {metadata_path}")

if __name__ == "__main__":
    run_train()
