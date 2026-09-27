from datetime import datetime, timedelta
from typing import Optional
import numpy as np
import pandas as pd
from backend.app.config import settings
from backend.app.ml.predictor import get_predictor
from backend.app.schemas import DemandForecast, ForecastPoint

class ForecastService:
    def __init__(self):
        pass

    def get_forecast(self, product_id: str, horizon: int = 7) -> Optional[DemandForecast]:
        predictor = get_predictor()
        try:
            res = predictor.predict(product_id, horizon_days=horizon)
        except Exception as e:
            return None

        # Fetch recent 14 days of actual history to combine with forecast for UI charts
        history_df = predictor.get_sku_history(product_id, days=14)
        points = []

        if not history_df.empty:
            for _, row in history_df.iterrows():
                points.append(
                    ForecastPoint(
                        date=row["Date"].strftime("%Y-%m-%d"),
                        actual=float(row["quantity"]),
                        predicted=None,
                        lowerBound=None,
                        upperBound=None,
                    )
                )

        # Append forecast points
        for pt in res["points"]:
            points.append(
                ForecastPoint(
                    date=pt["date"],
                    actual=None,
                    predicted=pt["predicted"],
                    lowerBound=pt["lowerBound"],
                    upperBound=pt["upperBound"],
                )
            )

        return DemandForecast(
            productId=product_id,
            horizon=horizon,
            points=points,
            expectedTotalDemand=res["expectedTotalDemand"],
            averageDailyForecast=res["averageDailyForecast"],
            uncertainty=res["uncertainty"],
            generatedAt=res["generatedAt"],
            isDemo=False,
        )


forecast_service = ForecastService()
