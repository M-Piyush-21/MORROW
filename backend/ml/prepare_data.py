import sys
from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend.ml.utils import get_logger, load_params, save_json

logger = get_logger("prepare_data")

NON_PRODUCT_CODES = {
    "POST", "D", "M", "BANK CHARGES", "AMAZONFEE", "CRUK", "DOT", "S", "B", "gift_0001_"
}

def clean_stock_code(code) -> str:
    if pd.isna(code):
        return ""
    return str(code).strip().upper()

def run_prepare_data(params_path: str = "params.yaml"):
    params = load_params(params_path)
    prep_params = params.get("prepare", {})
    raw_path = prep_params.get("raw_data_path", "backend/data/raw/Online Retail.xlsx")
    interim_path = prep_params.get("interim_data_path", "backend/data/interim/cleaned_transactions.parquet")
    processed_path = prep_params.get("processed_data_path", "backend/data/processed/daily_demand.parquet")
    quality_path = prep_params.get("quality_report_path", "backend/reports/metrics/data_quality.json")
    top_n_skus = prep_params.get("top_n_skus", 50)
    min_history_days = prep_params.get("min_history_days", 90)

    logger.info(f"Loading raw dataset from {raw_path}...")
    if not Path(raw_path).exists():
        raise FileNotFoundError(f"Raw dataset file missing: {raw_path}")

    df_raw = pd.read_excel(raw_path)
    initial_rows = len(df_raw)
    logger.info(f"Raw dataset loaded. Total rows: {initial_rows:,}")

    # Validate schema
    required_cols = ["InvoiceNo", "StockCode", "Description", "Quantity", "InvoiceDate", "UnitPrice"]
    missing_cols = [c for c in required_cols if c not in df_raw.columns]
    if missing_cols:
        raise ValueError(f"Schema mismatch: missing columns {missing_cols}")

    # 1. Duplicates
    dup_count = int(df_raw.duplicated().sum())
    df = df_raw.drop_duplicates().copy()
    logger.info(f"Removed {dup_count:,} duplicate rows.")

    # 2. Cancellations and returns policy
    df["InvoiceStr"] = df["InvoiceNo"].astype(str).str.strip()
    is_cancelled = df["InvoiceStr"].str.startswith("C") | (df["Quantity"] <= 0)
    cancelled_count = int(is_cancelled.sum())
    logger.info(f"Identified {cancelled_count:,} cancellation/return records (policy: excluded from outbound positive sales demand).")

    df_valid = df[~is_cancelled].copy()

    # 3. Clean stock codes & descriptions
    df_valid["StockCodeClean"] = df_valid["StockCode"].apply(clean_stock_code)
    # Filter non-product codes
    is_non_product = df_valid["StockCodeClean"].isin(NON_PRODUCT_CODES) | (df_valid["StockCodeClean"] == "")
    df_valid = df_valid[~is_non_product].copy()

    # Filter positive price
    df_valid = df_valid[df_valid["UnitPrice"] > 0].copy()

    # Clean description mapping (most frequent description per SKU)
    sku_desc_map = (
        df_valid.dropna(subset=["Description"])
        .groupby("StockCodeClean")["Description"]
        .agg(lambda s: s.mode().iloc[0] if not s.empty else "General Merchandise")
        .to_dict()
    )

    df_valid["DescriptionClean"] = df_valid["StockCodeClean"].map(sku_desc_map).fillna("General Merchandise")
    df_valid["Date"] = pd.to_datetime(df_valid["InvoiceDate"]).dt.floor("D")
    df_valid["Revenue"] = df_valid["Quantity"] * df_valid["UnitPrice"]

    # Save cleaned transactions to interim
    Path(interim_path).parent.mkdir(parents=True, exist_ok=True)
    df_valid[[
        "InvoiceNo", "StockCodeClean", "DescriptionClean", "Quantity", "UnitPrice", "Revenue", "Date", "Country"
    ]].rename(columns={"StockCodeClean": "StockCode", "DescriptionClean": "Description"}).to_parquet(
        interim_path, index=False
    )
    logger.info(f"Saved interim cleaned transactions ({len(df_valid):,} rows) to {interim_path}")

    # 4. Daily aggregation per SKU
    daily = (
        df_valid.groupby(["StockCodeClean", "Date"])
        .agg(
            quantity=("Quantity", "sum"),
            revenue=("Revenue", "sum"),
            unit_price=("UnitPrice", "mean"),
            transaction_count=("InvoiceNo", "nunique"),
        )
        .reset_index()
    )
    daily["description"] = daily["StockCodeClean"].map(sku_desc_map)

    # 5. SKU selection: filter top N SKUs by total days active and volume
    sku_stats = (
        daily.groupby("StockCodeClean")
        .agg(
            active_days=("Date", "nunique"),
            total_quantity=("quantity", "sum"),
            total_revenue=("revenue", "sum"),
        )
        .reset_index()
    )

    eligible_skus = sku_stats[sku_stats["active_days"] >= min_history_days]
    top_skus = eligible_skus.sort_values(by="total_quantity", ascending=False).head(top_n_skus)["StockCodeClean"].tolist()
    logger.info(f"Selected {len(top_skus)} high-volume SKUs with >= {min_history_days} active days for modeling.")

    # 6. Build continuous daily series for selected SKUs (zero-fill non-sale days)
    min_date = daily["Date"].min()
    max_date = daily["Date"].max()
    all_dates = pd.date_range(min_date, max_date, freq="D", name="Date")

    continuous_dfs = []
    for sku in top_skus:
        sku_daily = daily[daily["StockCodeClean"] == sku].set_index("Date").reindex(all_dates).reset_index()
        sku_daily["sku"] = sku
        sku_daily["description"] = sku_desc_map.get(sku, "General Merchandise")
        sku_daily["quantity"] = sku_daily["quantity"].fillna(0).astype(int)
        sku_daily["revenue"] = sku_daily["revenue"].fillna(0.0)
        sku_daily["transaction_count"] = sku_daily["transaction_count"].fillna(0).astype(int)
        # Forward fill unit price, then backfill for zero-sale days
        sku_daily["unit_price"] = sku_daily["unit_price"].ffill().bfill().fillna(1.0)
        continuous_dfs.append(sku_daily)

    daily_processed = pd.concat(continuous_dfs, ignore_index=True)
    daily_processed = daily_processed.sort_values(by=["sku", "Date"]).reset_index(drop=True)

    Path(processed_path).parent.mkdir(parents=True, exist_ok=True)
    daily_processed.to_parquet(processed_path, index=False)
    logger.info(f"Saved processed continuous daily demand ({len(daily_processed):,} rows) to {processed_path}")

    # 7. Quality Report
    quality_summary = {
        "dataset_name": "UCI Online Retail",
        "raw_record_count": initial_rows,
        "duplicate_rows_removed": dup_count,
        "cancelled_or_negative_rows_excluded": cancelled_count,
        "cleaned_valid_transactions": len(df_valid),
        "unique_skus_in_raw": int(df_raw["StockCode"].nunique()),
        "selected_modeled_skus": len(top_skus),
        "modeling_skus_list": top_skus[:10],
        "date_range": {
            "start": str(min_date.date()),
            "end": str(max_date.date()),
            "total_calendar_days": len(all_dates),
        },
        "total_daily_observations": len(daily_processed),
        "zero_demand_day_ratio": float((daily_processed["quantity"] == 0).mean()),
        "total_units_sold_in_modeled_skus": int(daily_processed["quantity"].sum()),
    }
    save_json(quality_summary, quality_path)
    logger.info(f"Saved data quality report to {quality_path}")

    # 8. Generate Summary Figure
    fig_dir = Path("backend/reports/figures")
    fig_dir.mkdir(parents=True, exist_ok=True)
    plt.figure(figsize=(10, 4.5))
    top_sku_sample = daily_processed[daily_processed["sku"] == top_skus[0]]
    plt.plot(top_sku_sample["Date"], top_sku_sample["quantity"], color="#059669", lw=1.2, label=f"SKU {top_skus[0]} Daily Demand")
    plt.title(f"Daily Demand Pattern: {top_skus[0]} ({top_sku_sample['description'].iloc[0]})", fontsize=11, fontweight="bold")
    plt.xlabel("Date", fontsize=9)
    plt.ylabel("Units Sold", fontsize=9)
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend(frameon=True)
    plt.tight_layout()
    plt.savefig(fig_dir / "daily_sales_distribution.png", dpi=180)
    plt.close()
    logger.info(f"Saved summary figure to {fig_dir / 'daily_sales_distribution.png'}")

if __name__ == "__main__":
    run_prepare_data()
