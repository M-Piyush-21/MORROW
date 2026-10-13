from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict

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


class PredictionIntervalCalibration(BaseModel):
    nominalConfidencePct: float = 80.0
    empiricalCoveragePct: float = 75.8
    meanIntervalWidth: float = 108.4
    calibrationStatus: str = "calibrated_and_tested"
    calibrationNote: Optional[str] = "Intervals calibrated on validation residual empirical quantiles [10%, 90%]."


class DemandForecast(BaseModel):
    productId: str
    horizon: int
    points: List[ForecastPoint]
    expectedTotalDemand: float
    averageDailyForecast: float
    uncertainty: float
    predictionIntervalCoverage: Optional[PredictionIntervalCalibration] = None
    generatedAt: str
    isDemo: bool = False


class ReplenishmentCalculationBreakdown(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    forecastDailyDemand: float = Field(validation_alias="forecast_daily_demand")
    leadTimeDays: int = Field(validation_alias="lead_time_days")
    leadTimeDemand: float = Field(validation_alias="lead_time_demand")
    serviceLevelTarget: float = Field(validation_alias="service_level_target")
    zScore: float = Field(validation_alias="z_score")
    safetyStockMethod: str = Field(validation_alias="safety_stock_method")
    safetyStock: int = Field(validation_alias="safety_stock")
    reorderPoint: int = Field(validation_alias="reorder_point")
    currentStock: int = Field(validation_alias="current_stock")
    inTransitStock: int = Field(validation_alias="in_transit_stock")
    inventoryPosition: int = Field(validation_alias="inventory_position")
    targetStockLevel: int = Field(validation_alias="target_stock_level")
    unconstrainedOrderQuantity: int = Field(validation_alias="unconstrained_order_quantity")
    recommendedOrderQuantity: int = Field(validation_alias="recommended_order_quantity")
    moq: int
    packSize: int = Field(validation_alias="pack_size")
    maxCapacity: int = Field(validation_alias="max_capacity")
    isSupplierOrderDay: bool = Field(default=True, validation_alias="is_supplier_order_day")
    daysUntilNextOrderDay: int = Field(default=0, validation_alias="days_until_next_order_day")


class DecisionConstraints(BaseModel):
    moq: int = 15
    batchSize: int = 5
    packSize: int = 5
    maxCapacity: int = 500
    moqTriggered: bool = False
    batchRoundingApplied: bool = False
    maxCapacityCapped: bool = False
    orderDayDelayed: bool = False
    daysUntilNextOrder: int = 0


class RestockRecommendation(BaseModel):
    productId: str
    product: Product
    currentStock: int
    inTransitStock: int = 0
    inventoryPosition: int = 0
    averageDailyDemand: float = 0.0
    forecastDemandDuringLeadTime: int
    safetyStock: int
    reorderPoint: int
    targetStockLevel: int = 100
    recommendedOrderQuantity: int
    unconstrainedOrderQuantity: int = 0
    supplierLeadTime: int
    priority: Priority
    reason: str
    shouldReorder: bool = True
    estimatedStockoutDate: Optional[str] = None
    daysUntilStockout: Optional[int] = None
    constraints: Optional[DecisionConstraints] = None
    calculationBreakdown: Optional[ReplenishmentCalculationBreakdown] = None
    isSyntheticInventory: bool = True
    inventoryDataSource: str = "Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)"
    problemStatement: Optional[str] = (
        "Reduce avoidable retail stockouts and costly excess inventory while optimally balancing "
        "service level (fill rate), inventory holding cost, and supplier ordering costs under lead-time uncertainty."
    )


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
    problemStatement: Optional[str] = (
        "Reduce avoidable retail stockouts and costly excess inventory while optimally balancing "
        "service level (fill rate), inventory holding cost, and supplier ordering costs."
    )


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


# ─── Simulation / Backtest Schemas ──────────────────────────────────────────

class SimulationScenarioInputs(BaseModel):
    holdingCostAnnualRate: float = 0.20
    dailyHoldingRate: float = 0.000548
    orderingCostPerOrder: float = 40.0
    stockoutPenaltyPerUnit: float = 5.0
    leadTimeDays: int = 4
    serviceFactorZ: float = 1.65
    moq: int = 15
    batchSize: int = 5
    isScenarioAssumption: bool = True
    disclaimer: str = (
        "Cost parameters are configurable scenario inputs (assumptions) for planning and comparison, "
        "not audited historical business facts."
    )


class SimulationServiceLevel(BaseModel):
    fillRate: float
    cycleServiceLevel: float


class SimulationCosts(BaseModel):
    holdingCost: float
    orderingCost: float
    stockoutPenaltyCost: float
    totalCost: float


class SimulationPolicyResult(BaseModel):
    policyName: str
    simulatedStockoutDays: int
    stockoutDayRatePct: float
    unitsShort: int
    excessInventoryUnits: int
    averageInventoryValue: float
    orderFrequency: int
    serviceLevel: SimulationServiceLevel
    costs: SimulationCosts
    totalCost: float


class SimulationComparisonSummary(BaseModel):
    stockoutDaysReductionPct: float
    unitsShortReductionPct: float
    excessInventoryReductionPct: float
    holdingCostSavingsPct: float
    totalCostSavingsPct: float
    serviceLevelImprovementPct: float


class InventorySimulationResponse(BaseModel):
    problemStatement: str
    scenarioInputs: SimulationScenarioInputs
    backtestPeriod: Dict[str, Any]
    comparison: SimulationComparisonSummary
    policies: Dict[str, SimulationPolicyResult]


class InventorySimulationRequest(BaseModel):
    holdingCostAnnualRate: Optional[float] = 0.20
    orderingCostPerOrder: Optional[float] = 40.0
    stockoutPenaltyPerUnit: Optional[float] = 5.0
    leadTimeDays: Optional[int] = 4
    serviceFactorZ: Optional[float] = 1.65
    moq: Optional[int] = 15
    batchSize: Optional[int] = 5
    skusLimit: Optional[int] = None


# ─── Enhanced Evaluation Schemas ───────────────────────────────────────────

class MetricExplanation(BaseModel):
    name: str
    unit: str
    retailMeaning: str


class HorizonMetric(BaseModel):
    horizonDays: int
    skusEvaluated: int
    rfModel: Dict[str, float]
    naiveBaseline: Dict[str, float]
    wapeImprovementPct: float


class SegmentMetric(BaseModel):
    skuCount: int
    totalDemand: int
    mae: float
    rmse: float
    wape: float


class ComprehensiveEvaluationResponse(BaseModel):
    problemStatement: str
    runMetadata: Dict[str, Any]
    dataset: str
    zeroDemandDayPercentage: float
    models: Dict[str, Any]
    predictionIntervalCalibration: Dict[str, Any]
    metricExplanations: Dict[str, MetricExplanation]
    volumeSegments: Dict[str, SegmentMetric]
    intermittentVsRegular: Dict[str, Any]
    horizonEvaluation: Dict[str, HorizonMetric]


# ─── Operational MLOps & Monitoring Schemas (P1) ───────────────────────────

class PromotionGateEvaluation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    gateId: str = Field(validation_alias="gate_id")
    description: str
    threshold: str
    actualValue: str = Field(validation_alias="actual_value")
    passed: bool
    justification: str


class ModelPromotionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    timestamp: str
    modelName: str = Field(default="RandomForestRegressor", validation_alias="model_name")
    candidateVersion: str = Field(default="v1.2.0", validation_alias="candidate_version")
    decision: str
    reason: str
    overallVerdict: bool = Field(validation_alias="overall_verdict")
    gatesEvaluated: List[PromotionGateEvaluation] = Field(validation_alias="gates_evaluated")
    summaryMetrics: Dict[str, Any] = Field(validation_alias="summary_metrics")
    mlflowRegistration: Dict[str, Any] = Field(validation_alias="mlflow_registration")
    rollbackTarget: Optional[Dict[str, Any]] = Field(default=None, validation_alias="rollback_target")


class ModelRollbackResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    status: str
    action: str
    timestamp: str
    restoredBackup: str = Field(validation_alias="restored_backup")
    activeModelPath: str = Field(validation_alias="active_model_path")
    reason: str
    restoredVersion: str = Field(validation_alias="restored_version")


class DataQualityAuditResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    timestamp: str
    status: str
    totalRecordsAudited: int = Field(validation_alias="total_records_audited")
    modeledSkuCount: int = Field(validation_alias="modeled_sku_count")
    dateRange: Dict[str, Any] = Field(validation_alias="date_range")
    integrityMetrics: Dict[str, Any] = Field(validation_alias="integrity_metrics")
    spikeDetection: Dict[str, Any] = Field(validation_alias="spike_detection")
    criticalIssuesCount: int = Field(validation_alias="critical_issues_count")
    criticalIssues: List[str] = Field(validation_alias="critical_issues")
    warningIssues: List[str] = Field(validation_alias="warning_issues")


class FeatureDriftMetric(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    featureName: str = Field(validation_alias="feature_name")
    psi: float
    status: str
    interpretation: str
    baselineMean: float = Field(validation_alias="baseline_mean")
    targetMean: float = Field(validation_alias="target_mean")
    baselineStd: float = Field(validation_alias="baseline_std")
    targetStd: float = Field(validation_alias="target_std")
    binDetails: Optional[List[Dict[str, Any]]] = Field(default=[], validation_alias="bin_details")


class FeatureDriftResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    timestamp: str
    method: str
    overallStatus: str = Field(validation_alias="overall_status")
    averageFeaturePsi: float = Field(validation_alias="average_feature_psi")
    thresholds: Dict[str, float]
    windows: Dict[str, Any]
    featuresEvaluatedCount: int = Field(validation_alias="features_evaluated_count")
    featuresInDrift: List[str] = Field(validation_alias="features_in_drift")
    featuresInWarning: List[str] = Field(validation_alias="features_in_warning")
    featureMetrics: Dict[str, Dict[str, Any]] = Field(validation_alias="feature_metrics")
    operationalGuidance: Dict[str, Any] = Field(validation_alias="operational_guidance")


class PerformanceMonitoringResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    timestamp: str
    modelPath: str = Field(validation_alias="model_path")
    evaluationPeriod: Dict[str, Any] = Field(validation_alias="evaluation_period")
    overallTestWape: float = Field(validation_alias="overall_test_wape")
    overallTestMae: float = Field(validation_alias="overall_test_mae")
    rollingWindowPerformance: List[Dict[str, Any]] = Field(validation_alias="rolling_window_performance")
    totalSkusMonitored: int = Field(validation_alias="total_skus_monitored")
    highErrorSkusCount: int = Field(validation_alias="high_error_skus_count")
    topChallengingSkus: List[Dict[str, Any]] = Field(validation_alias="top_challenging_skus")
    topPerformingSkus: List[Dict[str, Any]] = Field(validation_alias="top_performing_skus")


class ServiceMonitoringResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    timestamp: str
    uptimeSeconds: float = Field(validation_alias="uptime_seconds")
    serviceStatus: str = Field(validation_alias="service_status")
    requestMetrics: Dict[str, Any] = Field(validation_alias="request_metrics")
    latencyMs: Dict[str, Any] = Field(validation_alias="latency_ms")
    modelHealth: Dict[str, Any] = Field(validation_alias="model_health")
    systemResources: Dict[str, Any] = Field(validation_alias="system_resources")
    topEndpoints: List[Dict[str, Any]] = Field(validation_alias="top_endpoints")


class OperationalAlert(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    alertId: str = Field(validation_alias="alert_id")
    timestamp: str
    category: str
    severity: Literal["INFO", "WARNING", "CRITICAL"]
    whatChanged: str = Field(validation_alias="what_changed")
    affectedEntities: List[str] = Field(validation_alias="affected_entities")
    recommendedAction: str = Field(validation_alias="recommended_action")
    status: str


class AlertsListResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    timestamp: str
    totalAlerts: int = Field(validation_alias="total_alerts")
    alerts: List[OperationalAlert]


class FeedbackSubmissionRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    sku: str
    modelVersion: str = Field(default="v1.2.0", validation_alias="model_version")
    forecastQuantity: float = Field(validation_alias="forecast_quantity")
    recommendedOrderQuantity: int = Field(validation_alias="recommended_order_quantity")
    assumedCurrentStock: int = Field(validation_alias="assumed_current_stock")
    forecastHorizonDays: int = Field(default=7, validation_alias="forecast_horizon_days")
    reorderPoint: int = Field(default=50, validation_alias="reorder_point")
    safetyStock: int = Field(default=20, validation_alias="safety_stock")
    supplierLeadTime: int = Field(default=4, validation_alias="supplier_lead_time")
    eventualActualDemand: Optional[float] = Field(default=None, validation_alias="eventual_actual_demand")
    eventualStockoutOccurred: Optional[bool] = Field(default=None, validation_alias="eventual_stockout_occurred")
    notes: Optional[str] = None


class FeedbackLogEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    feedbackId: str = Field(validation_alias="feedback_id")
    forecastTimestamp: str = Field(validation_alias="forecast_timestamp")
    modelVersion: str = Field(validation_alias="model_version")
    sku: str
    forecastHorizonDays: int = Field(validation_alias="forecast_horizon_days")
    forecastQuantity: float = Field(validation_alias="forecast_quantity")
    recommendedOrderQuantity: int = Field(validation_alias="recommended_order_quantity")
    assumedCurrentStock: int = Field(validation_alias="assumed_current_stock")
    reorderPoint: int = Field(validation_alias="reorder_point")
    safetyStock: int = Field(validation_alias="safety_stock")
    supplierLeadTime: int = Field(validation_alias="supplier_lead_time")
    eventualActualDemand: Optional[float] = Field(default=None, validation_alias="eventual_actual_demand")
    eventualStockoutOccurred: Optional[bool] = Field(default=None, validation_alias="eventual_stockout_occurred")
    outcomeError: Optional[float] = Field(default=None, validation_alias="outcome_error")
    notes: Optional[str] = None
    loggedAt: str = Field(validation_alias="logged_at")


class ReplenishmentEvaluationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    sku: str = "22423"
    forecastDailyDemand: float = Field(default=12.5, validation_alias="forecast_daily_demand", ge=0.0)
    leadTimeDays: int = Field(default=4, validation_alias="lead_time_days", ge=1)
    currentStock: int = Field(default=25, validation_alias="current_stock", ge=0)
    inTransitStock: int = Field(default=0, validation_alias="in_transit_stock", ge=0)
    serviceLevel: float = Field(default=0.95, validation_alias="service_level", ge=0.5, le=0.999)
    safetyStockOverride: Optional[int] = Field(default=None, validation_alias="safety_stock_override")
    targetStockLevel: Optional[int] = Field(default=None, validation_alias="target_stock_level")
    targetDaysOfSupply: Optional[int] = Field(default=None, validation_alias="target_days_of_supply")
    moq: int = Field(default=10, ge=1)
    packSize: int = Field(default=5, validation_alias="pack_size", ge=1)
    supplierOrderDays: Optional[List[int]] = Field(default=None, validation_alias="supplier_order_days")
    currentDayOfWeek: Optional[int] = Field(default=None, validation_alias="current_day_of_week")
    maxCapacity: int = Field(default=500, validation_alias="max_capacity", ge=10)


class ReplenishmentEvaluationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    sku: str
    currentStock: int = Field(validation_alias="current_stock")
    inTransitStock: int = Field(validation_alias="in_transit_stock")
    inventoryPosition: int = Field(validation_alias="inventory_position")
    leadTimeDays: int = Field(validation_alias="lead_time_days")
    forecastDemandDuringLeadTime: float = Field(validation_alias="forecast_demand_during_lead_time")
    safetyStock: int = Field(validation_alias="safety_stock")
    reorderPoint: int = Field(validation_alias="reorder_point")
    targetStockLevel: int = Field(validation_alias="target_stock_level")
    moq: int
    packSize: int = Field(validation_alias="batch_size")
    maxCapacity: int = Field(validation_alias="max_capacity")
    shouldReorder: bool = Field(validation_alias="should_reorder")
    recommendedOrderQuantity: int = Field(validation_alias="recommended_order_quantity")
    unconstrainedOrderQuantity: int = Field(validation_alias="unconstrained_order_quantity")
    reason: str
    constraintsApplied: Dict[str, Any] = Field(validation_alias="constraints_applied")
    breakdown: Optional[ReplenishmentCalculationBreakdown] = None
    isSyntheticInventory: bool = Field(default=True, validation_alias="is_synthetic_inventory")
    inventorySource: str = Field(
        default="Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)",
        validation_alias="inventory_source"
    )


class ReplenishmentScenarioItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    scenarioId: str = Field(validation_alias="scenario_id")
    scenarioName: str = Field(validation_alias="scenario_name")
    description: str
    leadTimeDays: int = Field(validation_alias="lead_time_days")
    leadTimeDelta: int = Field(validation_alias="lead_time_delta")
    forecastDailyDemand: float = Field(validation_alias="forecast_daily_demand")
    demandMultiplier: float = Field(validation_alias="demand_multiplier")
    serviceLevel: float = Field(validation_alias="service_level")
    safetyStock: int = Field(validation_alias="safety_stock")
    reorderPoint: int = Field(validation_alias="reorder_point")
    shouldReorder: bool = Field(validation_alias="should_reorder")
    orderQuantity: int = Field(validation_alias="order_quantity")
    stockoutRisk: str = Field(validation_alias="stockout_risk")


class ReplenishmentScenariosResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    sku: str
    scenarios: List[ReplenishmentScenarioItem]
    isSyntheticInventory: bool = Field(default=True, validation_alias="is_synthetic_inventory")
    inventorySource: str = Field(
        default="Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)",
        validation_alias="inventory_source"
    )


class PolicyComparisonProfile(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    policyName: str = Field(validation_alias="policy_name")
    targetServiceLevel: str = Field(validation_alias="target_service_level")
    safetyStockUnits: int = Field(validation_alias="safety_stock_units")
    reorderPoint: int = Field(validation_alias="reorder_point")
    targetStockLevel: int = Field(validation_alias="target_stock_level")
    recommendedOrderQuantity: int = Field(validation_alias="recommended_order_quantity")
    shouldReorder: bool = Field(validation_alias="should_reorder")
    averageInventoryUnits: float = Field(validation_alias="average_inventory_units")
    averageInventoryValue: float = Field(validation_alias="average_inventory_value")
    estimatedAnnualHoldingCost: float = Field(validation_alias="estimated_annual_holding_cost")
    estimatedAnnualOrderingCost: float = Field(validation_alias="estimated_annual_ordering_cost")
    totalEstimatedCost: float = Field(validation_alias="total_estimated_cost")
    simulatedStockoutRisk: str = Field(validation_alias="simulated_stockout_risk")
    orderFrequencyPerYear: float = Field(validation_alias="order_frequency_per_year")
    recommendedUseCase: str = Field(validation_alias="recommended_use_case")


class PolicyTradeoffResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    sku: str
    forecastDailyDemand: float = Field(validation_alias="forecast_daily_demand")
    leadTimeDays: int = Field(validation_alias="lead_time_days")
    currentStock: int = Field(validation_alias="current_stock")
    isSyntheticInventory: bool = Field(default=True, validation_alias="is_synthetic_inventory")
    inventorySource: str = Field(
        default="Synthetic Scenario Input (Demo - Not connected to live warehouse WMS)",
        validation_alias="inventory_source"
    )
    policies: Dict[str, PolicyComparisonProfile]
    tradeoffSummary: str = Field(validation_alias="tradeoff_summary")


class ModelInfoResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    modelName: str = Field(validation_alias="model_name")
    modelVersion: str = Field(validation_alias="model_version")
    lastSuccessfulTrainingTime: str = Field(validation_alias="last_successful_training_time")
    status: str
    gitCommit: Optional[str] = Field(default=None, validation_alias="git_commit")
    evaluationSummary: Dict[str, Any] = Field(validation_alias="evaluation_summary")
    dataFreshness: Dict[str, Any] = Field(validation_alias="data_freshness")
    isSyntheticInventoryDemonstration: bool = Field(
        default=True,
        validation_alias="is_synthetic_inventory_demonstration"
    )


class ErrorDetailResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None




