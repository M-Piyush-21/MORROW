from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

StockStatus = Literal["in-stock", "low-stock", "critical", "out-of-stock"]
Priority = Literal["high", "medium", "low"]


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    environment: str
    modelLoaded: bool
    datasetLoaded: bool


class Category(BaseModel):
    id: str
    name: str
    color: str


class Supplier(BaseModel):
    id: str
    name: str
    leadTimeDays: int
    reliability: int
    contactEmail: str


class Product(BaseModel):
    id: str
    name: str
    sku: str
    categoryId: str
    supplierId: str
    price: float
    costPrice: float
    currentStock: int
    reorderPoint: int
    targetStockLevel: int
    safetyStock: int
    averageDailyDemand: float
    unit: str
    status: StockStatus
    createdAt: str


class DailySales(BaseModel):
    productId: str
    date: str
    quantity: int
    revenue: float


class ForecastPoint(BaseModel):
    date: str
    actual: Optional[float] = None
    predicted: Optional[float] = None
    lowerBound: Optional[float] = None
    upperBound: Optional[float] = None


class DemandForecast(BaseModel):
    productId: str
    horizon: int
    points: List[ForecastPoint]
    expectedTotalDemand: float
    averageDailyForecast: float
    uncertainty: float
    generatedAt: str
    isDemo: bool = False


class RestockRecommendation(BaseModel):
    productId: str
    product: Product
    currentStock: int
    forecastDemandDuringLeadTime: int
    safetyStock: int
    reorderPoint: int
    recommendedOrderQuantity: int
    supplierLeadTime: int
    priority: Priority
    reason: str
    estimatedStockoutDate: Optional[str] = None
    daysUntilStockout: Optional[int] = None


class TopSellingProduct(BaseModel):
    productId: str
    name: str
    sku: str
    category: str
    unitsSold: int
    revenue: float
    trendPct: float


class LowStockAlert(BaseModel):
    productId: str
    name: str
    sku: str
    currentStock: int
    reorderPoint: int
    daysRemaining: int
    status: StockStatus


class CategoryDistribution(BaseModel):
    category: str
    productCount: int
    inventoryValue: float
    percentage: float


class ActivityEvent(BaseModel):
    id: str
    type: str
    message: str
    productId: Optional[str] = None
    timestamp: str
    user: str


class SalesForecastPoint(BaseModel):
    date: str
    actual: Optional[float] = None
    predicted: Optional[float] = None
    label: Optional[str] = None


class DashboardSummary(BaseModel):
    totalProducts: int
    totalInventoryValue: float
    productsRunningLow: int
    stockoutRiskCount: int
    forecastedSales7Days: int
    forecastedSalesChangePct: float
    inventoryValueChangePct: float
    topSellingProducts: List[TopSellingProduct]
    lowStockAlerts: List[LowStockAlert]
    restockPreview: List[RestockRecommendation]
    categoryDistribution: List[CategoryDistribution]
    recentActivity: List[ActivityEvent]
    salesVsForecast: List[SalesForecastPoint]


class ModelMetrics(BaseModel):
    modelName: str
    modelVersion: str
    lastTrainedAt: str
    status: Literal["registered", "staging", "archived"]
    mae: float
    rmse: float
    mape: float
    r2Score: float


class ModelComparisonRow(BaseModel):
    modelName: str
    mae: float
    rmse: float
    mape: float
    r2Score: float
    trainingTime: float
    status: Literal["baseline", "experiment", "production"]


class ExperimentRun(BaseModel):
    id: str
    experimentName: str
    modelName: str
    parameters: Dict[str, Any]
    metrics: Dict[str, float]
    status: str
    startedAt: str
    duration: float


class ModelVersion(BaseModel):
    version: str
    registeredAt: str
    status: Literal["production", "staging", "archived"]
    metrics: Dict[str, float]


class ActualVsPredictedPoint(BaseModel):
    date: str
    actual: Optional[float] = None
    predicted: Optional[float] = None
