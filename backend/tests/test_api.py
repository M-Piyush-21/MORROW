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

        # Verify Suggested Order Quantity = max(0, Target Stock Level - Current Stock)
        expected_order_qty = max(0, p["targetStockLevel"] - p["currentStock"])
        assert r["recommendedOrderQuantity"] == expected_order_qty

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
    assert any(c["status"] == "baseline" for c in comp)
    assert any(c["status"] == "production" for c in comp)
