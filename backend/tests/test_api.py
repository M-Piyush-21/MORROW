import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["modelLoaded"] is True
    assert data["datasetLoaded"] is True

def test_dashboard_summary_endpoint():
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "totalProducts" in data
    assert "totalInventoryValue" in data
    assert len(data["salesVsForecast"]) > 0
    assert len(data["topSellingProducts"]) > 0

def test_products_endpoint():
    response = client.get("/api/products")
    assert response.status_code == 200
    products = response.json()
    assert isinstance(products, list)
    assert len(products) > 0
    
    first = products[0]
    assert "id" in first
    assert "sku" in first
    assert "price" in first
    assert "averageDailyDemand" in first

def test_product_detail_and_not_found():
    # Existing product
    res = client.get("/api/products")
    first_id = res.json()[0]["id"]
    
    res_detail = client.get(f"/api/products/{first_id}")
    assert res_detail.status_code == 200
    assert res_detail.json()["id"] == first_id

    # Unknown product
    res_404 = client.get("/api/products/NON_EXISTENT_SKU_9999")
    assert res_404.status_code == 404

def test_forecast_endpoint_valid_and_invalid():
    res = client.get("/api/products")
    first_id = res.json()[0]["id"]

    # Valid 7-day forecast
    f7 = client.get(f"/api/forecast/{first_id}?horizon=7")
    assert f7.status_code == 200
    f7_data = f7.json()
    assert f7_data["horizon"] == 7
    assert len([p for p in f7_data["points"] if p["predicted"] is not None]) == 7
    assert f7_data["expectedTotalDemand"] >= 0

    # Invalid horizon > 30 returns 422
    f_invalid = client.get(f"/api/forecast/{first_id}?horizon=60")
    assert f_invalid.status_code == 422

    # Unknown product returns 404
    f_404 = client.get("/api/forecast/UNKNOWN_PRODUCT_XYZ?horizon=7")
    assert f_404.status_code == 404

def test_restock_recommendations_formula_integrity():
    response = client.get("/api/recommendations/restock")
    assert response.status_code == 200
    recs = response.json()
    assert len(recs) > 0

    for r in recs[:5]:
        p = r["product"]
        lead_time = r["supplierLeadTime"]
        safety_stock = r["safetyStock"]
        
        # Verify Reorder Point = Demand During Lead Time + Safety Stock
        demand_during_lead_time = int(round(p["averageDailyDemand"] * lead_time))
        expected_reorder_point = demand_during_lead_time + safety_stock
        assert r["reorderPoint"] == expected_reorder_point

        # Verify Unconstrained Order Quantity = max(0, Target Stock Level - Current Stock)
        expected_unconstrained = max(0, p["targetStockLevel"] - p["currentStock"])
        assert r["unconstrainedOrderQuantity"] == expected_unconstrained

        # Verify Recommended Order Quantity satisfies MOQ and batch size constraints
        if r["recommendedOrderQuantity"] > 0:
            assert r["recommendedOrderQuantity"] >= r["constraints"]["moq"]
            assert r["recommendedOrderQuantity"] % r["constraints"]["batchSize"] == 0

def test_model_metrics_and_comparison():
    res_metrics = client.get("/api/model/metrics")
    assert res_metrics.status_code == 200
    metrics = res_metrics.json()
    assert "mae" in metrics
    assert "rmse" in metrics
    assert metrics["mae"] > 0

    res_comp = client.get("/api/model/comparison")
    assert res_comp.status_code == 200
    comp = res_comp.json()
    assert len(comp) >= 2


def test_inventory_backtest_endpoint():
    res = client.get("/api/inventory/backtest")
    assert res.status_code == 200
    data = res.json()
    assert "problemStatement" in data
    assert "policies" in data
    assert "morrow" in data["policies"]
    assert "fixed_baseline" in data["policies"]
    assert "seasonal_baseline" in data["policies"]
    assert "comparison" in data
    assert "scenarioInputs" in data
    assert data["scenarioInputs"]["isScenarioAssumption"] is True
    assert "simulatedStockoutDays" in data["policies"]["morrow"]
    assert "unitsShort" in data["policies"]["morrow"]
    assert "averageInventoryValue" in data["policies"]["morrow"]
    assert "serviceLevel" in data["policies"]["morrow"]


