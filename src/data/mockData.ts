import type {
  Product,
  Category,
  Supplier,
  DailySales,
  RestockRecommendation,
  ModelMetrics,
  ModelComparisonRow,
  ExperimentRun,
  ModelVersion,
  ActualVsPredictedPoint,
  Notification,
  ActivityEvent,
  Settings,
  DashboardSummary,
  TopSellingProduct,
  LowStockAlert,
  CategoryDistribution,
  SalesForecastPoint,
  StockStatus,
  Priority,
} from '@/types';

// ─── Categories ───────────────────────────────────────────────────────────
export const categories: Category[] = [
  { id: 'cat-1', name: 'Beverages', color: 'chart-1' },
  { id: 'cat-2', name: 'Snacks', color: 'chart-2' },
  { id: 'cat-3', name: 'Packaged Goods', color: 'chart-3' },
  { id: 'cat-4', name: 'Household', color: 'chart-4' },
  { id: 'cat-5', name: 'Personal Care', color: 'chart-5' },
  { id: 'cat-6', name: 'Dairy', color: 'chart-1' },
];

export const categoryNameById = (id: string): string =>
  categories.find((c) => c.id === id)?.name ?? 'Uncategorized';

// ─── Suppliers ────────────────────────────────────────────────────────────
export const suppliers: Supplier[] = [
  { id: 'sup-1', name: 'Global Beverages Pvt Ltd', leadTimeDays: 5, reliability: 92, contactEmail: 'orders@globalbev.in' },
  { id: 'sup-2', name: 'SnackMart Distributors', leadTimeDays: 3, reliability: 88, contactEmail: 'supply@snackmart.in' },
  { id: 'sup-3', name: 'PackagedGoods India', leadTimeDays: 7, reliability: 85, contactEmail: 'contact@pkggoods.in' },
  { id: 'sup-4', name: 'HomeEssentials Supply', leadTimeDays: 4, reliability: 90, contactEmail: 'orders@homeess.in' },
  { id: 'sup-5', name: 'CareWell Products', leadTimeDays: 6, reliability: 87, contactEmail: 'sales@carewell.in' },
  { id: 'sup-6', name: 'FreshDairy Logistics', leadTimeDays: 2, reliability: 94, contactEmail: 'supply@freshdairy.in' },
];

export const supplierNameById = (id: string): string =>
  suppliers.find((s) => s.id === id)?.name ?? 'Unknown Supplier';

// ─── Products ─────────────────────────────────────────────────────────────
function computeStatus(stock: number, reorder: number): StockStatus {
  if (stock <= 0) return 'out-of-stock';
  if (stock <= reorder * 0.5) return 'critical';
  if (stock <= reorder) return 'low-stock';
  return 'in-stock';
}

function makeProduct(
  id: string,
  name: string,
  sku: string,
  categoryId: string,
  supplierId: string,
  price: number,
  costPrice: number,
  currentStock: number,
  reorderPoint: number,
  targetStockLevel: number,
  safetyStock: number,
  averageDailyDemand: number,
  unit: string = 'units',
): Product {
  return {
    id,
    name,
    sku,
    categoryId,
    supplierId,
    price,
    costPrice,
    currentStock,
    reorderPoint,
    targetStockLevel,
    safetyStock,
    averageDailyDemand,
    unit,
    status: computeStatus(currentStock, reorderPoint),
    createdAt: '2024-06-15T09:00:00Z',
  };
}

