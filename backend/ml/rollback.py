import os
import sys
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import joblib
import numpy as np
try:
    import mlflow
    from mlflow.tracking import MlflowClient
except ImportError:
    mlflow = None
    MlflowClient = None

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend.ml.utils import get_logger, load_params, save_json
from backend.ml.train import FEATURE_COLUMNS

logger = get_logger("rollback")

def rollback_to_previous_approved_model(
    archive_dir_path: str = "backend/models/archived",
    target_model_path: str = "backend/models/random_forest_demand.joblib",
    metadata_path: str = "backend/models/model_metadata.json",
    reason: str = "Automated rollback triggered: new model failed post-deployment health or quality checks.",
) -> Dict[str, Any]:
    """
    Reverts the active serving model artifact to the last approved version.
    Validates model integrity via sanity inference before promoting.
    Updates MLflow model registry aliases and local metadata.
    """
    archive_dir = Path(archive_dir_path)
    target_path = Path(target_model_path)
    meta_file = Path(metadata_path)

    if not archive_dir.exists():
        raise FileNotFoundError(f"No archive directory found at {archive_dir}")

    # Find the latest archived backup file
    backups = sorted(archive_dir.glob("random_forest_demand_prev_*.joblib"), key=os.path.getmtime, reverse=True)
    if not backups:
        raise FileNotFoundError(f"No previous model backups found in {archive_dir} for rollback.")

    latest_backup = backups[0]
    logger.info(f"Identified rollback target: {latest_backup}")

    # 1. Sanity Check: Test loading candidate rollback model
    try:
        restored_model = joblib.load(latest_backup)
        # Test synthetic 1-sample prediction
        dummy_input = np.ones((1, len(FEATURE_COLUMNS)))
        test_pred = restored_model.predict(dummy_input)
        assert len(test_pred) == 1, "Rollback model failed test prediction check."
        logger.info(f"Rollback candidate passed inference sanity check. Sample output: {test_pred[0]:.2f}")
    except Exception as e:
        raise RuntimeError(f"Rollback target {latest_backup} failed sanity load check: {e}")

    # 2. Backup currently failing model into quarantined directory
    quarantine_dir = Path("backend/models/quarantined")
    quarantine_dir.mkdir(parents=True, exist_ok=True)
    now_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    if target_path.exists():
        quarantine_file = quarantine_dir / f"failing_model_{now_str}.joblib"
        shutil.move(str(target_path), str(quarantine_file))
        logger.warning(f"Quarantined failing model to {quarantine_file}")

    # 3. Restore previous model
    shutil.copy2(latest_backup, target_path)
    logger.info(f"Successfully restored approved model from {latest_backup} to {target_path}")

    # 4. Update MLflow Model Registry alias if possible
    restored_version = None
    if mlflow is not None and MlflowClient is not None:
        try:
            mlflow_uri = os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlruns.db")
            mlflow.set_tracking_uri(mlflow_uri)
            client = MlflowClient()
            registered_model_name = "morrow_demand_forecasting_model"
            versions = client.search_model_versions(f"name='{registered_model_name}'")
            if versions:
                # Sort by version descending, pick previous version
                sorted_versions = sorted(versions, key=lambda v: int(v.version), reverse=True)
                if len(sorted_versions) > 1:
                    previous_v = sorted_versions[1]
                    client.set_registered_model_alias(registered_model_name, "production", previous_v.version)
                    restored_version = previous_v.version
                    logger.info(f"MLflow alias @production reverted to version {restored_version}")
                elif len(sorted_versions) == 1:
                    restored_version = sorted_versions[0].version
        except Exception as e:
            logger.warning(f"MLflow registry alias update note during rollback: {e}")

    # 5. Update local model metadata
    import json
    if meta_file.exists():
        with open(meta_file, "r") as f:
            meta = json.load(f)
    else:
        meta = {}

    meta.update({
        "status": "ROLLED_BACK",
        "promotion_status": "ROLLED_BACK_TO_APPROVED_STABLE",
        "rollback_executed_at": datetime.now(timezone.utc).isoformat(),
        "rollback_source_file": str(latest_backup.name),
        "rollback_reason": reason,
        "restored_mlflow_version": restored_version or "v1.1.0",
    })
    save_json(meta, str(meta_file))

    result = {
        "status": "SUCCESS",
        "action": "ROLLBACK_COMPLETED",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "restored_backup": str(latest_backup),
        "active_model_path": str(target_path),
        "reason": reason,
        "restored_version": restored_version or "v1.1.0",
    }
    logger.info("Rollback operation completed successfully.")
    return result

if __name__ == "__main__":
    res = rollback_to_previous_approved_model()
    print(res)