def test_inventory_simulate_endpoint():
    payload = {
        "holdingCostAnnualRate": 0.25,
        "orderingCostPerOrder": 50.0,
        "stockoutPenaltyPerUnit": 8.0,
        "leadTimeDays": 5,
        "moq": 20,
        "batchSize": 10,
        "skusLimit": 5,
    }
    res = client.post("/api/inventory/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["scenarioInputs"]["holdingCostAnnualRate"] == 0.25
    assert data["scenarioInputs"]["orderingCostPerOrder"] == 50.0
    assert "policies" in data
    assert "morrow" in data["policies"]


def test_model_evaluation_details_endpoint():
    res = client.get("/api/model/evaluation-details")
    assert res.status_code == 200
    data = res.json()
    assert "problemStatement" in data
    assert "runMetadata" in data
    assert "evaluation_date_range" in data["runMetadata"]
    assert "predictionIntervalCalibration" in data
    assert "empirical_coverage_pct" in data["predictionIntervalCalibration"]
    assert "volumeSegments" in data
    assert "intermittentVsRegular" in data
    assert "horizonEvaluation" in data
    assert "7_days" in data["horizonEvaluation"]
    assert "14_days" in data["horizonEvaluation"]
    assert "metricExplanations" in data


def test_monitoring_data_quality_endpoint():
    res = client.get("/api/monitoring/data-quality")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "totalRecordsAudited" in data
    assert data["totalRecordsAudited"] > 0
    assert "integrityMetrics" in data
    assert "spikeDetection" in data


def test_monitoring_drift_endpoint():
    res = client.get("/api/monitoring/drift")
    assert res.status_code == 200
    data = res.json()
    assert "overallStatus" in data
    assert "averageFeaturePsi" in data
    assert "thresholds" in data
    assert "featureMetrics" in data
    assert "operationalGuidance" in data
    assert "retraining_philosophy" in data["operationalGuidance"]


def test_monitoring_performance_endpoint():
    res = client.get("/api/monitoring/performance")
    assert res.status_code == 200
    data = res.json()
    assert "overallTestWape" in data
    assert "rollingWindowPerformance" in data
    assert len(data["rollingWindowPerformance"]) >= 1


def test_monitoring_service_endpoint():
    res = client.get("/api/monitoring/service")
    assert res.status_code == 200
    data = res.json()
    assert "serviceStatus" in data
    assert "latencyMs" in data
    assert "p95" in data["latencyMs"]
    assert "modelHealth" in data


def test_monitoring_alerts_endpoint():
    res = client.get("/api/monitoring/alerts")
    assert res.status_code == 200
    data = res.json()
    assert "totalAlerts" in data
    assert "alerts" in data
    assert len(data["alerts"]) > 0
    first_alert = data["alerts"][0]
    assert "alertId" in first_alert
    assert "severity" in first_alert
    assert "whatChanged" in first_alert
    assert "recommendedAction" in first_alert


def test_monitoring_feedback_lifecycle():
    # Submit feedback
    payload = {
        "sku": "85123A",
        "model_version": "v1.2.0",
        "forecast_quantity": 450.0,
        "recommended_order_quantity": 400,
        "assumed_current_stock": 100,
        "forecast_horizon_days": 7,
        "eventual_actual_demand": 465.0,
        "eventual_stockout_occurred": False,
        "notes": "Pytest lifecycle validation entry",
    }
    res_post = client.post("/api/monitoring/feedback", json=payload)
    assert res_post.status_code == 201
    post_data = res_post.json()
    assert "feedbackId" in post_data
    assert post_data["sku"] == "85123A"
    assert post_data["outcomeError"] == 15.0

    # Retrieve feedback log
    res_get = client.get("/api/monitoring/feedback?limit=10")
    assert res_get.status_code == 200
    feedbacks = res_get.json()
    assert len(feedbacks) >= 1
    assert any(f["feedbackId"] == post_data["feedbackId"] for f in feedbacks)


def test_model_promotion_and_rollback_endpoints():
    # 1. Check promotion status
    res_status = client.get("/api/model/promotion-status")
    assert res_status.status_code == 200
    promo_data = res_status.json()
    assert "decision" in promo_data
    assert "gatesEvaluated" in promo_data
    assert len(promo_data["gatesEvaluated"]) == 8

    # 2. Test Rollback endpoint
    res_rb = client.post("/api/model/rollback?reason=Pytest+controlled+rollback+test")
    assert res_rb.status_code == 200
    rb_data = res_rb.json()
    assert rb_data["status"] == "SUCCESS"
    assert rb_data["action"] == "ROLLBACK_COMPLETED"

    # 3. Test Promote endpoint (restores active approved status)
    res_promote = client.post("/api/model/promote")
    assert res_promote.status_code == 200
    promoted = res_promote.json()
    assert promoted["decision"] in ["APPROVED", "APPROVED_OVERRIDE"]


def test_replenishment_evaluate_api():
    payload = {
        "sku": "22423",
        "forecastDailyDemand": 15.0,
        "leadTimeDays": 4,
        "currentStock": 30,
        "inTransitStock": 0,
        "serviceLevel": 0.95,
        "moq": 20,
        "packSize": 5,
        "maxCapacity": 500,
    }
    res = client.post("/api/restock/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["sku"] == "22423"
    assert "reorderPoint" in data
    assert "recommendedOrderQuantity" in data
    assert "breakdown" in data
    assert data["isSyntheticInventory"] is True
    assert "Synthetic Scenario Input" in data["inventorySource"]


def test_replenishment_scenarios_and_tradeoff_api():
    sku = "22423"
    # 1. Scenarios endpoint
    res_scen = client.get(f"/api/restock/scenarios/{sku}")
    assert res_scen.status_code == 200
    scen_data = res_scen.json()
    assert scen_data["sku"] == sku
    assert len(scen_data["scenarios"]) >= 6
    assert any("delay" in s["scenarioId"] for s in scen_data["scenarios"])
    assert any("surge" in s["scenarioId"] for s in scen_data["scenarios"])

    # 2. Policy tradeoff endpoint
    res_trade = client.get(f"/api/restock/policy-tradeoff/{sku}")
    assert res_trade.status_code == 200
    trade_data = res_trade.json()
    assert "policies" in trade_data
    assert "conservative" in trade_data["policies"]
    assert "balanced" in trade_data["policies"]
    assert "lean" in trade_data["policies"]
    assert "tradeoffSummary" in trade_data


def test_model_info_endpoint():
    res = client.get("/api/model/info")
    assert res.status_code == 200
    data = res.json()
    assert "modelVersion" in data
    assert "lastSuccessfulTrainingTime" in data
    assert "evaluationSummary" in data
    assert "wape" in data["evaluationSummary"]
    assert "dataFreshness" in data
    assert data["dataFreshness"]["dataset"] == "UCI Online Retail Cleaned"
    assert data["isSyntheticInventoryDemonstration"] is True


def test_unknown_sku_returns_structured_404():
    unknown_sku = "NON_EXISTENT_SKU_9999"
    # In /api/forecast/{product_id}
    res_fc = client.get(f"/api/forecast/{unknown_sku}")
    assert res_fc.status_code == 404
    fc_err = res_fc.json()["detail"]
    assert fc_err["error"] == "SKU_NOT_FOUND"
    assert unknown_sku in fc_err["message"]

    # In /api/products/{product_id}
    res_prod = client.get(f"/api/products/{unknown_sku}")
    assert res_prod.status_code == 404
    prod_err = res_prod.json()["detail"]
    assert prod_err["error"] == "SKU_NOT_FOUND"

    # In /api/restock/scenarios/{sku}
    res_scen = client.get(f"/api/restock/scenarios/{unknown_sku}")
    assert res_scen.status_code == 404
    scen_err = res_scen.json()["detail"]
    assert scen_err["error"] == "SKU_NOT_FOUND"


def test_invalid_forecast_horizon_returns_structured_422():
    res_neg = client.get("/api/forecast/prod-1?horizon=-3")
    assert res_neg.status_code == 422
    err_neg = res_neg.json()["detail"]
    assert err_neg["error"] == "INVALID_HORIZON"

    res_large = client.get("/api/forecast/prod-1?horizon=120")
    assert res_large.status_code == 422
    err_large = res_large.json()["detail"]
    assert err_large["error"] == "INVALID_HORIZON"