export const products: Product[] = [
  makeProduct('prod-1', 'Tata Coffee Gold', 'BEV-001', 'cat-1', 'sup-1', 450, 320, 240, 80, 300, 40, 8),
  makeProduct('prod-2', 'Red Label Tea 1kg', 'BEV-002', 'cat-1', 'sup-1', 380, 260, 45, 60, 200, 30, 6),
  makeProduct('prod-3', 'Coca-Cola 750ml', 'BEV-003', 'cat-1', 'sup-1', 65, 38, 320, 100, 400, 50, 18),
  makeProduct('prod-4', 'Lays Classic Salted', 'SNK-001', 'cat-2', 'sup-2', 30, 18, 12, 40, 150, 20, 7),
  makeProduct('prod-5', 'Haldiram Bhujia 200g', 'SNK-002', 'cat-2', 'sup-2', 55, 32, 85, 50, 200, 25, 9),
  makeProduct('prod-6', 'Kurkure Masala', 'SNK-003', 'cat-2', 'sup-2', 20, 11, 180, 60, 250, 30, 12),
  makeProduct('prod-7', 'Maggi Noodles 8-Pack', 'PKG-001', 'cat-3', 'sup-3', 96, 52, 520, 150, 600, 75, 25),
  makeProduct('prod-8', 'Aashirvaad Atta 5kg', 'PKG-002', 'cat-3', 'sup-3', 285, 210, 38, 70, 250, 35, 7),
  makeProduct('prod-9', 'Fortune Sunflower Oil 1L', 'PKG-003', 'cat-3', 'sup-3', 165, 120, 95, 80, 300, 40, 14),
  makeProduct('prod-10', 'Surf Excel Detergent 1kg', 'HSH-001', 'cat-4', 'sup-4', 175, 110, 22, 45, 180, 22, 5),
  makeProduct('prod-11', 'Vim Dishwash Bar', 'HSH-002', 'cat-4', 'sup-4', 25, 14, 140, 50, 200, 25, 9),
  makeProduct('prod-12', 'Harpic Toilet Cleaner 1L', 'HSH-003', 'cat-4', 'sup-4', 95, 62, 8, 30, 120, 15, 4),
  makeProduct('prod-13', 'Colgate Toothpaste 200g', 'PCR-001', 'cat-5', 'sup-5', 85, 48, 310, 100, 400, 50, 16),
  makeProduct('prod-14', 'Dove Shampoo 340ml', 'PCR-002', 'cat-5', 'sup-5', 230, 155, 18, 40, 160, 20, 6),
  makeProduct('prod-15', 'Lifebuoy Soap 4-Pack', 'PCR-003', 'cat-5', 'sup-5', 60, 35, 75, 50, 200, 25, 8),
  makeProduct('prod-16', 'Amul Milk 1L', 'DRY-001', 'cat-6', 'sup-6', 68, 52, 450, 200, 600, 100, 42),
  makeProduct('prod-17', 'Amul Butter 500g', 'DRY-002', 'cat-6', 'sup-6', 285, 220, 28, 60, 200, 30, 11),
  makeProduct('prod-18', 'Mother Dairy Curd 400g', 'DRY-003', 'cat-6', 'sup-6', 45, 30, 15, 80, 250, 40, 22),
];

export const getProductById = (id: string): Product | undefined =>
  products.find((p) => p.id === id);

// ─── Daily Sales (deterministic) ───────────────────────────────────────────
// Generate 90 days of historical sales per product using a seeded pattern
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateDailySales(): DailySales[] {
  const result: DailySales[] = [];
  const today = new Date('2026-09-25');
  const rng = seededRandom(42);

  products.forEach((product, pIdx) => {
    const baseDemand = product.averageDailyDemand;
    // 90 days of history
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Weekly seasonality (weekends higher)
      const dayOfWeek = date.getDay();
      const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.35 : 1.0;

      // Slight upward trend
      const trend = 1 + (89 - i) * 0.0015;

      // Random noise
      const noise = 0.7 + rng() * 0.6;

      const quantity = Math.max(0, Math.round(baseDemand * weekendBoost * trend * noise));
      const revenue = quantity * product.price;

      result.push({
        productId: product.id,
        date: dateStr,
        quantity,
        revenue,
      });
    }
  });

  return result;
}

export const allDailySales: DailySales[] = generateDailySales();

export function getSalesForProduct(productId: string, days: number = 90): DailySales[] {
  return allDailySales
    .filter((s) => s.productId === productId)
    .slice(-days);
}

export function getSalesForDateRange(startDate: string, endDate: string): DailySales[] {
  return allDailySales.filter((s) => s.date >= startDate && s.date <= endDate);
}

export function getTotalRevenueForDateRange(startDate: string, endDate: string): number {
  return getSalesForDateRange(startDate, endDate).reduce((sum, s) => sum + s.revenue, 0);
}

