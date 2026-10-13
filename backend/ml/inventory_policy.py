"""
MORROW Decoupled Inventory Replenishment Policy & Constraint Engine
===================================================================
Separates forecast demand generation from the inventory replenishment policy so
both can be configured, tested, and audited independently.

Supports practical physical constraints:
- Minimum Order Quantity (MOQ)
- Pack size / case rounding (discrete pack multiples)
- Supplier order days / review calendar cycles
- Warehouse storage capacity ceilings

Provides scenario analysis (lead-time delays, demand surges, safety stock alternatives)
and comparative trade-offs between Conservative, Balanced, and Lean inventory strategies.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, List, Optional
import math


# Standard normal z-table approximation for service level percentiles
SERVICE_LEVEL_Z_TABLE = {
    0.80: 0.84,
    0.85: 1.04,
    0.90: 1.28,
    0.95: 1.645,
    0.975: 1.96,
    0.98: 2.05,
    0.99: 2.33,
    0.999: 3.09,
}

def get_z_score(service_level: float) -> float:
    """Returns approximate z-score for normal distribution service levels."""
    if service_level in SERVICE_LEVEL_Z_TABLE:
        return SERVICE_LEVEL_Z_TABLE[service_level]
    # Find closest entry or interpolate
    levels = sorted(SERVICE_LEVEL_Z_TABLE.keys())
    if service_level <= levels[0]:
        return SERVICE_LEVEL_Z_TABLE[levels[0]]
    if service_level >= levels[-1]:
        return SERVICE_LEVEL_Z_TABLE[levels[-1]]
    for i in range(len(levels) - 1):
        if levels[i] <= service_level <= levels[i + 1]:
            t = (service_level - levels[i]) / (levels[i + 1] - levels[i])
            return SERVICE_LEVEL_Z_TABLE[levels[i]] + t * (SERVICE_LEVEL_Z_TABLE[levels[i + 1]] - SERVICE_LEVEL_Z_TABLE[levels[i]])
    return 1.645


@dataclass
class ReplenishmentPolicyInputs:
    """
    Decoupled inputs required for evaluating the replenishment decision.
    These can be supplied by ML models, historical averages, or test scenario harnesses.
    """
    sku: str
    forecast_daily_demand: float
    lead_time_days: int
    current_stock: int
    in_transit_stock: int = 0
    demand_std_dev: Optional[float] = None
    lead_time_std_dev: float = 0.0
    service_level: float = 0.95
    safety_stock_override: Optional[int] = None
    target_stock_level: Optional[int] = None
    target_days_of_supply: Optional[int] = None
    moq: int = 1
    pack_size: int = 1
    supplier_order_days: Optional[List[int]] = None  # 0=Monday, 1=Tuesday, ..., 6=Sunday
    current_day_of_week: Optional[int] = None        # 0=Monday, ..., 6=Sunday
    max_capacity: int = 1000
    is_synthetic_inventory: bool = True
    inventory_source: str = "Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)"


@dataclass
class CalculationBreakdown:
    """Step-by-step transparency into every term of the inventory policy equation."""
    forecast_daily_demand: float
    lead_time_days: int
    lead_time_demand: float
    service_level_target: float
    z_score: float
    safety_stock_method: str
    safety_stock: int
    reorder_point: int
    current_stock: int
    in_transit_stock: int
    inventory_position: int
    target_stock_level: int
    unconstrained_order_quantity: int
    recommended_order_quantity: int
    moq: int
    pack_size: int
    max_capacity: int
    is_supplier_order_day: bool
    days_until_next_order_day: int


@dataclass
class InventoryPolicyDecision:
    sku: str
    current_stock: int
    in_transit_stock: int
    inventory_position: int
    lead_time_days: int
    forecast_demand_during_lead_time: float
    safety_stock: int
    reorder_point: int
    target_stock_level: int
    moq: int
    batch_size: int
    max_capacity: int
    should_reorder: bool
    recommended_order_quantity: int
    unconstrained_order_quantity: int
    reason: str
    constraints_applied: Dict[str, Any]
    breakdown: Optional[CalculationBreakdown] = None
    is_synthetic_inventory: bool = True
    inventory_source: str = "Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)"


def calculate_replenishment_policy(inputs: ReplenishmentPolicyInputs) -> InventoryPolicyDecision:
    """
    Decoupled replenishment calculation engine.
    Given purely inventory and forecast parameters, computes the optimal constrained order.
    """
    daily_demand = max(0.0, float(inputs.forecast_daily_demand))
    lead_time = max(1, int(inputs.lead_time_days))
    current_stock = int(inputs.current_stock)
    in_transit = int(inputs.in_transit_stock)
    inventory_position = current_stock + in_transit

    # 1. Supplier Order Days & Review Period
    is_order_day = True
    days_until_next_order = 0
    effective_lead_time = float(lead_time)

    if inputs.supplier_order_days and len(inputs.supplier_order_days) > 0:
        current_dow = inputs.current_day_of_week if inputs.current_day_of_week is not None else 0
        if current_dow not in inputs.supplier_order_days:
            is_order_day = False
            # Find next order day
            days_ahead = 1
            while (current_dow + days_ahead) % 7 not in inputs.supplier_order_days and days_ahead <= 7:
                days_ahead += 1
            days_until_next_order = days_ahead

    lead_time_demand = daily_demand * lead_time

    # 2. Safety Stock Determination
    z = get_z_score(inputs.service_level)
    if inputs.safety_stock_override is not None:
        safety_stock = max(0, int(inputs.safety_stock_override))
        safety_method = f"Explicit manual override ({safety_stock} units)"
    else:
        # Standard deviation of demand
        sigma_d = inputs.demand_std_dev if inputs.demand_std_dev is not None else max(1.0, daily_demand * 0.4)
        sigma_l = float(inputs.lead_time_std_dev)

        # Combined lead time demand variance: sigma_LT = sqrt(L * sigma_D^2 + D^2 * sigma_L^2)
        variance_lt = (effective_lead_time * (sigma_d ** 2)) + ((daily_demand ** 2) * (sigma_l ** 2))
        sigma_lt = math.sqrt(max(0.1, variance_lt))

        safety_stock = max(5, int(math.ceil(z * sigma_lt)))
        safety_method = f"Service level {inputs.service_level * 100:.0f}% (z={z:.2f}, σ_L={sigma_lt:.1f})"

    # 3. Reorder Point (ROP) = Lead Time Demand + Safety Stock
    reorder_point = int(round(lead_time_demand)) + safety_stock

    # 4. Target Stock Level (Order-up-to level)
    if inputs.target_stock_level is not None:
        target_stock = int(inputs.target_stock_level)
    elif inputs.target_days_of_supply is not None:
        target_stock = int(math.ceil(daily_demand * inputs.target_days_of_supply)) + safety_stock
    else:
        # Default order-up-to level: ROP + 14 days of cycle stock
        target_stock = max(reorder_point + int(math.ceil(daily_demand * 14)), int(reorder_point * 1.5))

    # 5. Reorder Trigger
    should_reorder = inventory_position <= reorder_point

    # 6. Base Unconstrained Order Quantity
    if not should_reorder:
        unconstrained_qty = 0
        recommended_qty = 0
        reason = (
            f"Inventory position ({inventory_position}) is healthy and above reorder point ({reorder_point}). "
            f"No replenishment order required at this time."
        )
    else:
        unconstrained_qty = max(0, target_stock - inventory_position)
        recommended_qty = unconstrained_qty
        reason = (
            f"Inventory position ({inventory_position}) fell to or below reorder point ({reorder_point}). "
            f"Replenishment triggered to recover target stock level ({target_stock})."
        )

    # 7. Apply Physical Constraints
    moq = max(1, int(inputs.moq))
    pack_size = max(1, int(inputs.pack_size))
    max_capacity = max(10, int(inputs.max_capacity))

    constraints_applied = {
        "moq_triggered": False,
        "batch_rounding_applied": False,
        "max_capacity_capped": False,
        "order_day_delayed": not is_order_day,
        "days_until_next_order": days_until_next_order,
    }

    if should_reorder:
        # Supplier order day check
        if not is_order_day:
            reason += f" (Note: Today is not an approved supplier order day. Order scheduled in {days_until_next_order} days)."

        # Minimum Order Quantity
        if 0 < recommended_qty < moq:
            recommended_qty = moq
            constraints_applied["moq_triggered"] = True

        # Pack Size Rounding
        if pack_size > 1 and recommended_qty > 0:
            remainder = recommended_qty % pack_size
            if remainder != 0:
                recommended_qty += (pack_size - remainder)
                constraints_applied["batch_rounding_applied"] = True

        # Warehouse Max Capacity
        max_allowed = max(0, max_capacity - inventory_position)
        if recommended_qty > max_allowed:
            recommended_qty = max_allowed
            constraints_applied["max_capacity_capped"] = True

    breakdown = CalculationBreakdown(
        forecast_daily_demand=round(daily_demand, 2),
        lead_time_days=lead_time,
        lead_time_demand=round(lead_time_demand, 1),
        service_level_target=inputs.service_level,
        z_score=round(z, 3),
        safety_stock_method=safety_method,
        safety_stock=safety_stock,
        reorder_point=reorder_point,
        current_stock=current_stock,
        in_transit_stock=in_transit,
        inventory_position=inventory_position,
        target_stock_level=target_stock,
        unconstrained_order_quantity=unconstrained_qty,
        recommended_order_quantity=recommended_qty,
        moq=moq,
        pack_size=pack_size,
        max_capacity=max_capacity,
        is_supplier_order_day=is_order_day,
        days_until_next_order_day=days_until_next_order,
    )

    return InventoryPolicyDecision(
        sku=inputs.sku,
        current_stock=current_stock,
        in_transit_stock=in_transit,
        inventory_position=inventory_position,
        lead_time_days=lead_time,
        forecast_demand_during_lead_time=round(lead_time_demand, 2),
        safety_stock=safety_stock,
        reorder_point=reorder_point,
        target_stock_level=target_stock,
        moq=moq,
        batch_size=pack_size,
        max_capacity=max_capacity,
        should_reorder=should_reorder,
        recommended_order_quantity=recommended_qty,
        unconstrained_order_quantity=unconstrained_qty,
        reason=reason,
        constraints_applied=constraints_applied,
        breakdown=breakdown,
        is_synthetic_inventory=inputs.is_synthetic_inventory,
        inventory_source=inputs.inventory_source,
    )


def evaluate_reorder_decision(
    sku: str,
    current_stock: int,
    in_transit_stock: int = 0,
    lead_time_days: int = 4,
    forecast_demand_during_lead_time: float = 0.0,
    safety_stock: int = 20,
    target_stock_level: int = 100,
    moq: int = 10,
    batch_size: int = 1,
    max_capacity: int = 500,
    supplier_order_days: Optional[List[int]] = None,
    current_day_of_week: Optional[int] = None,
) -> InventoryPolicyDecision:
    """
    Backwards-compatible wrapper calling the decoupled calculation engine.
    """
    daily_demand = forecast_demand_during_lead_time / max(1, lead_time_days)
    inputs = ReplenishmentPolicyInputs(
        sku=sku,
        forecast_daily_demand=daily_demand,
        lead_time_days=lead_time_days,
        current_stock=current_stock,
        in_transit_stock=in_transit_stock,
        safety_stock_override=safety_stock,
        target_stock_level=target_stock_level,
        moq=moq,
        pack_size=batch_size,
        max_capacity=max_capacity,
        supplier_order_days=supplier_order_days,
        current_day_of_week=current_day_of_week,
    )
    return calculate_replenishment_policy(inputs)


def run_policy_scenarios(inputs: ReplenishmentPolicyInputs) -> List[Dict[str, Any]]:
    """
    Executes scenario stress-testing across lead-time delays, demand surges,
    and alternative safety-stock buffers.
    """
    scenarios = []

    # 1. Baseline
    base_res = calculate_replenishment_policy(inputs)
    scenarios.append({
        "scenario_id": "baseline",
        "scenario_name": "Current Baseline",
        "description": f"Standard lead time ({inputs.lead_time_days}d), normal demand ({inputs.forecast_daily_demand:.1f}/day), {inputs.service_level*100:.0f}% service level.",
        "lead_time_days": inputs.lead_time_days,
        "lead_time_delta": 0,
        "forecast_daily_demand": inputs.forecast_daily_demand,
        "demand_multiplier": 1.0,
        "service_level": inputs.service_level,
        "safety_stock": base_res.safety_stock,
        "reorder_point": base_res.reorder_point,
        "should_reorder": base_res.should_reorder,
        "order_quantity": base_res.recommended_order_quantity,
        "stockout_risk": "Low" if base_res.inventory_position > base_res.reorder_point else "Elevated",
    })

    # 2. Lead-Time Delays (+2 days, +5 days, +10 days)
    for delay in [2, 5, 10]:
        scen_inputs = ReplenishmentPolicyInputs(
            sku=inputs.sku,
            forecast_daily_demand=inputs.forecast_daily_demand,
            lead_time_days=inputs.lead_time_days + delay,
            current_stock=inputs.current_stock,
            in_transit_stock=inputs.in_transit_stock,
            service_level=inputs.service_level,
            moq=inputs.moq,
            pack_size=inputs.pack_size,
            max_capacity=inputs.max_capacity,
        )
        res = calculate_replenishment_policy(scen_inputs)
        scenarios.append({
            "scenario_id": f"delay_{delay}d",
            "scenario_name": f"Supplier Delay +{delay} Days",
            "description": f"Port congestion / supplier delay increases transit time from {inputs.lead_time_days} to {inputs.lead_time_days + delay} days.",
            "lead_time_days": inputs.lead_time_days + delay,
            "lead_time_delta": delay,
            "forecast_daily_demand": inputs.forecast_daily_demand,
            "demand_multiplier": 1.0,
            "service_level": inputs.service_level,
            "safety_stock": res.safety_stock,
            "reorder_point": res.reorder_point,
            "should_reorder": res.should_reorder,
            "order_quantity": res.recommended_order_quantity,
            "stockout_risk": "High" if delay >= 5 else "Moderate",
        })

    # 3. Demand Surges (+25%, +50%, +100%)
    for surge_pct in [25, 50, 100]:
        mult = 1.0 + (surge_pct / 100.0)
        scen_inputs = ReplenishmentPolicyInputs(
            sku=inputs.sku,
            forecast_daily_demand=inputs.forecast_daily_demand * mult,
            lead_time_days=inputs.lead_time_days,
            current_stock=inputs.current_stock,
            in_transit_stock=inputs.in_transit_stock,
            service_level=inputs.service_level,
            moq=inputs.moq,
            pack_size=inputs.pack_size,
            max_capacity=inputs.max_capacity,
        )
        res = calculate_replenishment_policy(scen_inputs)
        scenarios.append({
            "scenario_id": f"surge_{surge_pct}pct",
            "scenario_name": f"Demand Surge +{surge_pct}%",
            "description": f"Marketing campaign or seasonal spike boosts daily sales by +{surge_pct}%.",
            "lead_time_days": inputs.lead_time_days,
            "lead_time_delta": 0,
            "forecast_daily_demand": round(inputs.forecast_daily_demand * mult, 2),
            "demand_multiplier": mult,
            "service_level": inputs.service_level,
            "safety_stock": res.safety_stock,
            "reorder_point": res.reorder_point,
            "should_reorder": res.should_reorder,
            "order_quantity": res.recommended_order_quantity,
            "stockout_risk": "Critical" if surge_pct >= 50 and res.should_reorder else "Moderate",
        })

    # 4. Service Level / Safety Stock Buffers (90%, 95%, 98%, 99%)
    for sl in [0.90, 0.95, 0.98, 0.99]:
        scen_inputs = ReplenishmentPolicyInputs(
            sku=inputs.sku,
            forecast_daily_demand=inputs.forecast_daily_demand,
            lead_time_days=inputs.lead_time_days,
            current_stock=inputs.current_stock,
            in_transit_stock=inputs.in_transit_stock,
            service_level=sl,
            moq=inputs.moq,
            pack_size=inputs.pack_size,
            max_capacity=inputs.max_capacity,
        )
        res = calculate_replenishment_policy(scen_inputs)
        scenarios.append({
            "scenario_id": f"service_level_{int(sl*100)}",
            "scenario_name": f"Target Service Level {int(sl*100)}%",
            "description": f"Statistical fill rate target set to {int(sl*100)}% (z={get_z_score(sl):.2f}).",
            "lead_time_days": inputs.lead_time_days,
            "lead_time_delta": 0,
            "forecast_daily_demand": inputs.forecast_daily_demand,
            "demand_multiplier": 1.0,
            "service_level": sl,
            "safety_stock": res.safety_stock,
            "reorder_point": res.reorder_point,
            "should_reorder": res.should_reorder,
            "order_quantity": res.recommended_order_quantity,
            "stockout_risk": "Very Low" if sl >= 0.98 else ("Low" if sl >= 0.95 else "Moderate"),
        })

    return scenarios


def evaluate_policy_tradeoff(
    inputs: ReplenishmentPolicyInputs,
    unit_cost: float = 100.0,
    annual_holding_rate: float = 0.20,
    order_fixed_cost: float = 250.0,
) -> Dict[str, Any]:
    """
    Compares the business trade-off between:
    - Conservative Policy (high safety buffer, 98% service level, near-zero stockouts, higher holding cost)
    - Balanced Policy (optimal trade-off, 95% service level)
    - Lean Policy (just-in-time, 90% service level, low inventory, higher stockout exposure)
    """
    # 1. Conservative
    cons_inputs = ReplenishmentPolicyInputs(
        sku=inputs.sku,
        forecast_daily_demand=inputs.forecast_daily_demand,
        lead_time_days=inputs.lead_time_days,
        current_stock=inputs.current_stock,
        in_transit_stock=inputs.in_transit_stock,
        service_level=0.98,
        target_days_of_supply=28,
        moq=inputs.moq,
        pack_size=inputs.pack_size,
        max_capacity=inputs.max_capacity,
    )
    cons_res = calculate_replenishment_policy(cons_inputs)

    # 2. Balanced
    bal_inputs = ReplenishmentPolicyInputs(
        sku=inputs.sku,
        forecast_daily_demand=inputs.forecast_daily_demand,
        lead_time_days=inputs.lead_time_days,
        current_stock=inputs.current_stock,
        in_transit_stock=inputs.in_transit_stock,
        service_level=0.95,
        target_days_of_supply=18,
        moq=inputs.moq,
        pack_size=inputs.pack_size,
        max_capacity=inputs.max_capacity,
    )
    bal_res = calculate_replenishment_policy(bal_inputs)

    # 3. Lean
    lean_inputs = ReplenishmentPolicyInputs(
        sku=inputs.sku,
        forecast_daily_demand=inputs.forecast_daily_demand,
        lead_time_days=inputs.lead_time_days,
        current_stock=inputs.current_stock,
        in_transit_stock=inputs.in_transit_stock,
        service_level=0.90,
        target_days_of_supply=10,
        moq=inputs.moq,
        pack_size=inputs.pack_size,
        max_capacity=inputs.max_capacity,
    )
    lean_res = calculate_replenishment_policy(lean_inputs)

    def calc_policy_metrics(name: str, res: InventoryPolicyDecision, target_days: int, sl: float):
        # Average inventory ~ Safety Stock + (Cycle Stock / 2)
        cycle_stock = max(1.0, inputs.forecast_daily_demand * target_days)
        avg_inv_units = res.safety_stock + (cycle_stock / 2.0)
        avg_inv_value = round(avg_inv_units * unit_cost, 2)
        annual_holding_cost = round(avg_inv_value * annual_holding_rate, 2)
        annual_demand = inputs.forecast_daily_demand * 365.0
        orders_per_year = max(1.0, round(annual_demand / cycle_stock, 1))
        annual_ordering_cost = round(orders_per_year * order_fixed_cost, 2)
        total_policy_cost = round(annual_holding_cost + annual_ordering_cost, 2)

        return {
            "policy_name": name,
            "target_service_level": f"{int(sl*100)}%",
            "safety_stock_units": res.safety_stock,
            "reorder_point": res.reorder_point,
            "target_stock_level": res.target_stock_level,
            "recommended_order_quantity": res.recommended_order_quantity,
            "should_reorder": res.should_reorder,
            "average_inventory_units": round(avg_inv_units, 1),
            "average_inventory_value": avg_inv_value,
            "estimated_annual_holding_cost": annual_holding_cost,
            "estimated_annual_ordering_cost": annual_ordering_cost,
            "total_estimated_cost": total_policy_cost,
            "simulated_stockout_risk": "Under 2% (Ultra-safe)" if sl >= 0.98 else ("~5% (Managed)" if sl >= 0.95 else "~10% (High risk if demand spikes)"),
            "order_frequency_per_year": orders_per_year,
            "recommended_use_case": (
                "Critical top-selling SKUs and items with long, unreliable overseas lead times."
                if sl >= 0.98 else
                "Standard catalog inventory with reliable domestic supplier lead times."
                if sl >= 0.95 else
                "Fast-moving items with short lead times, bulk goods, or constrained warehouse footprint."
            ),
        }

    return {
        "sku": inputs.sku,
        "forecast_daily_demand": inputs.forecast_daily_demand,
        "lead_time_days": inputs.lead_time_days,
        "current_stock": inputs.current_stock,
        "is_synthetic_inventory": inputs.is_synthetic_inventory,
        "inventory_source": inputs.inventory_source,
        "policies": {
            "conservative": calc_policy_metrics("Conservative Policy", cons_res, 28, 0.98),
            "balanced": calc_policy_metrics("Balanced Policy", bal_res, 18, 0.95),
            "lean": calc_policy_metrics("Lean Policy", lean_res, 10, 0.90),
        },
        "tradeoff_summary": (
            "The Conservative policy locks in maximum customer fulfillment (98% service level) by holding "
            f"more buffer stock, whereas the Lean policy reduces holding cost at the expense of higher vulnerability to lead-time delays."
        ),
    }
