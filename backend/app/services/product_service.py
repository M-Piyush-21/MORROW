from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import pandas as pd
from backend.app.config import settings
from backend.app.schemas import Category, Product, StockStatus, Supplier

CATEGORIES: List[Category] = [
    Category(id="cat-1", name="Gifts & Novelties", color="hsl(158, 64%, 38%)"),
    Category(id="cat-2", name="Home & Kitchen", color="hsl(210, 70%, 50%)"),
    Category(id="cat-3", name="Bags & Travel", color="hsl(38, 92%, 55%)"),
    Category(id="cat-4", name="Lighting & Decor", color="hsl(0, 72%, 55%)"),
    Category(id="cat-5", name="Party & Events", color="hsl(262, 60%, 60%)"),
    Category(id="cat-6", name="Stationery & Craft", color="hsl(158, 64%, 48%)"),
]

SUPPLIERS: List[Supplier] = [
    Supplier(id="sup-1", name="Heritage Goods UK Ltd", leadTimeDays=4, reliability=94, contactEmail="orders@heritagegoods.co.uk"),
    Supplier(id="sup-2", name="Metro Distributors", leadTimeDays=3, reliability=90, contactEmail="supply@metrodist.in"),
    Supplier(id="sup-3", name="Craftsman Wholesale", leadTimeDays=6, reliability=88, contactEmail="contact@craftsmanws.com"),
    Supplier(id="sup-4", name="Global Home Essentials", leadTimeDays=5, reliability=92, contactEmail="sales@globalhome.co.uk"),
    Supplier(id="sup-5", name="Premier Packaging & Gifts", leadTimeDays=7, reliability=86, contactEmail="orders@premierpkg.com"),
]

class ProductService:
    def __init__(self, data_path: Path = settings.PROCESSED_DATA_PATH):
        self.data_path = data_path
        self._products_cache: Optional[List[Product]] = None
        self._products_map: Dict[str, Product] = {}
        self._load()

    def _load(self):
        df = None
        if self.data_path.exists():
            try:
                df = pd.read_parquet(self.data_path)
            except Exception as e:
                import logging
                logging.getLogger("product_service").warning(f"Could not load parquet dataset: {e}")

        products = []
        if df is not None and not df.empty:
            sku_groups = df.groupby("sku")
            for i, (sku, group) in enumerate(sku_groups):
                desc = str(group["description"].iloc[-1]).title()
                avg_demand = round(float(group["quantity"].mean()), 1)
                unit_price = round(float(group["unit_price"].iloc[-1]) * 100, 2)  # In INR equivalent for SaaS display
                if unit_price <= 0:
                    unit_price = 150.0
                cost_price = round(unit_price * 0.65, 2)

                # Assign categorical buckets deterministically
                cat = CATEGORIES[i % len(CATEGORIES)]
                sup = SUPPLIERS[i % len(SUPPLIERS)]

                lead_time = sup.leadTimeDays
                safety_stock = int(max(10, round(avg_demand * 1.5)))
                reorder_point = int(round(avg_demand * lead_time)) + safety_stock
                target_stock = int(reorder_point * 2.2)

                # Determine illustrative current stock level with realistic variety
                if i % 7 == 0:
                    current_stock = int(reorder_point * 0.3)  # Critical
                elif i % 4 == 0:
                    current_stock = int(reorder_point * 0.8)  # Low stock
                elif i % 15 == 0:
                    current_stock = 0  # Out of stock
                else:
                    current_stock = int(reorder_point * 1.8)  # In stock

                if current_stock <= 0:
                    status: StockStatus = "out-of-stock"
                elif current_stock <= reorder_point * 0.5:
                    status = "critical"
                elif current_stock <= reorder_point:
                    status = "low-stock"
                else:
                    status = "in-stock"

                product = Product(
                    id=str(sku),
                    name=desc,
                    sku=str(sku),
                    categoryId=cat.id,
                    supplierId=sup.id,
                    price=unit_price,
                    costPrice=cost_price,
                    currentStock=current_stock,
                    reorderPoint=reorder_point,
                    targetStockLevel=target_stock,
                    safetyStock=safety_stock,
                    averageDailyDemand=avg_demand,
                    unit="pcs",
                    status=status,
                    createdAt="2010-12-01T00:00:00Z",
                )
                products.append(product)

        if not products:
            for i in range(25):
                sku = f"SKU-{22400 + i}"
                cat = CATEGORIES[i % len(CATEGORIES)]
                sup = SUPPLIERS[i % len(SUPPLIERS)]
                avg_demand = round(12.0 + (i * 2.5), 1)
                unit_price = round(150.0 + (i * 45.0), 2)
                cost_price = round(unit_price * 0.65, 2)
                lead_time = sup.leadTimeDays
                safety_stock = int(max(10, round(avg_demand * 1.5)))
                reorder_point = int(round(avg_demand * lead_time)) + safety_stock
                target_stock = int(reorder_point * 2.2)
                current_stock = int(reorder_point * 1.2) if i % 4 != 0 else int(reorder_point * 0.4)
                status: StockStatus = "in-stock" if current_stock > reorder_point else ("critical" if current_stock < reorder_point * 0.5 else "low-stock")
                product = Product(
                    id=str(sku),
                    name=f"Premium Retail Item {sku}",
                    sku=str(sku),
                    categoryId=cat.id,
                    supplierId=sup.id,
                    price=unit_price,
                    costPrice=cost_price,
                    currentStock=current_stock,
                    reorderPoint=reorder_point,
                    targetStockLevel=target_stock,
                    safetyStock=safety_stock,
                    averageDailyDemand=avg_demand,
                    unit="pcs",
                    status=status,
                    createdAt="2010-12-01T00:00:00Z",
                )
                products.append(product)

        # Sort by total volume / demand descending
        products.sort(key=lambda p: p.averageDailyDemand, reverse=True)
        self._products_cache = products
        self._products_map = {p.id: p for p in products}

    def get_all(self) -> List[Product]:
        if self._products_cache is None:
            self._load()
        return self._products_cache or []

    def get_by_id(self, product_id: str) -> Optional[Product]:
        if not self._products_map:
            self._load()
        if product_id in self._products_map:
            return self._products_map[product_id]

        p = self.get_by_sku(product_id)
        if p:
            return p

        pid_str = str(product_id).lower()
        if pid_str.startswith("prod-"):
            try:
                num = int(pid_str.replace("prod-", "").lstrip("0") or "1")
                all_p = self.get_all()
                if all_p:
                    idx = (num - 1) % len(all_p)
                    return all_p[idx]
            except Exception:
                pass
        return None

    def get_by_sku(self, sku: str) -> Optional[Product]:
        for p in self.get_all():
            if p.sku.lower() == str(sku).lower() or p.id.lower() == str(sku).lower():
                return p
        return None


    def get_categories(self) -> List[Category]:
        return CATEGORIES

    def get_suppliers(self) -> List[Supplier]:
        return SUPPLIERS


product_service = ProductService()
