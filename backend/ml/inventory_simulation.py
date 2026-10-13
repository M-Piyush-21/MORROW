import sys
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
try:
    import joblib
except ImportError:
    joblib = None

# Add project root to sys.path
sys.path.append(str(Path(__file__).resolve().parents[2]))
from backend.ml.utils import get_logger, load_params, save_json
from backend.ml.train import FEATURE_COLUMNS
from backend.ml.inventory_policy import evaluate_reorder_decision

logger = get_logger("inventory_simulation")

PROBLEM_STATEMENT = (
    "Reduce avoidable retail stockouts and costly excess inventory while optimally balancing "
    "service level (fill rate), inventory holding cost, and supplier ordering costs under lead-time uncertainty."
)

SCENARIO_INPUT_DISCLAIMER = (
    "Cost parameters are configurable scenario inputs (assumptions) for planning and comparison, "
    "not audited historical business facts."
)

class InventorySimulator:
    def __init__(
        self,
        features_path: str = "backend/data/processed/features.parquet",
        model_path: str = "backend/models/random_forest_demand.joblib",
        test_start_date: str = "2011-10-15",
    ):
        self.features_path = Path(features_path)
        self.model_path = Path(model_path)
        self.weights_path = self.model_path.parent / "rf_weights.npz"
        self.test_start_date = test_start_date
        self.df = None
        self.model = None
        self._load()

    def _load(self):
        if self.features_path.exists():
            self.df = pd.read_parquet(self.features_path)
            self.df["Date"] = pd.to_datetime(self.df["Date"])

        if self.weights_path.exists():
            try:
                from backend.ml.fast_rf import FastRandomForest
                self.model = FastRandomForest(self.weights_path)
            except Exception as e:
                logger.warning(f"FastRandomForest load note: {e}")
                self.model = None

        if self.model is None and self.model_path.exists() and joblib is not None:
            try:
                self.model = joblib.load(self.model_path)
            except Exception as e:
                logger.warning(f"Joblib load note: {e}")

    def run_backtest(
        self,
        holding_cost_annual_rate: float = 0.20,
        ordering_cost_per_order: float = 40.0,
        stockout_penalty_per_unit: float = 5.0,
        lead_time_days: int = 4,
        service_factor_z: float = 1.65,
        default_moq: int = 15,
        default_batch_size: int = 5,
        skus_limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Runs an inventory simulation comparing:
        1. MORROW Policy (Dynamic ML-forecast ROP)
        2. Fixed Baseline Policy (Static historical mean ROP)
        3. Seasonal Baseline Policy (Lag-7 repeat ROP)
        """
        if self.df is None:
            raise FileNotFoundError(f"Features file not found at {self.features_path}")

        test_df = self.df[self.df["Date"] >= pd.to_datetime(self.test_start_date)].sort_values(["Date", "sku"]).copy()
        train_df = self.df[self.df["Date"] < pd.to_datetime(self.test_start_date)].copy()

        daily_holding_rate = holding_cost_annual_rate / 365.0

        unique_skus = sorted(test_df["sku"].unique().tolist())
        if skus_limit:
            unique_skus = unique_skus[:skus_limit]

        # Calculate historical stats from training data per SKU
        sku_hist_stats = {}
        for sku in unique_skus:
            sku_train = train_df[train_df["sku"] == sku]
            if len(sku_train) > 0:
                mean_qty = float(sku_train["quantity"].mean())
                std_qty = float(sku_train["quantity"].std()) if len(sku_train) > 1 else 1.0
                unit_price = float(sku_train["unit_price"].iloc[-1])
            else:
                sku_test = test_df[test_df["sku"] == sku]
                mean_qty = float(sku_test["quantity"].mean())
                std_qty = float(sku_test["quantity"].std()) if len(sku_test) > 1 else 1.0
                unit_price = float(sku_test["unit_price"].iloc[-1]) if len(sku_test) > 0 else 10.0

            std_lead_time = std_qty * np.sqrt(lead_time_days)
            safety_stock = int(round(service_factor_z * std_lead_time))
            safety_stock = max(5, safety_stock)
            target_stock = int(round(mean_qty * (lead_time_days * 2) + safety_stock))
            target_stock = max(target_stock, safety_stock * 2)

            sku_hist_stats[sku] = {
                "mean_qty": mean_qty,
                "std_qty": std_qty,
                "unit_price": unit_price,
                "unit_cost": max(1.0, round(unit_price * 0.65, 2)),  # Cost assumption: 65% of selling price
                "safety_stock": safety_stock,
                "target_stock": target_stock,
            }

        # Predict ML demand for test period
        if self.model is not None:
            test_df["ml_pred"] = np.clip(self.model.predict(test_df[FEATURE_COLUMNS]), 0, None)
        else:
            test_df["ml_pred"] = test_df["rolling_mean_7"].fillna(test_df["quantity"])

        policies = ["morrow_ml", "fixed_baseline", "seasonal_baseline"]
        results = {p: self._simulate_policy(
            policy_name=p,
            test_df=test_df,
            unique_skus=unique_skus,
            sku_stats=sku_hist_stats,
            lead_time_days=lead_time_days,
            daily_holding_rate=daily_holding_rate,
            ordering_cost=ordering_cost_per_order,
            stockout_penalty=stockout_penalty_per_unit,
            moq=default_moq,
            batch_size=default_batch_size,
        ) for p in policies}

        # Compare MORROW vs Fixed Baseline
        m_res = results["morrow_ml"]
        b_res = results["fixed_baseline"]
        s_res = results["seasonal_baseline"]

        def calc_reduction(base_val, new_val):
            if base_val == 0:
                return 0.0
            return round(((base_val - new_val) / base_val) * 100, 1)

        summary_comparison = {
            "stockout_days_reduction_pct": calc_reduction(b_res["simulated_stockout_days"], m_res["simulated_stockout_days"]),
            "units_short_reduction_pct": calc_reduction(b_res["units_short"], m_res["units_short"]),
            "excess_inventory_reduction_pct": calc_reduction(b_res["excess_inventory_units"], m_res["excess_inventory_units"]),
            "holding_cost_savings_pct": calc_reduction(b_res["total_holding_cost"], m_res["total_holding_cost"]),
            "total_cost_savings_pct": calc_reduction(b_res["total_cost"], m_res["total_cost"]),
            "service_level_improvement_pct": round(m_res["service_level"]["fill_rate"] - b_res["service_level"]["fill_rate"], 2),
        }

        output = {
            "problem_statement": PROBLEM_STATEMENT,
            "scenario_inputs": {
                "holding_cost_annual_rate": holding_cost_annual_rate,
                "daily_holding_rate": round(daily_holding_rate, 6),
                "ordering_cost_per_order": ordering_cost_per_order,
                "stockout_penalty_per_unit": stockout_penalty_per_unit,
                "lead_time_days": lead_time_days,
                "service_factor_z": service_factor_z,
                "moq": default_moq,
                "batch_size": default_batch_size,
                "is_scenario_assumption": True,
                "disclaimer": SCENARIO_INPUT_DISCLAIMER,
            },
            "backtest_period": {
                "start": self.test_start_date,
                "end": str(test_df["Date"].max().date()),
                "total_days": int(test_df["Date"].nunique()),
                "sku_count": len(unique_skus),
                "total_demand_units": int(test_df["quantity"].sum()),
            },
            "comparison": summary_comparison,
            "policies": {
                "morrow": m_res,
                "fixed_baseline": b_res,
                "seasonal_baseline": s_res,
            },
        }

        return output

    def _simulate_policy(
        self,
        policy_name: str,
        test_df: pd.DataFrame,
        unique_skus: List[str],
        sku_stats: Dict[str, Any],
        lead_time_days: int,
        daily_holding_rate: float,
        ordering_cost: float,
        stockout_penalty: float,
        moq: int,
        batch_size: int,
    ) -> Dict[str, Any]:
        """Runs day-by-day simulation loop for a single policy across all SKUs."""
        dates = sorted(test_df["Date"].unique())
        
        # State tracking per SKU
        # on_hand, in_transit: list of (arrival_date, qty)
        state = {}
        for sku in unique_skus:
            stats = sku_stats[sku]
            # Starting inventory set to 75% of target stock level
            start_inv = int(round(stats["target_stock"] * 0.75))
            state[sku] = {
                "on_hand": start_inv,
                "in_transit": [],  # list of (arrival_date, qty)
            }

        total_stockout_days = 0
        total_units_short = 0
        total_excess_units = 0
        total_fulfilled_units = 0
        total_demand_units = 0
        total_orders_placed = 0
        daily_inventory_values = []
        total_holding_cost = 0.0
        total_ordering_cost = 0.0
        total_stockout_cost = 0.0

        sku_level_metrics = {sku: {
            "stockout_days": 0,
            "units_short": 0,
            "orders_placed": 0,
            "avg_inventory": 0.0,
            "fulfilled_units": 0,
            "total_demand": 0,
        } for sku in unique_skus}

        for current_date in dates:
            day_slice = test_df[test_df["Date"] == current_date].set_index("sku")
            day_total_inv_val = 0.0

            for sku in unique_skus:
                stats = sku_stats[sku]
                sku_st = state[sku]

                # 1. Arriving in-transit orders
                arrived_qty = 0
                remaining_in_transit = []
                for arr_date, qty in sku_st["in_transit"]:
                    if arr_date <= current_date:
                        arrived_qty += qty
                    else:
                        remaining_in_transit.append((arr_date, qty))
                sku_st["in_transit"] = remaining_in_transit
                sku_st["on_hand"] += arrived_qty

                # 2. Demand arrives
                if sku in day_slice.index:
                    row = day_slice.loc[sku]
                    actual_demand = int(row["quantity"])
                    ml_pred = float(row.get("ml_pred", row["quantity"]))
                    lag7_val = float(row.get("lag_7", row["quantity"]))
                else:
                    actual_demand = 0
                    ml_pred = stats["mean_qty"]
                    lag7_val = stats["mean_qty"]

                total_demand_units += actual_demand
                sku_level_metrics[sku]["total_demand"] += actual_demand

                # 3. Fulfill sales
                fulfilled = min(sku_st["on_hand"], actual_demand)
                unmet = actual_demand - fulfilled
                sku_st["on_hand"] -= fulfilled

                total_fulfilled_units += fulfilled
                sku_level_metrics[sku]["fulfilled_units"] += fulfilled

                if unmet > 0:
                    total_stockout_days += 1
                    total_units_short += unmet
                    sku_level_metrics[sku]["stockout_days"] += 1
                    sku_level_metrics[sku]["units_short"] += unmet
                    total_stockout_cost += unmet * stockout_penalty

                # 4. Inventory position & holding costs
                ending_inv = sku_st["on_hand"]
                inv_val = ending_inv * stats["unit_cost"]
                day_total_inv_val += inv_val

                holding_cost_day = inv_val * daily_holding_rate
                total_holding_cost += holding_cost_day

                excess = max(0, ending_inv - stats["target_stock"])
                total_excess_units += excess

                # 5. Evaluate Reorder Policy
                in_transit_sum = sum(q for _, q in sku_st["in_transit"])

                if policy_name == "morrow_ml":
                    # Forecast lead time demand using ML forecast
                    forecast_ltd = ml_pred * lead_time_days
                elif policy_name == "seasonal_baseline":
                    # Forecast lead time demand using Lag-7 seasonal
                    forecast_ltd = max(1.0, lag7_val) * lead_time_days
                else:  # fixed_baseline
                    # Fixed historical average daily demand
                    forecast_ltd = stats["mean_qty"] * lead_time_days

                decision = evaluate_reorder_decision(
                    sku=sku,
                    current_stock=sku_st["on_hand"],
                    in_transit_stock=in_transit_sum,
                    lead_time_days=lead_time_days,
                    forecast_demand_during_lead_time=forecast_ltd,
                    safety_stock=stats["safety_stock"],
                    target_stock_level=stats["target_stock"],
                    moq=moq,
                    batch_size=batch_size,
                    max_capacity=stats["target_stock"] * 2,
                )

                if decision.should_reorder and decision.recommended_order_quantity > 0:
                    arrival_date = current_date + pd.Timedelta(days=lead_time_days)
                    sku_st["in_transit"].append((arrival_date, decision.recommended_order_quantity))
                    total_orders_placed += 1
                    sku_level_metrics[sku]["orders_placed"] += 1
                    total_ordering_cost += ordering_cost

            daily_inventory_values.append(day_total_inv_val)

        avg_inv_val = float(np.mean(daily_inventory_values)) if daily_inventory_values else 0.0
        total_sku_days = len(dates) * len(unique_skus)
        cycle_service_level = round(((total_sku_days - total_stockout_days) / max(1, total_sku_days)) * 100, 2)
        fill_rate = round((total_fulfilled_units / max(1, total_demand_units)) * 100, 2)
        total_cost = round(total_holding_cost + total_ordering_cost + total_stockout_cost, 2)

        return {
            "policy_name": policy_name,
            "simulated_stockout_days": total_stockout_days,
            "stockout_day_rate_pct": round((total_stockout_days / max(1, total_sku_days)) * 100, 2),
            "units_short": total_units_short,
            "excess_inventory_units": total_excess_units,
            "average_inventory_value": round(avg_inv_val, 2),
            "order_frequency": total_orders_placed,
            "service_level": {
                "fill_rate": fill_rate,
                "cycle_service_level": cycle_service_level,
            },
            "costs": {
                "holding_cost": round(total_holding_cost, 2),
                "ordering_cost": round(total_ordering_cost, 2),
                "stockout_penalty_cost": round(total_stockout_cost, 2),
                "total_cost": total_cost,
            },
            "total_holding_cost": round(total_holding_cost, 2),
            "total_ordering_cost": round(total_ordering_cost, 2),
            "total_stockout_cost": round(total_stockout_cost, 2),
            "total_cost": total_cost,
        }

def run_simulation_backtest(params_path: str = "params.yaml", output_path: str = "backend/reports/metrics/inventory_simulation.json"):
    simulator = InventorySimulator()
    result = simulator.run_backtest()
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    save_json(result, output_path)
    logger.info(f"Inventory simulation backtest saved to {output_path}")
    return result

if __name__ == "__main__":
    run_simulation_backtest()
