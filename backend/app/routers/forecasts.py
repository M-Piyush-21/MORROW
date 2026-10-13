from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas import DemandForecast
from backend.app.services.forecast_service import forecast_service
from backend.app.services.product_service import product_service

router = APIRouter(tags=["Forecasts"])


@router.get("/forecast/{product_id}", response_model=DemandForecast)
def get_product_forecast(
    product_id: str,
    horizon: int = Query(7, description="Forecast horizon in days (between 1 and 30)"),
):
    # Explicit horizon validation for clean custom error messaging
    if horizon < 1 or horizon > 30:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "INVALID_HORIZON",
                "message": f"Forecast horizon must be between 1 and 30 days (received: {horizon}).",
                "details": {"horizon": horizon, "min_allowed": 1, "max_allowed": 30},
            },
        )

    product = product_service.get_by_id(product_id) or product_service.get_by_sku(product_id)
    if not product:
        sample_skus = [p.sku for p in product_service.get_all()[:5]]
        raise HTTPException(
            status_code=404,
            detail={
                "error": "SKU_NOT_FOUND",
                "message": f"Product SKU or ID '{product_id}' was not found in the catalog.",
                "details": {"requested_id": product_id, "sample_available_skus": sample_skus},
            },
        )

    forecast = forecast_service.get_forecast(product.id, horizon=horizon)
    if not forecast:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "MODEL_UNAVAILABLE",
                "message": f"Forecasting model is currently unavailable or historical data is insufficient for product '{product_id}'.",
                "details": {"product_id": product.id, "sku": product.sku},
            },
        )

    return forecast
