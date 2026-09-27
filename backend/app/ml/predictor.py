from pathlib import Path
from typing import Optional
from backend.ml.predict import DemandPredictor
from backend.app.config import settings

_predictor_instance: Optional[DemandPredictor] = None

def get_predictor() -> DemandPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = DemandPredictor(
            model_path=str(settings.MODEL_PATH),
            metadata_path=str(settings.MODEL_METADATA_PATH),
            data_path=str(settings.PROCESSED_DATA_PATH),
        )
    return _predictor_instance
