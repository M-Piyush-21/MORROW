from datetime import datetime, timedelta
from typing import List
from backend.app.schemas import RestockRecommendation, Priority
from backend.app.services.product_service import product_service

class RestockService:
    def get_recommendations(self) -> List[RestockRecommendation]:
        products = product_service.get_all()
        recommendations = []

        now = datetime.now()

        for p in products:
            # Sourced supplier lead time
            sup = next((s for s in product_service.get_suppliers() if s.id == p.supplierId), None)
            lead_time = sup.leadTimeDays if sup else 4

            # Forecast demand during supplier lead time
            demand_during_lead_time = int(round(p.averageDailyDemand * lead_time))
            safety_stock = p.safetyStock
            reorder_point = demand_during_lead_time + safety_stock

            # Recommended order quantity
            recommended_qty = max(0, p.targetStockLevel - p.currentStock)

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
            elif p.status == "low-stock":
                priority: Priority = "medium"
            else:
                priority: Priority = "low"

            # Rationale
            if p.status == "out-of-stock":
                reason = "Inventory exhausted. Urgent replenishment order required."
            elif p.status == "critical":
                reason = f"Critical inventory level. Estimated {days_until_stockout} days before full stockout."
            elif p.status == "low-stock":
                reason = f"Stock is below reorder point ({reorder_point} units). Restock to maintain safety stock buffer."
            else:
                reason = "Stock levels are healthy; order recommended for upcoming sales cycle."

            rec = RestockRecommendation(
                productId=p.id,
                product=p,
                currentStock=p.currentStock,
                forecastDemandDuringLeadTime=demand_during_lead_time,
                safetyStock=safety_stock,
                reorderPoint=reorder_point,
                recommendedOrderQuantity=recommended_qty,
                supplierLeadTime=lead_time,
                priority=priority,
                reason=reason,
                estimatedStockoutDate=stockout_date,
                daysUntilStockout=days_until_stockout,
            )
            recommendations.append(rec)

        # Sort: high priority first, then medium, then low
        priority_weights = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda r: (priority_weights[r.priority], -r.recommendedOrderQuantity))
        return recommendations


restock_service = RestockService()
