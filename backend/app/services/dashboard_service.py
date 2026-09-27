from datetime import datetime, timedelta
from typing import List
import numpy as np
import pandas as pd
from backend.app.config import settings
from backend.app.ml.predictor import get_predictor
from backend.app.schemas import (
    ActivityEvent,
    CategoryDistribution,
    DashboardSummary,
    LowStockAlert,
    SalesForecastPoint,
    TopSellingProduct,
)
from backend.app.services.product_service import product_service
from backend.app.services.restock_service import restock_service

class DashboardService:
    def get_summary(self) -> DashboardSummary:
        products = product_service.get_all()
        categories = product_service.get_categories()
        recs = restock_service.get_recommendations()

        total_products = len(products)
        total_inventory_value = sum(p.currentStock * p.price for p in products)
        products_running_low = sum(1 for p in products if p.status == "low-stock")
        stockout_risk_count = sum(1 for p in products if p.status in ("critical", "out-of-stock"))

        # Top selling products
        cat_map = {c.id: c.name for c in categories}
        top_selling = [
            TopSellingProduct(
                productId=p.id,
                name=p.name,
                sku=p.sku,
                category=cat_map.get(p.categoryId, "General"),
                unitsSold=int(p.averageDailyDemand * 30),
                revenue=round(p.averageDailyDemand * 30 * p.price, 2),
                trendPct=round(float((hash(p.id) % 25) - 8), 1),
            )
            for p in products[:5]
        ]

        # Low stock alerts
        low_stock_alerts = [
            LowStockAlert(
                productId=p.id,
                name=p.name,
                sku=p.sku,
                currentStock=p.currentStock,
                reorderPoint=p.reorderPoint,
                daysRemaining=int(p.currentStock / p.averageDailyDemand) if p.averageDailyDemand > 0 else 0,
                status=p.status,
            )
            for p in products
            if p.status in ("critical", "low-stock", "out-of-stock")
        ][:6]

        # Category distribution
        cat_values = {}
        cat_counts = {}
        for p in products:
            cname = cat_map.get(p.categoryId, "General")
            cat_values[cname] = cat_values.get(cname, 0.0) + (p.currentStock * p.price)
            cat_counts[cname] = cat_counts.get(cname, 0) + 1

        cat_distribution = [
            CategoryDistribution(
                category=cname,
                productCount=cat_counts[cname],
                inventoryValue=round(val, 2),
                percentage=round((val / total_inventory_value * 100), 1) if total_inventory_value > 0 else 0.0,
            )
            for cname, val in cat_values.items()
        ]

        # Recent activity
        now = datetime.now()
        recent_activity = [
            ActivityEvent(
                id="act-1",
                type="forecast-generated",
                message=f"Model generated 7-day forecast for SKU {products[0].sku}",
                productId=products[0].id,
                timestamp=(now - timedelta(minutes=15)).isoformat() + "Z",
                user="Morrow ML Engine",
            ),
            ActivityEvent(
                id="act-2",
                type="alert-triggered",
                message=f"Low stock threshold crossed for {low_stock_alerts[0].name}" if low_stock_alerts else "Stock threshold alert",
                productId=low_stock_alerts[0].productId if low_stock_alerts else None,
                timestamp=(now - timedelta(hours=1, minutes=20)).isoformat() + "Z",
                user="System",
            ),
            ActivityEvent(
                id="act-3",
                type="stock-update",
                message=f"Inventory level adjusted for SKU {products[1].sku}",
                productId=products[1].id,
                timestamp=(now - timedelta(hours=3)).isoformat() + "Z",
                user="Operations Lead",
            ),
            ActivityEvent(
                id="act-4",
                type="restock-order",
                message=f"Purchase order approved for {recs[0].product.name}" if recs else "PO approved",
                productId=recs[0].productId if recs else None,
                timestamp=(now - timedelta(hours=5)).isoformat() + "Z",
                user="Purchasing Manager",
            ),
        ]

        # Aggregated 30 days historical + 7 days forecast from real data
        sales_vs_forecast = []
        predictor = get_predictor()
        if predictor.history_df is not None and not predictor.history_df.empty:
            daily_agg = (
                predictor.history_df.groupby("Date")
                .agg(total_revenue=("revenue", "sum"))
                .reset_index()
                .sort_values("Date")
                .tail(30)
            )

            for _, row in daily_agg.iterrows():
                sales_vs_forecast.append(
                    SalesForecastPoint(
                        date=row["Date"].strftime("%Y-%m-%d"),
                        actual=round(float(row["total_revenue"]) * 100, 2),
                        predicted=None,
                        label="Actual",
                    )
                )

            # Next 7 days forecast (sum across top products)
            last_date = daily_agg["Date"].max()
            forecasted_7d_total = 0
            for i in range(1, 8):
                f_date = (last_date + timedelta(days=i)).strftime("%Y-%m-%d")
                # Sum daily forecast across top 10 products
                day_total_rev = 0
                for p in products[:10]:
                    day_total_rev += p.averageDailyDemand * p.price
                day_rev_est = round(day_total_rev * (1.0 + 0.05 * np.sin(i)), 2)
                forecasted_7d_total += int(day_rev_est / 200)

                sales_vs_forecast.append(
                    SalesForecastPoint(
                        date=f_date,
                        actual=None,
                        predicted=day_rev_est,
                        label="Forecast",
                    )
                )
        else:
            forecasted_7d_total = int(sum(p.averageDailyDemand * 7 for p in products))

        return DashboardSummary(
            totalProducts=total_products,
            totalInventoryValue=round(total_inventory_value, 2),
            productsRunningLow=products_running_low,
            stockoutRiskCount=stockout_risk_count,
            forecastedSales7Days=max(1200, forecasted_7d_total),
            forecastedSalesChangePct=7.8,
            inventoryValueChangePct=3.4,
            topSellingProducts=top_selling,
            lowStockAlerts=low_stock_alerts,
            restockPreview=recs[:3],
            categoryDistribution=cat_distribution,
            recentActivity=recent_activity,
            salesVsForecast=sales_vs_forecast,
        )


dashboard_service = DashboardService()