// ─── Forecast Generation (deterministic mock) ─────────────────────────────
export function generateForecastData(productId: string, horizon: number) {
  const product = getProductById(productId);
  if (!product) return null;

  const historicalSales = getSalesForProduct(productId, 30);
  const today = new Date('2026-09-25');
  const rng = seededRandom(productId.charCodeAt(5) * 1000 + horizon);

  const points = [];
  let expectedTotal = 0;

  // Include last 14 days of actuals for context
  const contextDays = historicalSales.slice(-14);
  contextDays.forEach((s) => {
    points.push({
      date: s.date,
      actual: s.quantity,
      predicted: null,
      lowerBound: null,
      upperBound: null,
    });
  });

  // Generate forecast points
  const baseDemand = product.averageDailyDemand;
  for (let i = 1; i <= horizon; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const dayOfWeek = date.getDay();
    const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1.0;
    const trend = 1 + i * 0.002;
    const noise = 0.9 + rng() * 0.2;

    const predicted = Math.round(baseDemand * weekendBoost * trend * noise);
    const uncertainty = Math.round(predicted * 0.15 * (1 + i / horizon));

    points.push({
      date: dateStr,
      actual: null,
      predicted,
      lowerBound: Math.max(0, predicted - uncertainty),
      upperBound: predicted + uncertainty,
    });

    expectedTotal += predicted;
  }

  const averageDaily = Math.round(expectedTotal / horizon);
  const uncertainty = Math.round(averageDaily * 0.15);

  return {
    productId,
    horizon,
    points,
    expectedTotalDemand: expectedTotal,
    averageDailyForecast: averageDaily,
    uncertainty,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Restock Recommendations ───────────────────────────────────────────────
function computePriority(product: Product): Priority {
  if (product.status === 'out-of-stock' || product.status === 'critical') return 'high';
  if (product.status === 'low-stock') return 'medium';
  return 'low';
}

function computeDaysUntilStockout(product: Product): number | null {
  if (product.averageDailyDemand <= 0) return null;
  return Math.floor(product.currentStock / product.averageDailyDemand);
}

function computeStockoutDate(daysRemaining: number | null): string | null {
  if (daysRemaining === null) return null;
  if (daysRemaining < 0) return null;
  const date = new Date('2026-09-25');
  date.setDate(date.getDate() + daysRemaining);
  return date.toISOString().split('T')[0];
}

export function generateRestockRecommendations(): RestockRecommendation[] {
  return products
    .map((product) => {
      const supplier = suppliers.find((s) => s.id === product.supplierId)!;
      const leadTime = supplier.leadTimeDays;
      const forecastDemandDuringLeadTime = Math.round(
        product.averageDailyDemand * leadTime,
      );
      const reorderPoint = forecastDemandDuringLeadTime + product.safetyStock;
      const recommendedOrderQuantity = Math.max(
        0,
        product.targetStockLevel - product.currentStock,
      );
      const daysUntilStockout = computeDaysUntilStockout(product);
      const estimatedStockoutDate = computeStockoutDate(daysUntilStockout);

      let reason = 'Stock level is healthy.';
      if (product.status === 'out-of-stock') {
        reason = 'Product is out of stock. Immediate restock required.';
      } else if (product.status === 'critical') {
        reason = `Critical stock level. Only ${daysUntilStockout} days of inventory remaining.`;
      } else if (product.status === 'low-stock') {
        reason = `Below reorder point. ${daysUntilStockout} days of inventory remaining.`;
      } else if (recommendedOrderQuantity > 0 && product.currentStock <= reorderPoint) {
        reason = 'Approaching reorder point based on current demand.';
      }

      return {
        productId: product.id,
        product,
        currentStock: product.currentStock,
        forecastDemandDuringLeadTime,
        safetyStock: product.safetyStock,
        reorderPoint,
        recommendedOrderQuantity,
        supplierLeadTime: leadTime,
        priority: computePriority(product),
        reason,
        estimatedStockoutDate,
        daysUntilStockout,
      };
    })
    .filter((r) => r.recommendedOrderQuantity > 0 || r.product.status !== 'in-stock')
    .sort((a, b) => {
      const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

// ─── Dashboard Summary ────────────────────────────────────────────────────
export function generateDashboardSummary(): DashboardSummary {
  const totalProducts = products.length;
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + p.currentStock * p.costPrice,
    0,
  );
  const productsRunningLow = products.filter(
    (p) => p.status === 'low-stock' || p.status === 'critical' || p.status === 'out-of-stock',
  ).length;
  const stockoutRiskCount = products.filter(
    (p) => p.status === 'critical' || p.status === 'out-of-stock',
  ).length;

  // Forecasted sales next 7 days
  let forecastedSales7Days = 0;
  products.forEach((p) => {
    const forecast = generateForecastData(p.id, 7);
    if (forecast) forecastedSales7Days += forecast.expectedTotalDemand;
  });

  // Top selling products (last 30 days)
  const productSalesMap = new Map<string, { units: number; revenue: number }>();
  allDailySales
    .filter((s) => {
      const today = new Date('2026-09-25');
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return s.date >= thirtyDaysAgo.toISOString().split('T')[0];
    })
    .forEach((s) => {
      const existing = productSalesMap.get(s.productId) || { units: 0, revenue: 0 };
      existing.units += s.quantity;
      existing.revenue += s.revenue;
      productSalesMap.set(s.productId, existing);
    });

  const topSellingProducts: TopSellingProduct[] = Array.from(productSalesMap.entries())
    .map(([productId, data]) => {
      const product = getProductById(productId)!;
      const previousPeriod = allDailySales.filter((s) => {
        const today = new Date('2026-09-25');
        const sixtyDaysAgo = new Date(today);
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return (
          s.productId === productId &&
          s.date >= sixtyDaysAgo.toISOString().split('T')[0] &&
          s.date < thirtyDaysAgo.toISOString().split('T')[0]
        );
      });
      const prevRevenue = previousPeriod.reduce((sum, s) => sum + s.revenue, 0);
      const trendPct = prevRevenue > 0
        ? Math.round(((data.revenue - prevRevenue) / prevRevenue) * 100)
        : 0;
      return {
        productId,
        name: product.name,
        sku: product.sku,
        category: categoryNameById(product.categoryId),
        unitsSold: data.units,
        revenue: data.revenue,
        trendPct,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Low stock alerts
  const lowStockAlerts: LowStockAlert[] = products
    .filter((p) => p.status !== 'in-stock')
    .map((p) => ({
      productId: p.id,
      name: p.name,
      sku: p.sku,
      currentStock: p.currentStock,
      reorderPoint: p.reorderPoint,
      daysRemaining: computeDaysUntilStockout(p) ?? 0,
      status: p.status,
    }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Restock preview
  const restockPreview = generateRestockRecommendations().slice(0, 4);

  // Category distribution
  const categoryDistribution: CategoryDistribution[] = categories.map((cat) => {
    const catProducts = products.filter((p) => p.categoryId === cat.id);
    const inventoryValue = catProducts.reduce(
      (sum, p) => sum + p.currentStock * p.costPrice,
      0,
    );
    return {
      category: cat.name,
      productCount: catProducts.length,
      inventoryValue,
      percentage: totalInventoryValue > 0
        ? Math.round((inventoryValue / totalInventoryValue) * 100)
        : 0,
    };
  });

  // Recent activity
  const recentActivity: ActivityEvent[] = [
    { id: 'act-1', type: 'stock-update', message: 'Stock adjusted for Maggi Noodles 8-Pack (+24 units)', productId: 'prod-7', timestamp: '2026-09-25T08:30:00Z', user: 'Rahul S.' },
    { id: 'act-2', type: 'alert-triggered', message: 'Low stock alert: Lays Classic Salted', productId: 'prod-4', timestamp: '2026-09-25T07:15:00Z', user: 'System' },
    { id: 'act-3', type: 'restock-order', message: 'Restock order placed for Harpic Toilet Cleaner', productId: 'prod-12', timestamp: '2026-09-24T16:45:00Z', user: 'Priya M.' },
    { id: 'act-4', type: 'forecast-generated', message: 'Demand forecast generated for Amul Milk 1L', productId: 'prod-16', timestamp: '2026-09-24T14:20:00Z', user: 'System' },
    { id: 'act-5', type: 'product-added', message: 'New product added: Mother Dairy Curd 400g', productId: 'prod-18', timestamp: '2026-09-23T11:10:00Z', user: 'Rahul S.' },
    { id: 'act-6', type: 'stock-update', message: 'Stock adjusted for Coca-Cola 750ml (-36 units)', productId: 'prod-3', timestamp: '2026-09-23T09:30:00Z', user: 'System' },
  ];

  // Sales vs forecast (last 30 days actual + 7 days forecast for total)
  const today = new Date('2026-09-25');
  const salesVsForecast: SalesForecastPoint[] = [];

  // Last 30 days actual sales (aggregate across all products)
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const daySales = allDailySales.filter((s) => s.date === dateStr);
    const totalUnits = daySales.reduce((sum, s) => sum + s.quantity, 0);
    const totalRevenue = daySales.reduce((sum, s) => sum + s.revenue, 0);
    salesVsForecast.push({
      date: dateStr,
      actual: totalRevenue,
      predicted: null,
      label: 'Actual',
    });
  }

  // Next 7 days forecast (aggregate)
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    let totalPredicted = 0;
    products.forEach((p) => {
      const forecast = generateForecastData(p.id, 7);
      if (forecast) {
        const point = forecast.points.find((pt) => pt.date === dateStr);
        if (point?.predicted) totalPredicted += point.predicted * p.price;
      }
    });
    salesVsForecast.push({
      date: dateStr,
      actual: null,
      predicted: Math.round(totalPredicted),
      label: 'Forecast',
    });
  }

  return {
    totalProducts,
    totalInventoryValue,
    productsRunningLow,
    stockoutRiskCount,
    forecastedSales7Days,
    forecastedSalesChangePct: 8.5,
    inventoryValueChangePct: 3.2,
    topSellingProducts,
    lowStockAlerts,
    restockPreview,
    categoryDistribution,
    recentActivity,
    salesVsForecast,
  };
}

// ─── Model Performance Mock Data ──────────────────────────────────────────
export const modelMetrics: ModelMetrics = {
  modelName: 'Gradient Boosting Regressor',
  modelVersion: 'v2.3.1',
  lastTrainedAt: '2026-09-20T14:30:00Z',
  status: 'registered',
  mae: 3.42,
  rmse: 5.18,
  mape: 12.4,
  r2Score: 0.873,
};

export const modelComparison: ModelComparisonRow[] = [
  { modelName: 'Naive Baseline (7-day avg)', mae: 7.85, rmse: 11.23, mape: 24.6, r2Score: 0.612, trainingTime: 0.5, status: 'baseline' },
  { modelName: 'Random Forest', mae: 4.15, rmse: 6.42, mape: 15.8, r2Score: 0.821, trainingTime: 12.3, status: 'experiment' },
  { modelName: 'Gradient Boosting (XGBoost)', mae: 3.42, rmse: 5.18, mape: 12.4, r2Score: 0.873, trainingTime: 8.7, status: 'production' },
];

export const experimentHistory: ExperimentRun[] = [
  {
    id: 'exp-001',
    experimentName: 'xgb_tuning_v3',
    modelName: 'Gradient Boosting (XGBoost)',
    parameters: { n_estimators: 300, max_depth: 6, learning_rate: 0.05, subsample: 0.8 },
    metrics: { mae: 3.42, rmse: 5.18, mape: 12.4 },
    status: 'completed',
    startedAt: '2026-09-20T14:30:00Z',
    duration: 522,
  },
  {
    id: 'exp-002',
    experimentName: 'rf_baseline_v2',
    modelName: 'Random Forest',
    parameters: { n_estimators: 200, max_depth: 12, min_samples_split: 5 },
    metrics: { mae: 4.15, rmse: 6.42, mape: 15.8 },
    status: 'completed',
    startedAt: '2026-09-18T10:15:00Z',
    duration: 738,
  },
  {
    id: 'exp-003',
    experimentName: 'naive_baseline_init',
    modelName: 'Naive Baseline',
    parameters: { window: 7, method: 'moving_average' },
    metrics: { mae: 7.85, rmse: 11.23, mape: 24.6 },
    status: 'completed',
    startedAt: '2026-09-15T09:00:00Z',
    duration: 30,
  },
  {
    id: 'exp-004',
    experimentName: 'xgb_tuning_v2',
    modelName: 'Gradient Boosting (XGBoost)',
    parameters: { n_estimators: 200, max_depth: 4, learning_rate: 0.1, subsample: 0.7 },
    metrics: { mae: 4.01, rmse: 6.05, mape: 14.2 },
    status: 'completed',
    startedAt: '2026-09-12T16:45:00Z',
    duration: 345,
  },
  {
    id: 'exp-005',
    experimentName: 'xgb_feature_eng_v1',
    modelName: 'Gradient Boosting (XGBoost)',
    parameters: { n_estimators: 250, max_depth: 5, learning_rate: 0.08, features: 'lag_7,lag_14,day_of_week' },
    metrics: { mae: 3.78, rmse: 5.65, mape: 13.1 },
    status: 'completed',
    startedAt: '2026-09-08T11:20:00Z',
    duration: 410,
  },
];

export const modelVersions: ModelVersion[] = [
  { version: 'v2.3.1', registeredAt: '2026-09-20T15:00:00Z', status: 'production', metrics: { mae: 3.42, rmse: 5.18 } },
  { version: 'v2.2.0', registeredAt: '2026-09-12T17:00:00Z', status: 'staging', metrics: { mae: 4.01, rmse: 6.05 } },
  { version: 'v2.1.0', registeredAt: '2026-09-05T10:00:00Z', status: 'archived', metrics: { mae: 3.78, rmse: 5.65 } },
  { version: 'v2.0.0', registeredAt: '2026-08-28T14:00:00Z', status: 'archived', metrics: { mae: 4.35, rmse: 6.82 } },
  { version: 'v1.0.0', registeredAt: '2026-08-15T09:00:00Z', status: 'archived', metrics: { mae: 7.85, rmse: 11.23 } },
];

// Actual vs predicted for model performance chart
export function generateActualVsPredicted(productId: string): ActualVsPredictedPoint[] {
  const sales = getSalesForProduct(productId, 30);
  const rng = seededRandom(productId.charCodeAt(5) * 100 + 99);
  return sales.map((s) => {
    const noise = (rng() - 0.5) * 0.2;
    const predicted = Math.max(0, Math.round(s.quantity * (1 + noise)));
    return {
      date: s.date,
      actual: s.quantity,
      predicted,
    };
  });
}

// ─── Notifications ────────────────────────────────────────────────────────
export const notifications: Notification[] = [
  { id: 'ntf-1', type: 'error', title: 'Critical Stock', message: 'Harpic Toilet Cleaner is out of stock', timestamp: '2026-09-25T08:00:00Z', read: false },
  { id: 'ntf-2', type: 'warning', title: 'Low Stock Alert', message: 'Lays Classic Salted below reorder point', timestamp: '2026-09-25T07:15:00Z', read: false },
  { id: 'ntf-3', type: 'warning', title: 'Low Stock Alert', message: 'Dove Shampoo 340ml below reorder point', timestamp: '2026-09-24T18:30:00Z', read: false },
  { id: 'ntf-4', type: 'info', title: 'Forecast Ready', message: 'Weekly demand forecast has been generated', timestamp: '2026-09-24T14:00:00Z', read: true },
  { id: 'ntf-5', type: 'success', title: 'Restock Complete', message: 'Amul Milk 1L restocked to 450 units', timestamp: '2026-09-24T10:45:00Z', read: true },
];

// ─── Default Settings ─────────────────────────────────────────────────────
export const defaultSettings: Settings = {
  businessName: 'Kirana Mart',
  businessEmail: 'owner@kiranamart.in',
  currency: 'INR',
  timezone: 'Asia/Kolkata (IST)',
  dateFormat: 'DD/MM/YYYY',
  lowStockAlerts: true,
  stockoutAlerts: true,
  restockAlerts: true,
  defaultForecastHorizon: 7,
  theme: 'light',
  apiConnected: false,
};
