// Core domain types for Morrow

export type StockStatus = 'in-stock' | 'low-stock' | 'critical' | 'out-of-stock';

export type Priority = 'high' | 'medium' | 'low';

export type CategoryName =
  | 'Beverages'
  | 'Snacks'
  | 'Packaged Goods'
  | 'Household'
  | 'Personal Care'
  | 'Dairy';

export interface Category {
  id: string;
  name: CategoryName;
  color: string; // chart color key
}

export interface Supplier {
  id: string;
  name: string;
  leadTimeDays: number;
  reliability: number; // 0-100
  contactEmail: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  supplierId: string;
  price: number; // selling price in INR
  costPrice: number; // cost price in INR
  currentStock: number;
  reorderPoint: number;
  targetStockLevel: number;
  safetyStock: number;
  averageDailyDemand: number;
  unit: string;
  status: StockStatus;
  createdAt: string;
}

export interface DailySales {
  productId: string;
  date: string; // ISO date string YYYY-MM-DD
  quantity: number;
  revenue: number;
}

export interface ForecastPoint {
  date: string;
  actual: number | null;
  predicted: number | null;
  lowerBound: number | null;
  upperBound: number | null;
}

export interface SalesForecastPoint {
  date: string;
  actual: number | null;
  predicted: number | null;
  label?: string;
}

export interface PredictionIntervalCalibration {
  nominalConfidencePct: number;
  empiricalCoveragePct: number;
  meanIntervalWidth: number;
  calibrationStatus: string;
  calibrationNote?: string;
}

export interface DemandForecast {
  productId: string;
  horizon: number;
  points: ForecastPoint[];
  expectedTotalDemand: number;
  averageDailyForecast: number;
  uncertainty: number; // standard deviation
  predictionIntervalCoverage?: PredictionIntervalCalibration;
  generatedAt: string;
  isDemo?: boolean;
}

export interface DecisionConstraints {
  moq: number;
  batchSize: number;
  packSize?: number;
  maxCapacity: number;
  moqTriggered: boolean;
  batchRoundingApplied: boolean;
  maxCapacityCapped: boolean;
  orderDayDelayed?: boolean;
  daysUntilNextOrder?: number;
}

export interface ReplenishmentCalculationBreakdown {
  forecastDailyDemand: number;
  leadTimeDays: number;
  leadTimeDemand: number;
  serviceLevelTarget: number;
  zScore: number;
  safetyStockMethod: string;
  safetyStock: number;
  reorderPoint: number;
  currentStock: number;
  inTransitStock: number;
  inventoryPosition: number;
  targetStockLevel: number;
  unconstrainedOrderQuantity: number;
  recommendedOrderQuantity: number;
  moq: number;
  packSize: number;
  maxCapacity: number;
  isSupplierOrderDay: boolean;
  daysUntilNextOrderDay: number;
}

export interface RestockRecommendation {
  productId: string;
  product: Product;
  currentStock: number;
  inTransitStock?: number;
  inventoryPosition?: number;
  averageDailyDemand?: number;
  forecastDemandDuringLeadTime: number;
  safetyStock: number;
  reorderPoint: number;
  targetStockLevel?: number;
  recommendedOrderQuantity: number;
  unconstrainedOrderQuantity?: number;
  supplierLeadTime: number;
  priority: Priority;
  reason: string;
  shouldReorder?: boolean;
  estimatedStockoutDate: string | null;
  daysUntilStockout: number | null;
  constraints?: DecisionConstraints;
  calculationBreakdown?: ReplenishmentCalculationBreakdown;
  isSyntheticInventory?: boolean;
  inventoryDataSource?: string;
  problemStatement?: string;
}

export interface DashboardSummary {
  totalProducts: number;
  totalInventoryValue: number;
  productsRunningLow: number;
  stockoutRiskCount: number;
  forecastedSales7Days: number;
  forecastedSalesChangePct: number;
  inventoryValueChangePct: number;
  topSellingProducts: TopSellingProduct[];
  lowStockAlerts: LowStockAlert[];
  restockPreview: RestockRecommendation[];
  categoryDistribution: CategoryDistribution[];
  recentActivity: ActivityEvent[];
  salesVsForecast: SalesForecastPoint[];
}

