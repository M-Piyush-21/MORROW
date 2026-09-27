import sys
from pathlib import Path
import pandas as pd
import numpy as np

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend.ml.utils import get_logger, load_params

logger = get_logger("build_features")

def engineer_features_for_df(df: pd.DataFrame, lag_days: list, rolling_windows: list) -> pd.DataFrame:
    """
    Generate time-series lag and rolling statistics per SKU.
    GUARANTEES NO TARGET LEAKAGE:
    - All lags are t-k (k >= 1)
    - All rolling calculations use quantity.shift(1) so day t is NEVER included in features for day t.
    """
    df = df.sort_values(by=["sku", "Date"]).copy()
    feature_dfs = []

    for sku, group in df.groupby("sku"):
        group = group.copy().sort_values("Date")
        
        # 1. Target column
        # quantity is target y at day t
        
        # 2. Lags
        for lag in lag_days:
            group[f"lag_{lag}"] = group["quantity"].shift(lag)

        # 3. Rolling stats (using shift(1) to avoid target leakage)
        shifted_qty = group["quantity"].shift(1)
        for w in rolling_windows:
            group[f"rolling_mean_{w}"] = shifted_qty.rolling(window=w, min_periods=max(1, w // 2)).mean()
            group[f"rolling_std_{w}"] = shifted_qty.rolling(window=w, min_periods=max(1, w // 2)).std().fillna(0.0)

        # 4. Calendar features
        group["day_of_week"] = group["Date"].dt.dayofweek
        group["day_of_month"] = group["Date"].dt.day
        group["month"] = group["Date"].dt.month
        group["is_weekend"] = group["day_of_week"].isin([5, 6]).astype(int)

        feature_dfs.append(group)

    result = pd.concat(feature_dfs, ignore_index=True)
    
    # Drop rows where largest lag is NaN (warm-up window)
    max_lag = max(lag_days)
    result = result.dropna(subset=[f"lag_{max_lag}"]).reset_index(drop=True)
    return result

def run_build_features(params_path: str = "params.yaml"):
    params = load_params(params_path)
    feat_params = params.get("features", {})
    input_path = feat_params.get("input_path", "backend/data/processed/daily_demand.parquet")
    output_path = feat_params.get("output_path", "backend/data/processed/features.parquet")
    lag_days = feat_params.get("lag_days", [1, 7, 14, 21, 28])
    rolling_windows = feat_params.get("rolling_windows", [7, 14, 28])

    logger.info(f"Loading daily processed data from {input_path}...")
    df = pd.read_parquet(input_path)
    df["Date"] = pd.to_datetime(df["Date"])
    
    logger.info(f"Engineering features with lags {lag_days} and rolling windows {rolling_windows}...")
    featured_df = engineer_features_for_df(df, lag_days, rolling_windows)
    
    logger.info(f"Feature dataset ready: {len(featured_df):,} rows, {len(featured_df.columns)} columns.")
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    featured_df.to_parquet(output_path, index=False)
    logger.info(f"Saved featured dataset to {output_path}")

if __name__ == "__main__":
    run_build_features()
