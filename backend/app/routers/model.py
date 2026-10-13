from typing import List
from fastapi import APIRouter
from backend.app.schemas import (
    ActualVsPredictedPoint,
    ComprehensiveEvaluationResponse,
    ExperimentRun,
    ModelComparisonRow,
    ModelMetrics,
    ModelVersion,
    ModelPromotionResponse,
    ModelRollbackResponse,
    ModelInfoResponse,
)
from backend.app.config import settings
from backend.app.services.model_service import model_service

router = APIRouter(tags=["Model Performance"])



@router.get("/model/info", response_model=ModelInfoResponse)
def get_model_info():
    """
    Exposes active model version, last successful training timestamp, evaluation summary,
    and data freshness metrics for UI transparency and auditability.
    """
    return model_service.get_model_info()


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


@router.get("/model/evaluation-details", response_model=ComprehensiveEvaluationResponse)
@router.get("/model/evaluation", response_model=ComprehensiveEvaluationResponse)
def get_model_evaluation_details():

    """
    Returns the comprehensive forecasting evaluation report including
    segment metrics, horizon breakdowns (7, 14, 30 days), intermittent-demand evaluations,
    calibrated prediction interval coverage, and run metadata.
    """
    return model_service.get_evaluation_details()


@router.get("/model/promotion-status", response_model=ModelPromotionResponse)
def get_promotion_status():
    """
    Returns the latest model promotion gatekeeper decision, audit trail of evaluated gates,
    and MLflow model registry status.
    """
    from pathlib import Path
    import json
    from backend.ml.promotion import evaluate_and_promote_model

    promo_file = settings.PROMOTION_DECISION_PATH
    if promo_file.exists():

        try:
            with open(promo_file, "r") as f:
                data = json.load(f)
                return ModelPromotionResponse.model_validate(data)
        except Exception:
            pass
    res = evaluate_and_promote_model()
    return ModelPromotionResponse.model_validate(res)



@router.post("/model/promote")
def promote_candidate_model():
    """
    Evaluates candidate model against the 8 explicit promotion criteria gates in params.yaml
    and registers the approved version in MLflow Model Registry as @production.
    """
    from backend.ml.promotion import evaluate_and_promote_model
    return evaluate_and_promote_model()


@router.post("/model/rollback")
def rollback_model(reason: str = "Operator triggered manual rollback via API"):
    """
    Reverts active serving model to the previous approved stable backup
    and resets the MLflow @production alias.
    """
    from backend.ml.rollback import rollback_to_previous_approved_model
    return rollback_to_previous_approved_model(reason=reason)


