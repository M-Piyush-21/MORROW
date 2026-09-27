from typing import List
from fastapi import APIRouter
from backend.app.schemas import (
    ActualVsPredictedPoint,
    ExperimentRun,
    ModelComparisonRow,
    ModelMetrics,
    ModelVersion,
)
from backend.app.services.model_service import model_service

router = APIRouter(tags=["Model Performance"])


@router.get("/model/metrics", response_model=ModelMetrics)
def get_model_metrics():
    return model_service.get_metrics()


@router.get("/model/comparison", response_model=List[ModelComparisonRow])
def get_model_comparison():
    return model_service.get_comparison()


@router.get("/model/experiments", response_model=List[ExperimentRun])
def get_model_experiments():
    return model_service.get_experiments()


@router.get("/model/versions", response_model=List[ModelVersion])
def get_model_versions():
    return model_service.get_model_versions()


@router.get("/model/actual-vs-predicted/{product_id}", response_model=List[ActualVsPredictedPoint])
def get_actual_vs_predicted(product_id: str):
    return model_service.get_actual_vs_predicted(product_id)
