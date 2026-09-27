from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Morrow Demand Forecasting & Inventory Intelligence API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]

    # File paths
    BASE_DIR: Path = Path(__file__).resolve().parents[2]
    MODEL_PATH: Path = BASE_DIR / "backend/models/random_forest_demand.joblib"
    MODEL_METADATA_PATH: Path = BASE_DIR / "backend/models/model_metadata.json"
    PROCESSED_DATA_PATH: Path = BASE_DIR / "backend/data/processed/daily_demand.parquet"
    EVALUATION_METRICS_PATH: Path = BASE_DIR / "backend/reports/metrics/evaluation_metrics.json"
    MODEL_COMPARISON_PATH: Path = BASE_DIR / "backend/reports/metrics/model_comparison.json"
    DATA_QUALITY_PATH: Path = BASE_DIR / "backend/reports/metrics/data_quality.json"
    MLFLOW_TRACKING_URI: str = "sqlite:///mlruns.db"
    MLFLOW_EXPERIMENT_NAME: str = "morrow_demand_forecasting"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
