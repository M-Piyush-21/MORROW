"""Feature names shared by training and serving.

Kept in a tiny module so the Vercel function can serve forecasts without
importing the training stack (scikit-learn, MLflow).
"""

FEATURE_COLUMNS = [
    "lag_1", "lag_7", "lag_14", "lag_21", "lag_28",
    "rolling_mean_7", "rolling_std_7",
    "rolling_mean_14", "rolling_std_14",
    "rolling_mean_28", "rolling_std_28",
    "day_of_week", "day_of_month", "month", "is_weekend",
    "unit_price",
]
