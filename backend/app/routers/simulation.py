from fastapi import APIRouter
from backend.app.schemas import InventorySimulationResponse, InventorySimulationRequest
from backend.app.services.simulation_service import simulation_service

router = APIRouter(prefix="/inventory", tags=["inventory-simulation"])

@router.get("/backtest", response_model=InventorySimulationResponse)
def get_inventory_backtest():
    """
    Returns the held-out test split inventory simulation backtest comparing
    MORROW's ML-forecast policy against the fixed reorder rule baseline and seasonal baseline.
    """
    return simulation_service.get_backtest()

@router.post("/simulate", response_model=InventorySimulationResponse)
def run_scenario_simulation(req: InventorySimulationRequest):
    """
    Runs a customized inventory simulation backtest using configurable scenario inputs
    (holding cost rate, ordering cost, stockout penalty, lead time).
    """
    return simulation_service.run_scenario(req)
