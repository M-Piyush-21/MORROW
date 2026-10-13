from typing import List
from fastapi import APIRouter, HTTPException, Path
from backend.app.schemas import (
    RestockRecommendation,
    ReplenishmentEvaluationRequest,
    ReplenishmentEvaluationResponse,
    ReplenishmentScenariosResponse,
    PolicyTradeoffResponse,
)
from backend.app.services.restock_service import restock_service
from backend.app.services.product_service import product_service

router = APIRouter(tags=["Restock & Replenishment"])


@router.get("/recommendations/restock", response_model=List[RestockRecommendation])
def get_restock_recommendations():
    """
    Returns prioritized inventory replenishment recommendations for all active products,
    including visible calculation steps, safety stock assumptions, and applied constraints.
    """
    return restock_service.get_recommendations()


@router.post("/restock/evaluate", response_model=ReplenishmentEvaluationResponse)
def evaluate_replenishment_policy(request: ReplenishmentEvaluationRequest):
    """
    Evaluates the replenishment policy independently from the forecasting model.
    Accepts explicit inventory, forecast demand, lead time, and physical constraints (MOQ, pack size, order days).
    """
    return restock_service.evaluate_custom_policy(request)


@router.get("/restock/scenarios/{sku}", response_model=ReplenishmentScenariosResponse)
def get_sku_scenarios(
    sku: str = Path(..., description="Product SKU or ID to run scenario stress tests against")
):
    """
    Simulates inventory replenishment scenarios for the specified SKU under:
    - Lead-time delays (+2, +5, +10 days)
    - Demand volatility surges (+25%, +50%, +100%)
    - Alternative statistical safety-stock buffers (90%, 95%, 98%, 99% service levels)
    """
    product = product_service.get_by_sku(sku) or product_service.get_by_id(sku)
    if not product:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "SKU_NOT_FOUND",
                "message": f"Product SKU '{sku}' was not found in the catalog.",
                "details": {"requested_sku": sku},
            },
        )
    return restock_service.get_scenarios_for_sku(sku)


@router.get("/restock/policy-tradeoff/{sku}", response_model=PolicyTradeoffResponse)
def get_policy_tradeoff(
    sku: str = Path(..., description="Product SKU or ID to compare policy trade-offs")
):
    """
    Compares the financial and operational trade-offs between Conservative, Balanced,
    and Lean inventory replenishment policies for a given SKU.
    """
    product = product_service.get_by_sku(sku) or product_service.get_by_id(sku)
    if not product:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "SKU_NOT_FOUND",
                "message": f"Product SKU '{sku}' was not found in the catalog.",
                "details": {"requested_sku": sku},
            },
        )
    return restock_service.get_policy_tradeoff_for_sku(sku)
