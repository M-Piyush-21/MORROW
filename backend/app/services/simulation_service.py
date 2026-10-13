from pathlib import Path
from typing import Any, Dict, Optional
from backend.app.schemas import (
    InventorySimulationRequest,
    InventorySimulationResponse,
    SimulationScenarioInputs,
    SimulationComparisonSummary,
    SimulationPolicyResult,
    SimulationServiceLevel,
    SimulationCosts,
)
from backend.app.config import settings
from backend.ml.inventory_simulation import InventorySimulator, run_simulation_backtest
from backend.ml.utils import load_json

SIMULATION_CACHE_PATH = settings.INVENTORY_SIMULATION_PATH


class SimulationService:
    def __init__(self):
        self.simulator = None

    def _get_simulator(self) -> InventorySimulator:
        if self.simulator is None:
            self.simulator = InventorySimulator()
        return self.simulator

    def get_backtest(self) -> InventorySimulationResponse:
        """Returns the precomputed backtest or runs if not yet cached."""
        if SIMULATION_CACHE_PATH.exists():
            data = load_json(str(SIMULATION_CACHE_PATH))
            return self._format_response(data)
        
        sim = self._get_simulator()
        data = sim.run_backtest()
        return self._format_response(data)

    def run_scenario(self, req: InventorySimulationRequest) -> InventorySimulationResponse:
        """Runs on-demand scenario simulation with configurable inputs."""
        sim = self._get_simulator()
        data = sim.run_backtest(
            holding_cost_annual_rate=req.holdingCostAnnualRate or 0.20,
            ordering_cost_per_order=req.orderingCostPerOrder or 40.0,
            stockout_penalty_per_unit=req.stockoutPenaltyPerUnit or 5.0,
            lead_time_days=req.leadTimeDays or 4,
            service_factor_z=req.serviceFactorZ or 1.65,
            default_moq=req.moq or 15,
            default_batch_size=req.batchSize or 5,
            skus_limit=req.skusLimit,
        )
        return self._format_response(data)

    def _format_response(self, raw: Dict[str, Any]) -> InventorySimulationResponse:
        sc = raw.get("scenario_inputs", {})
        scenario_inputs = SimulationScenarioInputs(
            holdingCostAnnualRate=sc.get("holding_cost_annual_rate", 0.20),
            dailyHoldingRate=sc.get("daily_holding_rate", 0.000548),
            orderingCostPerOrder=sc.get("ordering_cost_per_order", 40.0),
            stockoutPenaltyPerUnit=sc.get("stockout_penalty_per_unit", 5.0),
            leadTimeDays=sc.get("lead_time_days", 4),
            serviceFactorZ=sc.get("service_factor_z", 1.65),
            moq=sc.get("moq", 15),
            batchSize=sc.get("batch_size", 5),
            isScenarioAssumption=True,
            disclaimer=sc.get("disclaimer", "Configurable scenario inputs (assumptions)"),
        )

        cmp_raw = raw.get("comparison", {})
        comparison = SimulationComparisonSummary(
            stockoutDaysReductionPct=cmp_raw.get("stockout_days_reduction_pct", 0.0),
            unitsShortReductionPct=cmp_raw.get("units_short_reduction_pct", 0.0),
            excessInventoryReductionPct=cmp_raw.get("excess_inventory_reduction_pct", 0.0),
            holdingCostSavingsPct=cmp_raw.get("holding_cost_savings_pct", 0.0),
            totalCostSavingsPct=cmp_raw.get("total_cost_savings_pct", 0.0),
            serviceLevelImprovementPct=cmp_raw.get("service_level_improvement_pct", 0.0),
        )

        policies_dict = {}
        for pol_key, p_raw in raw.get("policies", {}).items():
            policies_dict[pol_key] = SimulationPolicyResult(
                policyName=p_raw.get("policy_name", pol_key),
                simulatedStockoutDays=p_raw.get("simulated_stockout_days", 0),
                stockoutDayRatePct=p_raw.get("stockout_day_rate_pct", 0.0),
                unitsShort=p_raw.get("units_short", 0),
                excessInventoryUnits=p_raw.get("excess_inventory_units", 0),
                averageInventoryValue=p_raw.get("average_inventory_value", 0.0),
                orderFrequency=p_raw.get("order_frequency", 0),
                serviceLevel=SimulationServiceLevel(
                    fillRate=p_raw.get("service_level", {}).get("fill_rate", 0.0),
                    cycleServiceLevel=p_raw.get("service_level", {}).get("cycle_service_level", 0.0),
                ),
                costs=SimulationCosts(
                    holdingCost=p_raw.get("costs", {}).get("holding_cost", 0.0),
                    orderingCost=p_raw.get("costs", {}).get("ordering_cost", 0.0),
                    stockoutPenaltyCost=p_raw.get("costs", {}).get("stockout_penalty_cost", 0.0),
                    totalCost=p_raw.get("costs", {}).get("total_cost", 0.0),
                ),
                totalCost=p_raw.get("total_cost", 0.0),
            )

        return InventorySimulationResponse(
            problemStatement=raw.get("problem_statement", "Reduce avoidable stockouts and excess stock..."),
            scenarioInputs=scenario_inputs,
            backtestPeriod=raw.get("backtest_period", {}),
            comparison=comparison,
            policies=policies_dict,
        )

simulation_service = SimulationService()
