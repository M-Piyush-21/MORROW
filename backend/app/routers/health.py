from datetime import datetime
from fastapi import APIRouter
from backend.app.config import settings
from backend.app.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health():
    model_loaded = settings.MODEL_PATH.exists()
    dataset_loaded = settings.PROCESSED_DATA_PATH.exists()
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        modelLoaded=model_loaded,
        datasetLoaded=dataset_loaded,
    )
