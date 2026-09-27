from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas import Category, DailySales, Product, Supplier
from backend.app.services.product_service import product_service
from backend.app.ml.predictor import get_predictor

router = APIRouter(tags=["Products"])


@router.get("/products", response_model=List[Product])
def list_products(
    category: Optional[str] = Query(None, description="Filter by category ID"),
    search: Optional[str] = Query(None, description="Search by name or SKU"),
):
    products = product_service.get_all()
    if category and category != "all":
        products = [p for p in products if p.categoryId == category]
    if search:
        q = search.lower()
        products = [p for p in products if q in p.name.lower() or q in p.sku.lower()]
    return products


@router.get("/products/{product_id}", response_model=Product)
def get_product(product_id: str):
    product = product_service.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail=f"Product with ID '{product_id}' not found.")
    return product


@router.get("/categories", response_model=List[Category])
def list_categories():
    return product_service.get_categories()


@router.get("/suppliers", response_model=List[Supplier])
def list_suppliers():
    return product_service.get_suppliers()


@router.get("/sales/{product_id}", response_model=List[DailySales])
def get_product_sales(product_id: str, days: int = Query(90, ge=7, le=365)):
    predictor = get_predictor()
    df = predictor.get_sku_history(product_id, days=days)
    if df.empty:
        # Check if product exists in catalog
        p = product_service.get_by_id(product_id)
        if not p:
            raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found.")
        return []

    return [
        DailySales(
            productId=product_id,
            date=row["Date"].strftime("%Y-%m-%d"),
            quantity=int(row["quantity"]),
            revenue=round(float(row["revenue"]) * 100, 2),
        )
        for _, row in df.iterrows()
    ]
