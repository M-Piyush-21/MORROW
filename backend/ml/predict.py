import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend.ml.train import FEATURE_COLUMNS
from backend.ml.utils import get_logger, load_json

logger = get_logger("predict")

class DemandPredictor:
    def __init__(
        self,
        model_path: str = "backend/models/random_forest_demand.joblib",
        metadata_path: str = "backend/models/model_metadata.json",
        data_path: str = "backend/data/processed/daily_demand.parquet",
    ):
        self.model_path = Path(model_path)
        self.metadata_path = Path(metadata_path)
        self.data_path = Path(data_path)
        self.model = None
        self.metadata = {}
        self.history_df = None
        self._load()

    def _load(self):
        if self.model_path.exists():
            self.model = joblib.load(self.model_path)
            logger.info(f"Loaded trained model from {self.model_path}")
        else:
            logger.warning(f"Model not found at {self.model_path}. Predictions will be unavailable or use fallback.")

        if self.metadata_path.exists():
            self.metadata = load_json(str(self.metadata_path))

        if self.data_path.exists():
            self.history_df = pd.read_parquet(self.data_path)
            self.history_df["Date"] = pd.to_datetime(self.history_df["Date"])
            logger.info(f"Loaded {len(self.history_df):,} daily history records from {self.data_path}")

    def get_available_skus(self) -> List[str]:
        if self.history_df is not None:
            return sorted(self.history_df["sku"].unique().tolist())
        return []

    def get_sku_history(self, sku: str, days: int = 90) -> pd.DataFrame:
        if self.history_df is None:
            return pd.DataFrame()
        sku_df = self.history_df[self.history_df["sku"] == sku].sort_values("Date")
        if days:
            sku_df = sku_df.tail(days)
        return sku_df

    def predict(self, sku: str, horizon_days: int = 7) -> Dict[str, Any]:
        if self.model is None or self.history_df is None:
            raise RuntimeError("Model or historical data not loaded.")

        sku_data = self.history_df[self.history_df["sku"] == sku].sort_values("Date").copy()
        if sku_data.empty:
            raise ValueError(f"SKU '{sku}' not found in processed historical catalog.")

        # Prepare recursive forecasting queue with historical quantities
        last_date = sku_data["Date"].max()
        unit_price = float(sku_data["unit_price"].iloc[-1])
        description = str(sku_data["description"].iloc[-1])

        # Get history series as list of (date, quantity)
        history_series = list(zip(sku_data["Date"], sku_data["quantity"].astype(float)))
        
        forecast_points = []
        current_date = last_date

        for step in range(1, horizon_days + 1):
            next_date = current_date + timedelta(days=1)
            quantities = [q for _, q in history_series]

            # Construct inference features using past values only
            def get_lag(k):
                return quantities[-k] if len(quantities) >= k else quantities[0]

            def get_rolling_mean(w):
                window = quantities[-w:] if len(quantities) >= w else quantities
                return float(np.mean(window))

            def get_rolling_std(w):
                window = quantities[-w:] if len(quantities) >= w else quantities
                return float(np.std(window)) if len(window) > 1 else 0.0

            row = {
                "lag_1": get_lag(1),
                "lag_7": get_lag(7),
                "lag_14": get_lag(14),
                "lag_21": get_lag(21),
                "lag_28": get_lag(28),
                "rolling_mean_7": get_rolling_mean(7),
                "rolling_std_7": get_rolling_std(7),
                "rolling_mean_14": get_rolling_mean(14),
                "rolling_std_14": get_rolling_std(14),
                "rolling_mean_28": get_rolling_mean(28),
                "rolling_std_28": get_rolling_std(28),
                "day_of_week": next_date.dayofweek,
                "day_of_month": next_date.day,
                "month": next_date.month,
                "is_weekend": int(next_date.dayofweek in [5, 6]),
                "unit_price": unit_price,
            }

            feature_vector = pd.DataFrame([row])[FEATURE_COLUMNS]
            pred = float(self.model.predict(feature_vector)[0])
            pred_clamped = max(0.0, round(pred, 1))

            # Approximate confidence intervals (+/- 1.5 * rolling_std_7)
            std_est = max(2.0, row["rolling_std_7"])
            lower = max(0.0, round(pred_clamped - 1.2 * std_est, 1))
            upper = round(pred_clamped + 1.2 * std_est, 1)

            forecast_points.append({
                "date": next_date.strftime("%Y-%m-%d"),
                "predicted": pred_clamped,
                "lowerBound": lower,
                "upperBound": upper,
            })

            # Append to recursive history for subsequent steps
            history_series.append((next_date, pred_clamped))
            current_date = next_date

        total_demand = sum(p["predicted"] for p in forecast_points)
        avg_daily = total_demand / horizon_days if horizon_days > 0 else 0.0
        uncertainty = float(np.std([p["predicted"] for p in forecast_points]))

        return {
            "productId": sku,
            "sku": sku,
            "description": description,
            "horizon": horizon_days,
            "points": forecast_points,
            "expectedTotalDemand": round(total_demand, 1),
            "averageDailyForecast": round(avg_daily, 1),
            "uncertainty": round(uncertainty, 2),
            "modelName": self.metadata.get("model_name", "RandomForestRegressor"),
            "modelVersion": self.metadata.get("model_version", "1.0.0"),
            "generatedAt": datetime.now().isoformat(),
            "isDemo": False,
        }

if __name__ == "__main__":
    predictor = DemandPredictor()
    skus = predictor.get_available_skus()
    if skus:
        sample_sku = skus[0]
        res = predictor.predict(sample_sku, horizon_days=7)
        print(f"Sample Forecast for {sample_sku} ({res['description']}):")
        print(f"Expected 7-day demand: {res['expectedTotalDemand']} units")
        for pt in res["points"]:
            print(f"  {pt['date']}: {pt['predicted']} units (range: {pt['lowerBound']} - {pt['upperBound']})")
