from fastapi import APIRouter
from backend.app.schemas import DashboardSummary
from backend.app.services.dashboard_service import dashboard_service

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary():
    return dashboard_service.get_summary()
