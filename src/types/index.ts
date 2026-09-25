// Core domain types for StockSense

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

export interface DemandForecast {
  productId: string;
  horizon: number;
  points: ForecastPoint[];
  expectedTotalDemand: number;
  averageDailyForecast: number;
  uncertainty: number; // standard deviation
  generatedAt: string;
}

export interface RestockRecommendation {
  productId: string;
  product: Product;
  currentStock: number;
  forecastDemandDuringLeadTime: number;
  safetyStock: number;
  reorderPoint: number;
  recommendedOrderQuantity: number;
  supplierLeadTime: number;
  priority: Priority;
  reason: string;
  estimatedStockoutDate: string | null;
  daysUntilStockout: number | null;
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
