import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import json

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[3]))
from backend.ml.utils import get_logger, load_params, save_json

logger = get_logger("monitoring.alerts")

def generate_system_alerts(
    params_path: str = "params.yaml",
    data_quality_report_path: Optional[str] = None,
    drift_report_path: Optional[str] = None,
    performance_report_path: Optional[str] = None,
    output_path: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Synthesizes audit findings across data quality, feature drift, forecast performance,
    and service health into structured operational alerts.
    
    Each alert strictly contains:
      - alert_id
      - timestamp
      - category
      - severity (INFO, WARNING, CRITICAL)
      - what_changed
      - affected_entities (SKUs or model version)
      - recommended_action
    """
    params = load_params(params_path)
    mon_config = params.get("monitoring", {})
    dq_file = Path(data_quality_report_path or mon_config.get("data_quality", {}).get("output_path", "backend/reports/metrics/monitoring_data_quality.json"))
    drift_file = Path(drift_report_path or mon_config.get("drift", {}).get("output_path", "backend/reports/metrics/monitoring_drift.json"))
    perf_file = Path(performance_report_path or mon_config.get("performance", {}).get("output_path", "backend/reports/metrics/monitoring_performance.json"))
    out_file = output_path or mon_config.get("alerts", {}).get("output_path", "backend/reports/metrics/active_alerts.json")

    alerts: List[Dict[str, Any]] = []

    # 1. Evaluate Data Quality Audit
    if dq_file.exists():
        with open(dq_file, "r") as f:
            dq = json.load(f)
        
        for crit in dq.get("critical_issues", []):
            alerts.append({
                "alert_id": f"ALT-DQ-{len(alerts)+1:03d}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "category": "data_quality",
                "severity": "CRITICAL",
                "what_changed": f"Data integrity violation detected: {crit}",
                "affected_entities": ["daily_demand_stream"],
                "recommended_action": "Halt automated retraining pipeline; verify ETL ingestion logs and inspect ERP transaction feed.",
                "status": "ACTIVE",
            })

        spikes = dq.get("spike_detection", {}).get("sample_spikes", [])
        if len(spikes) > 0:
            spike_skus = list(set(s["sku"] for s in spikes[:5]))
            alerts.append({
                "alert_id": f"ALT-DQ-SPIKE-{len(alerts)+1:03d}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "category": "data_quality",
                "severity": "WARNING",
                "what_changed": f"Detected {len(spikes)} single-day transaction volume spikes exceeding 5x SKU Interquartile Range.",
                "affected_entities": spike_skus,
                "recommended_action": "Verify with commercial merchandising if bulk wholesale orders or clearance promotions occurred before updating baseline safety stocks.",
                "status": "ACTIVE",
            })

    # 2. Evaluate Feature Drift Audit (with Non-Automatic-Retraining Rule)
    if drift_file.exists():
        with open(drift_file, "r") as f:
            dr = json.load(f)

        drifted_features = dr.get("features_in_drift", [])
        warning_features = dr.get("features_in_warning", [])

        if drifted_features:
            alerts.append({
                "alert_id": f"ALT-DRIFT-HIGH-{len(alerts)+1:03d}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "category": "feature_drift",
                "severity": "WARNING",
                "what_changed": f"Significant distribution shift (PSI >= 0.25) observed in feature(s): {', '.join(drifted_features)}.",
                "affected_entities": [f"feature:{f}" for f in drifted_features] + ["model:v1.2.0"],
                "recommended_action": (
                    "INVESTIGATION TRIGGER ONLY — DO NOT automatically trigger retraining. "
                    "First, check whether shift coincides with macro retail seasonality (e.g. Q4 holiday shopping surge). "
                    "Second, validate whether realized forecast residuals degraded for these features. "
                    "Only retrain if downstream forecast accuracy deteriorates concurrently."
                ),
                "status": "INVESTIGATING",
            })
        elif warning_features:
            alerts.append({
                "alert_id": f"ALT-DRIFT-WARN-{len(alerts)+1:03d}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "category": "feature_drift",
                "severity": "INFO",
                "what_changed": f"Moderate distribution movement (0.10 <= PSI < 0.25) detected in feature(s): {', '.join(warning_features)}.",
                "affected_entities": [f"feature:{f}" for f in warning_features],
                "recommended_action": "Log distribution metrics to baseline tracking; continue standard monitoring without intervention.",
                "status": "ACTIVE",
            })

    # 3. Evaluate Realized Performance Audit
    if perf_file.exists():
        with open(perf_file, "r") as f:
            pf = json.load(f)

        top_challenging = pf.get("top_challenging_skus", [])
        if top_challenging:
            highest_err = top_challenging[0]
            if highest_err.get("wape", 0) > 1.10:
                alerts.append({
                    "alert_id": f"ALT-PERF-WAPE-{len(alerts)+1:03d}",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "category": "forecast_performance",
                    "severity": "WARNING",
                    "what_changed": f"Elevated realized error on SKU {highest_err['sku']} ({highest_err['description']}): WAPE reached {highest_err['wape_pct']}%.",
                    "affected_entities": [highest_err["sku"]],
                    "recommended_action": "Inspect whether supplier lead-time buffers or intermittent sales patterns caused stockouts; consider switching to Croston or intermittent safety stock rules.",
                    "status": "ACTIVE",
                })

    # Fallback default info alert if all green
    if not alerts:
        alerts.append({
            "alert_id": "ALT-SYS-OK-001",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "category": "service_health",
            "severity": "INFO",
            "what_changed": "All pipeline systems healthy; no critical data quality, drift, or performance breaches.",
            "affected_entities": ["model:v1.2.0"],
            "recommended_action": "No operational action required. Continue normal scheduled monitoring cycles.",
            "status": "RESOLVED",
        })

    Path(out_file).parent.mkdir(parents=True, exist_ok=True)
    save_json({"timestamp": datetime.now(timezone.utc).isoformat(), "total_alerts": len(alerts), "alerts": alerts}, out_file)
    logger.info(f"Synthesized {len(alerts)} operational alerts. Saved to {out_file}")
    return alerts

if __name__ == "__main__":
    alt_list = generate_system_alerts()
    print("Generated alerts count:", len(alt_list))
