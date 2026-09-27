from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas import DemandForecast
from backend.app.services.forecast_service import forecast_service
from backend.app.services.product_service import product_service

router = APIRouter(tags=["Forecasts"])


@router.get("/forecast/{product_id}", response_model=DemandForecast)
def get_product_forecast(
    product_id: str,
    horizon: int = Query(7, ge=1, le=30, description="Forecast horizon in days (e.g. 7, 14, 30)"),
):
    product = product_service.get_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=404,
            detail=f"Product '{product_id}' not found in catalog.",
        )

    forecast = forecast_service.get_forecast(product_id, horizon=horizon)
    if not forecast:
        raise HTTPException(
            status_code=503,
            detail=f"Forecasting model is currently unavailable or historical data is insufficient for product '{product_id}'.",
        )

    return forecast
