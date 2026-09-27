from typing import List
from fastapi import APIRouter
from backend.app.schemas import RestockRecommendation
from backend.app.services.restock_service import restock_service

router = APIRouter(tags=["Restock"])


@router.get("/recommendations/restock", response_model=List[RestockRecommendation])
def get_restock_recommendations():
    return restock_service.get_recommendations()
