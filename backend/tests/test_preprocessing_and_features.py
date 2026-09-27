import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from backend.ml.build_features import engineer_features_for_df
from backend.ml.prepare_data import clean_stock_code

def test_clean_stock_code():
    assert clean_stock_code(" 85123A ") == "85123A"
    assert clean_stock_code(22197) == "22197"
    assert clean_stock_code(None) == ""

def test_feature_engineering_no_target_leakage():
    # Construct a synthetic 40-day time series
    dates = pd.date_range("2023-01-01", periods=40, freq="D")
    quantities = [i * 2 + 5 for i in range(40)]
    df = pd.DataFrame({
        "sku": ["SKU_TEST"] * 40,
        "Date": dates,
        "quantity": quantities,
        "unit_price": [10.0] * 40,
    })

    featured = engineer_features_for_df(df, lag_days=[1, 7], rolling_windows=[7])

    assert not featured.empty
    for i, row in featured.iterrows():
        current_date = row["Date"]
        # lag_1 MUST equal the quantity on previous day
        prev_day_qty = df[df["Date"] == current_date - timedelta(days=1)]["quantity"].values[0]
        assert row["lag_1"] == prev_day_qty

        # lag_7 MUST equal the quantity 7 days ago
        seven_days_ago_qty = df[df["Date"] == current_date - timedelta(days=7)]["quantity"].values[0]
        assert row["lag_7"] == seven_days_ago_qty

        # rolling_mean_7 MUST be calculated strictly using past 7 days (t-1 down to t-7)
        past_7_quantities = df[
            (df["Date"] < current_date) & (df["Date"] >= current_date - timedelta(days=7))
        ]["quantity"].values
        expected_rolling = np.mean(past_7_quantities)
        assert abs(row["rolling_mean_7"] - expected_rolling) < 1e-4

        # Crucial check: verify that today's actual quantity does NOT affect rolling_mean_7
        assert row["rolling_mean_7"] != row["quantity"]

def test_chronological_split_integrity():
    # Verify train < val < test dates in configuration
    from backend.ml.utils import load_params
    params = load_params("params.yaml")
    train_date = pd.to_datetime(params["train"]["train_split_date"])
    val_date = pd.to_datetime(params["train"]["val_split_date"])
    test_date = pd.to_datetime(params["evaluate"]["test_split_date"])

    assert train_date < val_date
    assert val_date <= test_date