export interface TopSellingProduct {
  productId: string;
  name: string;
  sku: string;
  category: string;
  unitsSold: number;
  revenue: number;
  trendPct: number;
}

export interface LowStockAlert {
  productId: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderPoint: number;
  daysRemaining: number;
  status: StockStatus;
}

export interface CategoryDistribution {
  category: string;
  productCount: number;
  inventoryValue: number;
  percentage: number;
}

export type ActivityType = 'stock-update' | 'product-added' | 'restock-order' | 'forecast-generated' | 'alert-triggered';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  message: string;
  productId?: string;
  timestamp: string;
  user: string;
}

export interface ModelMetrics {
  modelName: string;
  modelVersion: string;
  lastTrainedAt: string;
  status: 'registered' | 'staging' | 'archived';
  mae: number;
  rmse: number;
  mape: number;
  r2Score: number;
}

export interface ModelComparisonRow {
  modelName: string;
  mae: number;
  rmse: number;
  mape: number;
  r2Score: number;
  trainingTime: number;
  status: 'baseline' | 'experiment' | 'production';
}

export interface ExperimentRun {
  id: string;
  experimentName: string;
  modelName: string;
  parameters: Record<string, string | number>;
  metrics: {
    mae: number;
    rmse: number;
    mape: number;
  };
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  duration: number;
}

export interface ModelVersion {
  version: string;
  registeredAt: string;
  status: 'production' | 'staging' | 'archived';
  metrics: { mae: number; rmse: number };
}

export interface ActualVsPredictedPoint {
  date: string;
  actual: number | null;
  predicted: number | null;
}

