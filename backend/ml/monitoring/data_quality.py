import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[3]))
from backend.ml.utils import get_logger, load_params, save_json

logger = get_logger("monitoring.data_quality")

def run_data_quality_audit(
    params_path: str = "params.yaml",
    daily_demand_path: Optional[str] = None,
    output_path: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Performs comprehensive data quality audit across continuous daily demand:
      1. Missing calendar dates in SKU time-series
      2. Duplicate date-SKU records
      3. Invalid quantities (negative numbers, nulls)
      4. Unexpected SKU changes (catalog drop-offs or new unmodeled items)
      5. Unusual volume spikes (outlier threshold: > 5x IQR)
    """
    params = load_params(params_path)
    mon_config = params.get("monitoring", {}).get("data_quality", {})
    daily_path = daily_demand_path or params.get("prepare", {}).get("processed_data_path", "backend/data/processed/daily_demand.parquet")
    out_file = output_path or mon_config.get("output_path", "backend/reports/metrics/monitoring_data_quality.json")
    spike_iqr_mult = float(mon_config.get("spike_iqr_multiplier", 5.0))

    logger.info(f"Auditing data quality on {daily_path}...")
    if not Path(daily_path).exists():
        raise FileNotFoundError(f"Daily demand parquet not found: {daily_path}")

    df = pd.read_parquet(daily_path)
    df["Date"] = pd.to_datetime(df["Date"])
    total_records = len(df)
    unique_skus = df["sku"].unique().tolist()

    # 1. Duplicate check
    duplicates = df.duplicated(subset=["sku", "Date"]).sum()

    # 2. Invalid quantities & nulls
    null_quantities = int(df["quantity"].isna().sum())
    negative_quantities = int((df["quantity"] < 0).sum())
    null_prices = int(df["unit_price"].isna().sum())
    negative_prices = int((df["unit_price"] <= 0).sum())

    # 3. Missing calendar dates
    min_date = df["Date"].min()
    max_date = df["Date"].max()
    expected_calendar_days = (max_date - min_date).days + 1
    expected_total_rows = expected_calendar_days * len(unique_skus)
    missing_dates_count = expected_total_rows - total_records

    # Check date coverage per SKU
    sku_date_counts = df.groupby("sku")["Date"].nunique()
    skus_with_missing_days = sku_date_counts[sku_date_counts < expected_calendar_days].to_dict()

    # 4. Unexpected SKU changes
    top_n_target = params.get("prepare", {}).get("top_n_skus", 50)
    sku_count_diff = len(unique_skus) - top_n_target

    # 5. Outlier & Unusual Volume Spikes (IQR method per SKU)
    spikes_detected = []
    for sku in unique_skus:
        sku_series = df[df["sku"] == sku]["quantity"]
        q25 = sku_series.quantile(0.25)
        q75 = sku_series.quantile(0.75)
        iqr = q75 - q25
        spike_cutoff = q75 + (spike_iqr_mult * max(iqr, 5.0))

        sku_spikes = df[(df["sku"] == sku) & (df["quantity"] > spike_cutoff)]
        if not sku_spikes.empty:
            for _, row in sku_spikes.iterrows():
                spikes_detected.append({
                    "sku": str(sku),
                    "date": str(row["Date"].date()),
                    "quantity": int(row["quantity"]),
                    "spike_threshold": round(float(spike_cutoff), 1),
                    "multiplier_over_median": round(float(row["quantity"] / max(sku_series.median(), 1)), 1),
                })

    # Severity evaluation
    critical_issues = []
    warning_issues = []

    if duplicates > 0:
        critical_issues.append(f"Detected {duplicates} duplicate SKU-Date entries.")
    if negative_quantities > 0:
        critical_issues.append(f"Detected {negative_quantities} negative quantity values in demand stream.")
    if null_quantities > 0:
        critical_issues.append(f"Detected {null_quantities} null quantity records.")
    
    if missing_dates_count > 0:
        warning_issues.append(f"Missing {missing_dates_count} expected calendar day records across SKUs.")
    if len(spikes_detected) > 0:
        warning_issues.append(f"Detected {len(spikes_detected)} unusual volume spikes (> {spike_iqr_mult}x IQR).")
    if sku_count_diff != 0:
        warning_issues.append(f"Modeled SKU count ({len(unique_skus)}) deviates from target ({top_n_target}).")

    status = "HEALTHY" if not critical_issues and not warning_issues else ("WARNING" if not critical_issues else "CRITICAL")

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "total_records_audited": total_records,
        "modeled_sku_count": len(unique_skus),
        "date_range": {
            "start": str(min_date.date()),
            "end": str(max_date.date()),
            "expected_calendar_days": expected_calendar_days,
        },
        "integrity_metrics": {
            "duplicate_records": int(duplicates),
            "missing_calendar_dates": int(missing_dates_count),
            "negative_quantities": int(negative_quantities),
            "null_quantities": int(null_quantities),
            "invalid_unit_prices": int(negative_prices + null_prices),
            "skus_with_gap_days_count": len(skus_with_missing_days),
        },
        "spike_detection": {
            "threshold_iqr_multiplier": spike_iqr_mult,
            "total_spikes_detected": len(spikes_detected),
            "sample_spikes": spikes_detected[:10],
        },
        "critical_issues_count": len(critical_issues),
        "critical_issues": critical_issues,
        "warning_issues": warning_issues,
    }

    Path(out_file).parent.mkdir(parents=True, exist_ok=True)
    save_json(report, out_file)
    logger.info(f"Data quality audit completed: status={status}, critical={len(critical_issues)}, warnings={len(warning_issues)}")
    return report

if __name__ == "__main__":
    rep = run_data_quality_audit()
    print("Data quality status:", rep["status"])
