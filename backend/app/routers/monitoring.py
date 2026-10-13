from fastapi import APIRouter, Query, status
from typing import List
import json

from backend.app.schemas import (
    DataQualityAuditResponse,
    FeatureDriftResponse,
    PerformanceMonitoringResponse,
    ServiceMonitoringResponse,
    AlertsListResponse,
    FeedbackLogEntry,
    FeedbackSubmissionRequest,
)
from backend.app.config import settings

router = APIRouter(prefix="/monitoring", tags=["MLOps Monitoring & Feedback"])

@router.get("/data-quality", response_model=DataQualityAuditResponse)
def get_data_quality_audit():
    """Returns data quality integrity audit (missing dates, duplicates, invalid values, spikes)."""
    dq_file = settings.MONITORING_DATA_QUALITY_PATH

    if dq_file.exists():
        try:
            with open(dq_file, "r") as f:
                return json.load(f)
        except Exception:
            pass
    from backend.ml.monitoring.data_quality import run_data_quality_audit
    return run_data_quality_audit()

@router.get("/drift", response_model=FeatureDriftResponse)
def get_feature_drift():
    """Returns input feature distribution drift audit using Population Stability Index (PSI)."""
    drift_file = settings.MONITORING_DRIFT_PATH
    if drift_file.exists():
        try:
            with open(drift_file, "r") as f:
                return json.load(f)
        except Exception:
            pass
    from backend.ml.monitoring.drift import run_drift_monitoring
    return run_drift_monitoring()

@router.get("/performance", response_model=PerformanceMonitoringResponse)
def get_performance_monitoring():
    """Returns realized forecast accuracy against observed actuals across rolling windows and SKUs."""
    perf_file = settings.MONITORING_PERFORMANCE_PATH
    if perf_file.exists():
        try:
            with open(perf_file, "r") as f:
                return json.load(f)
        except Exception:
            pass
    from backend.ml.monitoring.performance import run_performance_monitoring
    return run_performance_monitoring()

@router.get("/service", response_model=ServiceMonitoringResponse)
def get_service_health_and_latency():
    """Returns API latency percentiles (p50, p95, p99), error rates, request volume, and model health."""
    from backend.ml.monitoring.service import get_service_metrics
    return get_service_metrics()

@router.get("/alerts", response_model=AlertsListResponse)
def get_active_alerts():
    """Returns synthesized operational alerts with what changed, severity, affected SKUs, and actions."""
    alerts_file = settings.ACTIVE_ALERTS_PATH

    if alerts_file.exists():
        try:
            with open(alerts_file, "r") as f:
                return json.load(f)
        except Exception:
            pass
    from backend.ml.monitoring.alerts import generate_system_alerts
    alerts_list = generate_system_alerts()
    return {"timestamp": "2026-10-13T00:00:00Z", "total_alerts": len(alerts_list), "alerts": alerts_list}

@router.get("/feedback", response_model=List[FeedbackLogEntry])
def get_forecast_feedback_log(limit: int = Query(50, ge=1, le=200)):
    """Retrieves chronological operational feedback log records."""
    from backend.ml.monitoring.feedback import get_feedback_records
    return get_feedback_records(limit=limit)

@router.post("/feedback", response_model=FeedbackLogEntry, status_code=status.HTTP_201_CREATED)
def submit_forecast_feedback(req: FeedbackSubmissionRequest):
    """Submits and appends a realized operational feedback entry into the feedback loop log."""
    from backend.ml.monitoring.feedback import log_feedback_entry
    entry = log_feedback_entry(
        sku=req.sku,
        model_version=req.modelVersion,
        forecast_quantity=req.forecastQuantity,
        recommended_order_quantity=req.recommendedOrderQuantity,
        assumed_current_stock=req.assumedCurrentStock,
        forecast_horizon_days=req.forecastHorizonDays,
        reorder_point=req.reorderPoint,
        safety_stock=req.safetyStock,
        supplier_lead_time=req.supplierLeadTime,
        eventual_actual_demand=req.eventualActualDemand,
        eventual_stockout_occurred=req.eventualStockoutOccurred,
        notes=req.notes,
    )
    return entry
