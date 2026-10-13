import pytest
from backend.ml.inventory_policy import (
    calculate_replenishment_policy,
    ReplenishmentPolicyInputs,
    run_policy_scenarios,
    evaluate_policy_tradeoff,
)


def test_decoupled_replenishment_policy_calculation():
    """Verifies calculation inputs and exact mathematical breakdown are visible and accurate."""
    inputs = ReplenishmentPolicyInputs(
        sku="TEST-SKU-001",
        forecast_daily_demand=10.0,
        lead_time_days=5,
        current_stock=20,
        in_transit_stock=10,
        safety_stock_override=25,
        target_stock_level=120,
        moq=15,
        pack_size=5,
        max_capacity=200,
    )
    decision = calculate_replenishment_policy(inputs)

    # Inventory Position = 20 + 10 = 30
    assert decision.inventory_position == 30
    # Lead time demand = 10 * 5 = 50
    assert decision.forecast_demand_during_lead_time == 50.0
    # ROP = 50 + 25 = 75
    assert decision.reorder_point == 75
    # Since IP (30) <= ROP (75), order must be triggered
    assert decision.should_reorder is True

    # Base unconstrained order = Target (120) - IP (30) = 90
    assert decision.unconstrained_order_quantity == 90
    # Since 90 >= MOQ (15) and 90 % pack_size(5) == 0, recommended = 90
    assert decision.recommended_order_quantity == 90

    # Verify breakdown transparency
    bd = decision.breakdown
    assert bd is not None
    assert bd.forecast_daily_demand == 10.0
    assert bd.lead_time_days == 5
    assert bd.lead_time_demand == 50.0
    assert bd.safety_stock == 25
    assert bd.reorder_point == 75
    assert bd.inventory_position == 30
    assert bd.target_stock_level == 120
    assert bd.recommended_order_quantity == 90
    assert decision.is_synthetic_inventory is True


def test_replenishment_moq_and_pack_size_rounding():
    """Verifies that MOQ bumps and pack size / case roundings are applied accurately."""
    inputs = ReplenishmentPolicyInputs(
        sku="TEST-SKU-002",
        forecast_daily_demand=5.0,
        lead_time_days=3,
        current_stock=12,
        in_transit_stock=0,
        safety_stock_override=10,
        target_stock_level=28,  # Base unconstrained = 28 - 12 = 16
        moq=25,                # MOQ forces order to 25
        pack_size=10,          # Pack size rounds 25 up to 30
        max_capacity=500,
    )
    decision = calculate_replenishment_policy(inputs)
    assert decision.should_reorder is True
    assert decision.unconstrained_order_quantity == 16
    assert decision.constraints_applied["moq_triggered"] is True
    assert decision.constraints_applied["batch_rounding_applied"] is True
    assert decision.recommended_order_quantity == 30


def test_replenishment_max_capacity_ceiling():
    """Verifies warehouse maximum capacity limits over-ordering."""
    inputs = ReplenishmentPolicyInputs(
        sku="TEST-SKU-003",
        forecast_daily_demand=10.0,
        lead_time_days=4,
        current_stock=40,
        in_transit_stock=0,
        safety_stock_override=20,
        target_stock_level=150, # Base unconstrained = 150 - 40 = 110
        moq=10,
        pack_size=1,
        max_capacity=100,       # Capped: max allowed = 100 - 40 = 60
    )
    decision = calculate_replenishment_policy(inputs)
    assert decision.constraints_applied["max_capacity_capped"] is True
    assert decision.recommended_order_quantity == 60


def test_supplier_order_days_review_constraint():
    """Verifies that non-order review days flag order scheduling delay."""
    # Assume today is Friday (weekday 4), and supplier only takes orders on Mondays (weekday 0)
    inputs = ReplenishmentPolicyInputs(
        sku="TEST-SKU-004",
        forecast_daily_demand=8.0,
        lead_time_days=3,
        current_stock=10,
        safety_stock_override=15,
        target_stock_level=60,
        supplier_order_days=[0],  # Monday only
        current_day_of_week=4,   # Friday
    )
    decision = calculate_replenishment_policy(inputs)
    assert decision.constraints_applied["order_day_delayed"] is True
    # Days until Monday from Friday: 3 days
    assert decision.constraints_applied["days_until_next_order"] == 3


def test_run_policy_scenarios_stress_matrix():
    """Verifies scenario analysis across lead-time delays, demand surges, and safety buffers."""
    inputs = ReplenishmentPolicyInputs(
        sku="TEST-SKU-005",
        forecast_daily_demand=12.0,
        lead_time_days=4,
        current_stock=50,
        service_level=0.95,
        moq=10,
        pack_size=5,
    )
    scenarios = run_policy_scenarios(inputs)
    assert len(scenarios) >= 8

    # Baseline exists
    baseline = next(s for s in scenarios if s["scenario_id"] == "baseline")
    assert baseline["lead_time_days"] == 4
    assert baseline["demand_multiplier"] == 1.0

    # Delay +5d exists
    delay_5d = next(s for s in scenarios if s["scenario_id"] == "delay_5d")
    assert delay_5d["lead_time_days"] == 9
    assert delay_5d["reorder_point"] > baseline["reorder_point"]

    # Surge +50% exists
    surge_50 = next(s for s in scenarios if s["scenario_id"] == "surge_50pct")
    assert surge_50["demand_multiplier"] == 1.5
    assert surge_50["reorder_point"] > baseline["reorder_point"]


def test_conservative_vs_lean_tradeoff_comparison():
    """Verifies financial and operational trade-offs between Conservative, Balanced, and Lean policies."""
    inputs = ReplenishmentPolicyInputs(
        sku="TEST-SKU-006",
        forecast_daily_demand=15.0,
        lead_time_days=4,
        current_stock=40,
        moq=10,
        pack_size=5,
    )
    tradeoff = evaluate_policy_tradeoff(inputs, unit_cost=100.0, annual_holding_rate=0.20)
    policies = tradeoff["policies"]

    assert "conservative" in policies
    assert "balanced" in policies
    assert "lean" in policies

    cons = policies["conservative"]
    bal = policies["balanced"]
    lean = policies["lean"]

    # Conservative holds more buffer and inventory value
    assert cons["safety_stock_units"] >= bal["safety_stock_units"] >= lean["safety_stock_units"]
    assert cons["average_inventory_value"] > bal["average_inventory_value"] > lean["average_inventory_value"]
    # Lean incurs lower annual holding cost
    assert lean["estimated_annual_holding_cost"] < bal["estimated_annual_holding_cost"] < cons["estimated_annual_holding_cost"]
    # Synthetic inventory flag verified
    assert tradeoff["is_synthetic_inventory"] is True
