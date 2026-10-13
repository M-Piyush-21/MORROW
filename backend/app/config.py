from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


def resolve_file_path(rel_path: str) -> Path:
    """
    Intelligently resolves relative file paths across local development,
    subfolder execution (cd backend), Docker containers, and Vercel serverless environments.
    """
    p = Path(rel_path)
    if p.is_absolute() and p.exists():
        return p

    current_file = Path(__file__).resolve()
    app_dir = current_file.parent
    backend_dir = app_dir.parent
    repo_root = backend_dir.parent

    backend_candidates = [backend_dir, repo_root / "backend", Path.cwd(), Path.cwd() / "backend"]
    root_candidates = [repo_root, Path.cwd(), backend_dir]

    clean_subpath = rel_path[8:] if rel_path.startswith("backend/") else rel_path

    # 1. Try repo root + rel_path
    for r in root_candidates:
        cand = r / rel_path
        if cand.exists():
            return cand.resolve()

    # 2. Try backend_dir + clean_subpath
    for b in backend_candidates:
        cand = b / clean_subpath
        if cand.exists():
            return cand.resolve()

    # 3. Try CWD + rel_path
    cwd_cand = Path.cwd() / rel_path
    if cwd_cand.exists():
        return cwd_cand.resolve()

    return (repo_root / rel_path).resolve()


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

    # File paths (auto-resolved across root, backend cwd, and serverless environments)
    BASE_DIR: Path = Path(__file__).resolve().parents[2]
    MODEL_PATH: Path = resolve_file_path("backend/models/random_forest_demand.joblib")
    MODEL_METADATA_PATH: Path = resolve_file_path("backend/models/model_metadata.json")
    PROCESSED_DATA_PATH: Path = resolve_file_path("backend/data/processed/daily_demand.parquet")
    EVALUATION_METRICS_PATH: Path = resolve_file_path("backend/reports/metrics/evaluation_metrics.json")
    MODEL_COMPARISON_PATH: Path = resolve_file_path("backend/reports/metrics/model_comparison.json")
    DATA_QUALITY_PATH: Path = resolve_file_path("backend/reports/metrics/data_quality.json")
    ACTIVE_ALERTS_PATH: Path = resolve_file_path("backend/reports/metrics/active_alerts.json")
    INVENTORY_SIMULATION_PATH: Path = resolve_file_path("backend/reports/metrics/inventory_simulation.json")
    MONITORING_DATA_QUALITY_PATH: Path = resolve_file_path("backend/reports/metrics/monitoring_data_quality.json")
    MONITORING_DRIFT_PATH: Path = resolve_file_path("backend/reports/metrics/monitoring_drift.json")
    MONITORING_PERFORMANCE_PATH: Path = resolve_file_path("backend/reports/metrics/monitoring_performance.json")
    PROMOTION_DECISION_PATH: Path = resolve_file_path("backend/reports/metrics/promotion_decision.json")
    FEEDBACK_LOG_PATH: Path = resolve_file_path("backend/data/feedback/forecast_feedback.jsonl")

    MLFLOW_TRACKING_URI: str = "sqlite:///mlruns.db"
    MLFLOW_EXPERIMENT_NAME: str = "morrow_demand_forecasting"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def resolve_path(self, path: str) -> Path:
        return resolve_file_path(path)


settings = Settings()

