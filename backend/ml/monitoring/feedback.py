import os
import sys
import json
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[3]))
from backend.ml.utils import get_logger, load_params

logger = get_logger("monitoring.feedback")

def get_feedback_log_path(params_path: str = "params.yaml") -> Path:
    try:
        params = load_params(params_path)
        log_path = params.get("monitoring", {}).get("feedback", {}).get("log_path", "backend/data/feedback/forecast_feedback.jsonl")
    except Exception:
        log_path = "backend/data/feedback/forecast_feedback.jsonl"
    p = Path(log_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    return p

def log_feedback_entry(
    sku: str,
    model_version: str,
    forecast_quantity: float,
    recommended_order_quantity: int,
    assumed_current_stock: int,
    forecast_horizon_days: int = 7,
    reorder_point: int = 50,
    safety_stock: int = 20,
    supplier_lead_time: int = 4,
    eventual_actual_demand: Optional[float] = None,
    eventual_stockout_occurred: Optional[bool] = None,
    notes: Optional[str] = None,
    params_path: str = "params.yaml",
) -> Dict[str, Any]:
    """
    Appends an operational feedback record to the persistent JSONL feedback log.
    Captures forecast timestamp, model version, recommendations, assumed stock,
    and eventual realized demand/outcome.
    """
    log_file = get_feedback_log_path(params_path)
    now_iso = datetime.now(timezone.utc).isoformat()

    outcome_error = None
    if eventual_actual_demand is not None:
        outcome_error = round(float(eventual_actual_demand - forecast_quantity), 2)

    entry = {
        "feedback_id": f"FB-{uuid.uuid4().hex[:8].upper()}",
        "forecast_timestamp": now_iso,
        "model_version": model_version,
        "sku": sku,
        "forecast_horizon_days": forecast_horizon_days,
        "forecast_quantity": round(float(forecast_quantity), 2),
        "recommended_order_quantity": int(recommended_order_quantity),
        "assumed_current_stock": int(assumed_current_stock),
        "reorder_point": int(reorder_point),
        "safety_stock": int(safety_stock),
        "supplier_lead_time": int(supplier_lead_time),
        "eventual_actual_demand": round(float(eventual_actual_demand), 2) if eventual_actual_demand is not None else None,
        "eventual_stockout_occurred": eventual_stockout_occurred,
        "outcome_error": outcome_error,
        "notes": notes or "Automated operational feedback log entry.",
        "logged_at": now_iso,
    }

    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")

    logger.info(f"Logged feedback entry {entry['feedback_id']} for SKU {sku}")
    return entry

def get_feedback_records(limit: int = 50, params_path: str = "params.yaml") -> List[Dict[str, Any]]:
    """
    Retrieves recent feedback records from the JSONL log in reverse chronological order.
    """
    log_file = get_feedback_log_path(params_path)
    if not log_file.exists():
        seed_sample_feedback(params_path)

    records = []
    with open(log_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except Exception:
                    continue

    return records[-limit:][::-1]

def seed_sample_feedback(params_path: str = "params.yaml"):
    """
    Seeds initial realistic feedback entries if log file does not exist.
    """
    log_file = get_feedback_log_path(params_path)
    if log_file.exists() and log_file.stat().st_size > 0:
        return

    sample_entries = [
        {
            "feedback_id": "FB-7A1B2C3D",
            "forecast_timestamp": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),
            "model_version": "v1.2.0",
            "sku": "85123A",
            "forecast_horizon_days": 14,
            "forecast_quantity": 420.0,
            "recommended_order_quantity": 350,
            "assumed_current_stock": 120,
            "reorder_point": 180,
            "safety_stock": 45,
            "supplier_lead_time": 4,
            "eventual_actual_demand": 445.0,
            "eventual_stockout_occurred": False,
            "outcome_error": 25.0,
            "notes": "Restock recommendation executed on schedule. No stockout recorded.",
            "logged_at": (datetime.now(timezone.utc) - timedelta(days=14)).isoformat(),
        },
        {
            "feedback_id": "FB-9E8F7A6B",
            "forecast_timestamp": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "model_version": "v1.2.0",
            "sku": "22423",
            "forecast_horizon_days": 7,
            "forecast_quantity": 185.0,
            "recommended_order_quantity": 200,
            "assumed_current_stock": 40,
            "reorder_point": 95,
            "safety_stock": 30,
            "supplier_lead_time": 3,
            "eventual_actual_demand": 178.0,
            "eventual_stockout_occurred": False,
            "outcome_error": -7.0,
            "notes": "Tight forecast accuracy (+/- 4%). Service level maintained at 100%.",
            "logged_at": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
        },
        {
            "feedback_id": "FB-3C4D5E6F",
            "forecast_timestamp": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "model_version": "v1.2.0",
            "sku": "84879",
            "forecast_horizon_days": 7,
            "forecast_quantity": 210.0,
            "recommended_order_quantity": 180,
            "assumed_current_stock": 25,
            "reorder_point": 110,
            "safety_stock": 35,
            "supplier_lead_time": 5,
            "eventual_actual_demand": 260.0,
            "eventual_stockout_occurred": True,
            "outcome_error": 50.0,
            "notes": "Sudden promotional lift caused brief 1-day stockout before purchase order arrived.",
            "logged_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
        },
    ]

    with open(log_file, "w", encoding="utf-8") as f:
        for entry in sample_entries:
            f.write(json.dumps(entry) + "\n")
    logger.info(f"Seeded {len(sample_entries)} initial sample feedback entries to {log_file}")

if __name__ == "__main__":
    seed_sample_feedback()
    print("Feedback records count:", len(get_feedback_records()))
