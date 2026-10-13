from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from backend.app.schemas import (
    RestockRecommendation,
    Priority,
    DecisionConstraints,
    ReplenishmentCalculationBreakdown,
    ReplenishmentEvaluationRequest,
    ReplenishmentEvaluationResponse,
    ReplenishmentScenarioItem,
    ReplenishmentScenariosResponse,
    PolicyComparisonProfile,
    PolicyTradeoffResponse,
)
from backend.app.services.product_service import product_service
from backend.ml.inventory_policy import (
    calculate_replenishment_policy,
    ReplenishmentPolicyInputs,
    run_policy_scenarios,
    evaluate_policy_tradeoff,
)


class RestockService:
    def get_recommendations(self) -> List[RestockRecommendation]:
        products = product_service.get_all()
        recommendations = []
        now = datetime.now()

        for p in products:
            # Sourced supplier lead time
            sup = next((s for s in product_service.get_suppliers() if s.id == p.supplierId), None)
            lead_time = sup.leadTimeDays if sup else 4

            moq = max(10, int(round(p.averageDailyDemand * 2)))
            pack_size = 5
            max_capacity = max(p.targetStockLevel * 2, 500)

            # Build decoupled policy inputs
            policy_inputs = ReplenishmentPolicyInputs(
                sku=p.sku,
                forecast_daily_demand=p.averageDailyDemand,
                lead_time_days=lead_time,
                current_stock=p.currentStock,
                in_transit_stock=0,
                safety_stock_override=p.safetyStock,
                target_stock_level=p.targetStockLevel,
                moq=moq,
                pack_size=pack_size,
                max_capacity=max_capacity,
                supplier_order_days=[0, 2, 4],  # Mon, Wed, Fri review cycle
                current_day_of_week=now.weekday(),
                is_synthetic_inventory=True,
                inventory_source="Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)",
            )

            decision = calculate_replenishment_policy(policy_inputs)

            # Days until stockout
            if p.averageDailyDemand > 0:
                days_until_stockout = max(0, int(p.currentStock / p.averageDailyDemand))
                stockout_date = (now + timedelta(days=days_until_stockout)).strftime("%Y-%m-%d")
            else:
                days_until_stockout = None
                stockout_date = None

            # Priority
            if p.status == "out-of-stock" or p.status == "critical":
                priority: Priority = "high"
            elif p.status == "low-stock" or decision.should_reorder:
                priority: Priority = "medium"
            else:
                priority: Priority = "low"

            constraints = DecisionConstraints(
                moq=moq,
                batchSize=pack_size,
                packSize=pack_size,
                maxCapacity=max_capacity,
                moqTriggered=decision.constraints_applied.get("moq_triggered", False),
                batchRoundingApplied=decision.constraints_applied.get("batch_rounding_applied", False),
                maxCapacityCapped=decision.constraints_applied.get("max_capacity_capped", False),
                orderDayDelayed=decision.constraints_applied.get("order_day_delayed", False),
                daysUntilNextOrder=decision.constraints_applied.get("days_until_next_order", 0),
            )

            # Step-by-step breakdown
            breakdown_obj = None
            if decision.breakdown:
                bd = decision.breakdown
                breakdown_obj = ReplenishmentCalculationBreakdown(
                    forecastDailyDemand=bd.forecast_daily_demand,
                    leadTimeDays=bd.lead_time_days,
                    leadTimeDemand=bd.lead_time_demand,
                    serviceLevelTarget=bd.service_level_target,
                    zScore=bd.z_score,
                    safetyStockMethod=bd.safety_stock_method,
                    safetyStock=bd.safety_stock,
                    reorderPoint=bd.reorder_point,
                    currentStock=bd.current_stock,
                    inTransitStock=bd.in_transit_stock,
                    inventoryPosition=bd.inventory_position,
                    targetStockLevel=bd.target_stock_level,
                    unconstrainedOrderQuantity=bd.unconstrained_order_quantity,
                    recommendedOrderQuantity=bd.recommended_order_quantity,
                    moq=bd.moq,
                    packSize=bd.pack_size,
                    maxCapacity=bd.max_capacity,
                    isSupplierOrderDay=bd.is_supplier_order_day,
                    daysUntilNextOrderDay=bd.days_until_next_order_day,
                )

            rec = RestockRecommendation(
                productId=p.id,
                product=p,
                currentStock=p.currentStock,
                inTransitStock=decision.in_transit_stock,
                inventoryPosition=decision.inventory_position,
                averageDailyDemand=p.averageDailyDemand,
                forecastDemandDuringLeadTime=int(round(decision.forecast_demand_during_lead_time)),
                safetyStock=decision.safety_stock,
                reorderPoint=decision.reorder_point,
                targetStockLevel=decision.target_stock_level,
                recommendedOrderQuantity=decision.recommended_order_quantity,
                unconstrainedOrderQuantity=decision.unconstrained_order_quantity,
                supplierLeadTime=lead_time,
                priority=priority,
                reason=decision.reason,
                shouldReorder=decision.should_reorder,
                estimatedStockoutDate=stockout_date,
                daysUntilStockout=days_until_stockout,
                constraints=constraints,
                calculationBreakdown=breakdown_obj,
                isSyntheticInventory=True,
                inventoryDataSource="Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)",
            )
            recommendations.append(rec)

        # Sort: high priority first, then medium, then low
        priority_weights = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda r: (priority_weights[r.priority], -r.recommendedOrderQuantity))
        return recommendations

    def evaluate_custom_policy(self, req: ReplenishmentEvaluationRequest) -> ReplenishmentEvaluationResponse:
        inputs = ReplenishmentPolicyInputs(
            sku=req.sku,
            forecast_daily_demand=req.forecastDailyDemand,
            lead_time_days=req.leadTimeDays,
            current_stock=req.currentStock,
            in_transit_stock=req.inTransitStock,
            service_level=req.serviceLevel,
            safety_stock_override=req.safetyStockOverride,
            target_stock_level=req.targetStockLevel,
            target_days_of_supply=req.targetDaysOfSupply,
            moq=req.moq,
            pack_size=req.packSize,
            supplier_order_days=req.supplierOrderDays,
            current_day_of_week=req.currentDayOfWeek,
            max_capacity=req.maxCapacity,
            is_synthetic_inventory=True,
            inventory_source="Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)",
        )
        dec = calculate_replenishment_policy(inputs)
        bd = dec.breakdown
        breakdown_obj = None
        if bd:
            breakdown_obj = ReplenishmentCalculationBreakdown(
                forecastDailyDemand=bd.forecast_daily_demand,
                leadTimeDays=bd.lead_time_days,
                leadTimeDemand=bd.lead_time_demand,
                serviceLevelTarget=bd.service_level_target,
                zScore=bd.z_score,
                safetyStockMethod=bd.safety_stock_method,
                safetyStock=bd.safety_stock,
                reorderPoint=bd.reorder_point,
                currentStock=bd.current_stock,
                inTransitStock=bd.in_transit_stock,
                inventoryPosition=bd.inventory_position,
                targetStockLevel=bd.target_stock_level,
                unconstrainedOrderQuantity=bd.unconstrained_order_quantity,
                recommendedOrderQuantity=bd.recommended_order_quantity,
                moq=bd.moq,
                packSize=bd.pack_size,
                maxCapacity=bd.max_capacity,
                isSupplierOrderDay=bd.is_supplier_order_day,
                daysUntilNextOrderDay=bd.days_until_next_order_day,
            )

        return ReplenishmentEvaluationResponse(
            sku=dec.sku,
            current_stock=dec.current_stock,
            in_transit_stock=dec.in_transit_stock,
            inventory_position=dec.inventory_position,
            lead_time_days=dec.lead_time_days,
            forecast_demand_during_lead_time=dec.forecast_demand_during_lead_time,
            safety_stock=dec.safety_stock,
            reorder_point=dec.reorder_point,
            target_stock_level=dec.target_stock_level,
            moq=dec.moq,
            batch_size=dec.batch_size,
            max_capacity=dec.max_capacity,
            should_reorder=dec.should_reorder,
            recommended_order_quantity=dec.recommended_order_quantity,
            unconstrained_order_quantity=dec.unconstrained_order_quantity,
            reason=dec.reason,
            constraints_applied=dec.constraints_applied,
            breakdown=breakdown_obj,
            is_synthetic_inventory=True,
            inventory_source="Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)",
        )

    def get_scenarios_for_sku(self, sku: str) -> ReplenishmentScenariosResponse:
        p = product_service.get_by_sku(sku) or product_service.get_by_id(sku)
        if not p:
            # Fallback values for test
            avg_demand = 12.5
            current_stock = 25
            lead_time = 4
        else:
            avg_demand = p.averageDailyDemand
            current_stock = p.currentStock
            sup = next((s for s in product_service.get_suppliers() if s.id == p.supplierId), None)
            lead_time = sup.leadTimeDays if sup else 4

        inputs = ReplenishmentPolicyInputs(
            sku=sku,
            forecast_daily_demand=avg_demand,
            lead_time_days=lead_time,
            current_stock=current_stock,
            in_transit_stock=0,
            service_level=0.95,
            moq=10,
            pack_size=5,
            max_capacity=500,
        )
        raw_scenarios = run_policy_scenarios(inputs)
        items = [
            ReplenishmentScenarioItem(
                scenario_id=s["scenario_id"],
                scenario_name=s["scenario_name"],
                description=s["description"],
                lead_time_days=s["lead_time_days"],
                lead_time_delta=s["lead_time_delta"],
                forecast_daily_demand=s["forecast_daily_demand"],
                demand_multiplier=s["demand_multiplier"],
                service_level=s["service_level"],
                safety_stock=s["safety_stock"],
                reorder_point=s["reorder_point"],
                should_reorder=s["should_reorder"],
                order_quantity=s["order_quantity"],
                stockout_risk=s["stockout_risk"],
            )
            for s in raw_scenarios
        ]
        return ReplenishmentScenariosResponse(
            sku=sku,
            scenarios=items,
            is_synthetic_inventory=True,
            inventory_source="Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)",
        )

    def get_policy_tradeoff_for_sku(self, sku: str) -> PolicyTradeoffResponse:
        p = product_service.get_by_sku(sku) or product_service.get_by_id(sku)
        if not p:
            avg_demand = 14.2
            current_stock = 30
            lead_time = 4
            cost = 120.0
        else:
            avg_demand = p.averageDailyDemand
            current_stock = p.currentStock
            sup = next((s for s in product_service.get_suppliers() if s.id == p.supplierId), None)
            lead_time = sup.leadTimeDays if sup else 4
            cost = p.costPrice

        inputs = ReplenishmentPolicyInputs(
            sku=sku,
            forecast_daily_demand=avg_demand,
            lead_time_days=lead_time,
            current_stock=current_stock,
            in_transit_stock=0,
            service_level=0.95,
            moq=10,
            pack_size=5,
            max_capacity=500,
        )
        tradeoff_data = evaluate_policy_tradeoff(inputs, unit_cost=cost)
        profiles = {
            k: PolicyComparisonProfile(
                policy_name=v["policy_name"],
                target_service_level=v["target_service_level"],
                safety_stock_units=v["safety_stock_units"],
                reorder_point=v["reorder_point"],
                target_stock_level=v["target_stock_level"],
                recommended_order_quantity=v["recommended_order_quantity"],
                should_reorder=v["should_reorder"],
                average_inventory_units=v["average_inventory_units"],
                average_inventory_value=v["average_inventory_value"],
                estimated_annual_holding_cost=v["estimated_annual_holding_cost"],
                estimated_annual_ordering_cost=v["estimated_annual_ordering_cost"],
                total_estimated_cost=v["total_estimated_cost"],
                simulated_stockout_risk=v["simulated_stockout_risk"],
                order_frequency_per_year=v["order_frequency_per_year"],
                recommended_use_case=v["recommended_use_case"],
            )
            for k, v in tradeoff_data["policies"].items()
        }
        return PolicyTradeoffResponse(
            sku=sku,
            forecast_daily_demand=avg_demand,
            lead_time_days=lead_time,
            current_stock=current_stock,
            is_synthetic_inventory=True,
            inventory_source="Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)",
            policies=profiles,
            tradeoff_summary=tradeoff_data["tradeoff_summary"],
        )


restock_service = RestockService()