export interface Notification {
  id: string;
  type: 'warning' | 'info' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Settings {
  businessName: string;
  businessEmail: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  lowStockAlerts: boolean;
  stockoutAlerts: boolean;
  restockAlerts: boolean;
  defaultForecastHorizon: number;
  theme: 'light' | 'dark';
  apiConnected: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export type DateRangePreset = '7d' | '14d' | '30d' | '90d';

export interface DateRange {
  preset: DateRangePreset;
  start: string;
  end: string;
}

// ─── Inventory Simulation Types ───────────────────────────────────────────

export interface SimulationScenarioInputs {
  holdingCostAnnualRate: number;
  dailyHoldingRate: number;
  orderingCostPerOrder: number;
  stockoutPenaltyPerUnit: number;
  leadTimeDays: number;
  serviceFactorZ: number;
  moq: number;
  batchSize: number;
  isScenarioAssumption: boolean;
  disclaimer: string;
}

export interface SimulationCosts {
  holdingCost: number;
  orderingCost: number;
  stockoutPenaltyCost: number;
  totalCost: number;
}

export interface SimulationServiceLevel {
  fillRate: number;
  cycleServiceLevel: number;
}

export interface SimulationPolicyResult {
  policyName: string;
  policy_name?: string;
  simulatedStockoutDays: number;
  stockoutDayRatePct: number;
  unitsShort: number;
  excessInventoryUnits: number;
  averageInventoryValue: number;
  orderFrequency: number;
  serviceLevel: SimulationServiceLevel;
  costs: SimulationCosts;
  totalCost: number;
}

export interface SimulationComparisonSummary {
  stockoutDaysReductionPct: number;
  unitsShortReductionPct: number;
  excessInventoryReductionPct: number;
  holdingCostSavingsPct: number;
  totalCostSavingsPct: number;
  serviceLevelImprovementPct: number;
}

export interface InventorySimulationResponse {
  problemStatement: string;
  scenarioInputs: SimulationScenarioInputs;
  backtestPeriod: {
    start: string;
    end: string;
    totalDays: number;
    skuCount: number;
    totalDemandUnits: number;
  };
  comparison: SimulationComparisonSummary;
  policies: {
    morrow: SimulationPolicyResult;
    fixed_baseline: SimulationPolicyResult;
    seasonal_baseline: SimulationPolicyResult;
  };
}

// ─── Comprehensive Forecasting Evaluation Types ───────────────────────────

export interface MetricExplanation {
  name: string;
  unit: string;
  retailMeaning: string;
}

export interface HorizonMetric {
  horizonDays: number;
  skusEvaluated: number;
  rfModel: {
    mae: number;
    rmse: number;
    wape: number;
  };
  naiveBaseline: {
    mae: number;
    rmse: number;
    wape: number;
  };
  wapeImprovementPct: number;
}

export interface SegmentMetric {
  skuCount: number;
  totalDemand: number;
  mae: number;
  rmse: number;
  wape: number;
}

export interface ComprehensiveEvaluationResponse {
  problemStatement: string;
  runMetadata: {
    evaluation_date_range: { start: string; end: string };
    sku_coverage: { total_skus: number; regular_skus: number; intermittent_skus: number };
    data_version: string;
    feature_version: string;
    model_version: string;
    random_seed: number;
    run_timestamp: string;
  };
  dataset: string;
  zeroDemandDayPercentage: number;
  models: {
    random_forest: { mae: number; rmse: number; r2: number; wape: number; nonzero_mape?: number };
    naive_baseline: { mae: number; rmse: number; r2: number; wape: number; nonzero_mape?: number };
  };
  predictionIntervalCalibration: {
    nominal_coverage_pct: number;
    empirical_coverage_pct: number;
    mean_interval_width: number;
    calibration_source?: string;
    residual_lower_q10?: number;
    residual_upper_q90?: number;
    status: string;
  };
  metricExplanations: Record<string, MetricExplanation>;
  volumeSegments: Record<string, SegmentMetric>;
  intermittentVsRegular: {
    intermittent_segment: {
      sku_count: number;
      samples: number;
      zero_demand_day_pct: number;
      mae: number;
      rmse: number;
      wape: number;
      mape_note: string;
    };
    regular_segment: {
      sku_count: number;
      samples: number;
      zero_demand_day_pct: number;
      mae: number;
      rmse: number;
      wape: number;
      nonzero_mape: number;
    };
  };
  horizonEvaluation: Record<string, HorizonMetric>;
}

// ─── Operational MLOps & Monitoring Types (P1) ─────────────────────────────

export interface PromotionGateEvaluation {
  gateId: string;
  description: string;
  threshold: string;
  actualValue: string;
  passed: boolean;
  justification: string;
}

export interface ModelPromotionResponse {
  timestamp: string;
  modelName: string;
  candidateVersion: string;
  decision: 'APPROVED' | 'REJECTED' | 'APPROVED_OVERRIDE' | 'REJECTED_OVERRIDE' | string;
  reason: string;
  overallVerdict: boolean;
  gatesEvaluated: PromotionGateEvaluation[];
  summaryMetrics: {
    candidate_wape: number;
    baseline_wape: number;
    wape_lift_pct: number;
    candidate_mae: number;
    candidate_rmse: number;
    candidate_r2: number;
    empirical_coverage_pct: number;
  };
  mlflowRegistration: {
    registered_model: string;
    version?: string | number | null;
    alias?: string | null;
    tracking_uri: string;
  };
  rollbackTarget?: {
    backup_path: string;
    archived_at: string;
    description: string;
  } | null;
}

export interface ModelRollbackResponse {
  status: string;
  action: string;
  timestamp: string;
  restoredBackup: string;
  activeModelPath: string;
  reason: string;
  restoredVersion: string | number;
}

export interface DataQualityAuditResponse {
  timestamp: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | string;
  totalRecordsAudited: number;
  modeledSkuCount: number;
  dateRange: {
    start: string;
    end: string;
    expected_calendar_days: number;
  };
  integrityMetrics: {
    duplicate_records: number;
    missing_calendar_dates: number;
    negative_quantities: number;
    null_quantities: number;
    invalid_unit_prices: number;
    skus_with_gap_days_count: number;
  };
  spikeDetection: {
    threshold_iqr_multiplier: number;
    total_spikes_detected: number;
    sample_spikes: Array<{
      sku: string;
      date: string;
      quantity: number;
      spike_threshold: number;
      multiplier_over_median: number;
    }>;
  };
  criticalIssuesCount: number;
  criticalIssues: string[];
  warningIssues: string[];
}

export interface FeatureDriftMetric {
  featureName: string;
  psi: number;
  status: 'STABLE' | 'MODERATE_SHIFT' | 'SIGNIFICANT_DRIFT' | string;
  interpretation: string;
  baselineMean: number;
  targetMean: number;
  baselineStd: number;
  targetStd: number;
  binDetails?: Array<{
    bin_index: number;
    bin_range: string;
    expected_pct: number;
    actual_pct: number;
    psi_contribution: number;
  }>;
}

export interface FeatureDriftResponse {
  timestamp: string;
  method: string;
  overallStatus: 'STABLE' | 'MODERATE_SHIFT' | 'DRIFT_DETECTED' | string;
  averageFeaturePsi: number;
  thresholds: {
    stable_threshold: number;
    warning_threshold: number;
    significant_drift_threshold: number;
  };
  windows: {
    baseline_window: {
      start: string;
      end: string;
      sample_count: number;
      description: string;
    };
    monitoring_window: {
      start: string;
      sample_count: number;
      description: string;
    };
  };
  featuresEvaluatedCount: number;
  featuresInDrift: string[];
  featuresInWarning: string[];
  featureMetrics: Record<string, FeatureDriftMetric>;
  operationalGuidance: {
    retraining_philosophy: string;
    recommended_investigation_steps: string[];
    limitations_note?: string;
  };
}

export interface RollingWindowPerformanceMetric {
  window_name: string;
  window_days: number;
  start_date: string;
  end_date: string;
  sample_count: number;
  mae: number;
  rmse: number;
  wape: number;
  wape_pct: number;
  bias_direction: 'OVER_FORECASTING' | 'UNDER_FORECASTING' | 'BALANCED' | string;
  bias_pct: number;
  status: string;
}

export interface PerformanceMonitoringResponse {
  timestamp: string;
  modelPath: string;
  evaluationPeriod: {
    start: string;
    end: string;
    total_test_observations: number;
  };
  overallTestWape: number;
  overallTestMae: number;
  rollingWindowPerformance: RollingWindowPerformanceMetric[];
  totalSkusMonitored: number;
  highErrorSkusCount: number;
  topChallengingSkus: Array<{
    sku: string;
    description: string;
    total_demand: number;
    observation_days: number;
    mae: number;
    rmse: number;
    wape: number;
    wape_pct: number;
    status: string;
  }>;
  topPerformingSkus: Array<{
    sku: string;
    description: string;
    total_demand: number;
    observation_days: number;
    mae: number;
    rmse: number;
    wape: number;
    wape_pct: number;
    status: string;
  }>;
}

export interface ServiceMonitoringResponse {
  timestamp: string;
  uptimeSeconds: number;
  serviceStatus: 'HEALTHY' | 'DEGRADED' | string;
  requestMetrics: {
    total_requests: number;
    status_breakdown: Record<string, number>;
    error_rate_pct: number;
  };
  latencyMs: {
    mean: number;
    p50: number;
    p95: number;
    p99: number;
    sample_size: number;
  };
  modelHealth: {
    loaded: boolean;
    model_version: string;
    load_time_ms: number;
    last_load_timestamp: string;
    load_failures_count: number;
    last_error?: string;
  };
  systemResources: {
    process_memory_mb: number;
  };
  topEndpoints: Array<{
    endpoint: string;
    hits: number;
  }>;
}

export interface OperationalAlert {
  alertId: string;
  timestamp: string;
  category: 'data_quality' | 'feature_drift' | 'forecast_performance' | 'service_health' | string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  whatChanged: string;
  affectedEntities: string[];
  recommendedAction: string;
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED' | 'ACKNOWLEDGED' | string;
}

export interface AlertsListResponse {
  timestamp: string;
  totalAlerts: number;
  alerts: OperationalAlert[];
}

export interface FeedbackSubmissionRequest {
  sku: string;
  model_version?: string;
  forecast_quantity: number;
  recommended_order_quantity: number;
  assumed_current_stock: number;
  forecast_horizon_days?: number;
  reorder_point?: number;
  safety_stock?: number;
  supplier_lead_time?: number;
  eventual_actual_demand?: number | null;
  eventual_stockout_occurred?: boolean | null;
  notes?: string;
}

export interface FeedbackLogEntry {
  feedbackId: string;
  forecastTimestamp: string;
  modelVersion: string;
  sku: string;
  forecastHorizonDays: number;
  forecastQuantity: number;
  recommendedOrderQuantity: number;
  assumedCurrentStock: number;
  reorderPoint: number;
  safetyStock: number;
  supplierLeadTime: number;
  eventualActualDemand?: number | null;
  eventualStockoutOccurred?: boolean | null;
  outcomeError?: number | null;
  notes?: string;
  loggedAt: string;
}

export interface ReplenishmentEvaluationRequest {
  sku: string;
  forecastDailyDemand: number;
  leadTimeDays: number;
  currentStock: number;
  inTransitStock?: number;
  serviceLevel?: number;
  safetyStockOverride?: number | null;
  targetStockLevel?: number | null;
  targetDaysOfSupply?: number | null;
  moq?: number;
  packSize?: number;
  supplierOrderDays?: number[] | null;
  currentDayOfWeek?: number | null;
  maxCapacity?: number;
}

export interface ReplenishmentEvaluationResponse {
  sku: string;
  currentStock: number;
  inTransitStock: number;
  inventoryPosition: number;
  leadTimeDays: number;
  forecastDemandDuringLeadTime: number;
  safetyStock: number;
  reorderPoint: number;
  targetStockLevel: number;
  moq: number;
  packSize: number;
  maxCapacity: number;
  shouldReorder: boolean;
  recommendedOrderQuantity: number;
  unconstrainedOrderQuantity: number;
  reason: string;
  constraintsApplied: Record<string, any>;
  breakdown?: ReplenishmentCalculationBreakdown;
  isSyntheticInventory: boolean;
  inventorySource: string;
}

export interface ReplenishmentScenarioItem {
  scenarioId: string;
  scenarioName: string;
  description: string;
  leadTimeDays: number;
  leadTimeDelta: number;
  forecastDailyDemand: number;
  demandMultiplier: number;
  serviceLevel: number;
  safetyStock: number;
  reorderPoint: number;
  shouldReorder: boolean;
  orderQuantity: number;
  stockoutRisk: string;
}

export interface ReplenishmentScenariosResponse {
  sku: string;
  scenarios: ReplenishmentScenarioItem[];
  isSyntheticInventory: boolean;
  inventorySource: string;
}

export interface PolicyComparisonProfile {
  policyName: string;
  targetServiceLevel: string;
  safetyStockUnits: number;
  reorderPoint: number;
  targetStockLevel: number;
  recommendedOrderQuantity: number;
  shouldReorder: boolean;
  averageInventoryUnits: number;
  averageInventoryValue: number;
  estimatedAnnualHoldingCost: number;
  estimatedAnnualOrderingCost: number;
  totalEstimatedCost: number;
  simulatedStockoutRisk: string;
  orderFrequencyPerYear: number;
  recommendedUseCase: string;
}

export interface PolicyTradeoffResponse {
  sku: string;
  forecastDailyDemand: number;
  leadTimeDays: number;
  currentStock: number;
  isSyntheticInventory: boolean;
  inventorySource: string;
  policies: {
    conservative: PolicyComparisonProfile;
    balanced: PolicyComparisonProfile;
    lean: PolicyComparisonProfile;
  };
  tradeoffSummary: string;
}

export interface ModelInfoResponse {
  modelName: string;
  modelVersion: string;
  lastSuccessfulTrainingTime: string;
  status: string;
  gitCommit?: string;
  evaluationSummary: {
    wape: number;
    mae: number;
    rmse: number;
    r2: number;
    interval_coverage_pct?: number;
    val_wape?: number;
    val_mae?: number;
    val_rmse?: number;
  };
  dataFreshness: {
    dataset: string;
    last_recorded_invoice_date: string;
    total_featured_rows: number;
    active_skus_tracked: number;
    feature_pipeline_version?: string;
  };
  isSyntheticInventoryDemonstration: boolean;
}



