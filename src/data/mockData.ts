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
  InventorySimulationResponse,
  ComprehensiveEvaluationResponse,
  ModelPromotionResponse,
  DataQualityAuditResponse,
  FeatureDriftResponse,
  PerformanceMonitoringResponse,
  ServiceMonitoringResponse,
  AlertsListResponse,
  FeedbackLogEntry,
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
      const unconstrainedQty = Math.max(
        0,
        product.targetStockLevel - product.currentStock,
      );
      const moq = Math.max(10, Math.round(product.averageDailyDemand * 2));
      const batchSize = 5;
      const maxCapacity = Math.max(product.targetStockLevel * 2, 500);

      let recommendedOrderQuantity = unconstrainedQty;
      let moqTriggered = false;
      let batchRoundingApplied = false;
      let maxCapacityCapped = false;

      if (recommendedOrderQuantity > 0 && recommendedOrderQuantity < moq) {
        recommendedOrderQuantity = moq;
        moqTriggered = true;
      }
      if (batchSize > 1 && recommendedOrderQuantity > 0) {
        const rem = recommendedOrderQuantity % batchSize;
        if (rem !== 0) {
          recommendedOrderQuantity += (batchSize - rem);
          batchRoundingApplied = true;
        }
      }
      if (product.currentStock + recommendedOrderQuantity > maxCapacity) {
        recommendedOrderQuantity = Math.max(0, maxCapacity - product.currentStock);
        maxCapacityCapped = true;
      }

      const daysUntilStockout = computeDaysUntilStockout(product);
      const estimatedStockoutDate = computeStockoutDate(daysUntilStockout);
      const shouldReorder = product.currentStock <= reorderPoint;

      let reason = 'Stock level is healthy.';
      if (product.status === 'out-of-stock') {
        reason = 'Product is out of stock. Immediate restock required.';
      } else if (product.status === 'critical') {
        reason = `Critical stock level. Only ${daysUntilStockout} days of inventory remaining.`;
      } else if (product.status === 'low-stock') {
        reason = `Below reorder point (${reorderPoint} units). Restock to maintain safety buffer.`;
      } else if (shouldReorder) {
        reason = `Approaching reorder point (${reorderPoint} units). Order recommended for upcoming lead time.`;
      }

      return {
        productId: product.id,
        product,
        currentStock: product.currentStock,
        inTransitStock: 0,
        inventoryPosition: product.currentStock,
        forecastDemandDuringLeadTime,
        safetyStock: product.safetyStock,
        reorderPoint,
        recommendedOrderQuantity,
        unconstrainedOrderQuantity: unconstrainedQty,
        supplierLeadTime: leadTime,
        priority: computePriority(product),
        reason,
        shouldReorder,
        estimatedStockoutDate,
        daysUntilStockout,
        constraints: {
          moq,
          batchSize,
          maxCapacity,
          moqTriggered,
          batchRoundingApplied,
          maxCapacityCapped,
        },
        problemStatement:
          'Reduce avoidable stockouts and excess stock while balancing service level, inventory holding cost, and ordering cost.',
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

// ─── Inventory Simulation & Backtest Mock ──────────────────────────────────
export function generateInventoryBacktest(
  holdingCostRate: number = 0.20,
  orderingCost: number = 40.0,
  stockoutPenalty: number = 5.0,
  leadTime: number = 4,
): InventorySimulationResponse {
  return {
    problemStatement:
      'Reduce avoidable retail stockouts and costly excess inventory while optimally balancing service level (fill rate), inventory holding cost, and supplier ordering costs under lead-time uncertainty.',
    scenarioInputs: {
      holdingCostAnnualRate: holdingCostRate,
      dailyHoldingRate: Number((holdingCostRate / 365).toFixed(6)),
      orderingCostPerOrder: orderingCost,
      stockoutPenaltyPerUnit: stockoutPenalty,
      leadTimeDays: leadTime,
      serviceFactorZ: 1.65,
      moq: 15,
      batchSize: 5,
      isScenarioAssumption: true,
      disclaimer:
        'Cost parameters are configurable scenario inputs (assumptions) for planning and comparison, not audited historical business facts.',
    },
    backtestPeriod: {
      start: '2011-10-15',
      end: '2011-12-09',
      totalDays: 56,
      skuCount: 50,
      totalDemandUnits: 226959,
    },
    comparison: {
      stockoutDaysReductionPct: 14.6,
      unitsShortReductionPct: 5.9,
      excessInventoryReductionPct: 18.2,
      holdingCostSavingsPct: 4.8,
      totalCostSavingsPct: 3.5,
      serviceLevelImprovementPct: 1.56,
    },
    policies: {
      morrow: {
        policy_name: 'morrow_ml',
        policyName: 'MORROW ML Dynamic Forecast Policy',
        simulatedStockoutDays: 187,
        stockoutDayRatePct: 6.68,
        unitsShort: 56247,
        excessInventoryUnits: 21,
        averageInventoryValue: 53989.5,
        orderFrequency: 994,
        serviceLevel: {
          fillRate: 75.22,
          cycleServiceLevel: 93.32,
        },
        costs: {
          holdingCost: 1656.66,
          orderingCost: 39760.0,
          stockoutPenaltyCost: 281235.0,
          totalCost: 322651.66,
        },
        totalCost: 322651.66,
      },
      fixed_baseline: {
        policy_name: 'fixed_baseline',
        policyName: 'Fixed Baseline (Historical Mean Rule)',
        simulatedStockoutDays: 219,
        stockoutDayRatePct: 7.82,
        unitsShort: 59788,
        excessInventoryUnits: 5,
        averageInventoryValue: 52193.74,
        orderFrequency: 539,
        serviceLevel: {
          fillRate: 73.66,
          cycleServiceLevel: 92.18,
        },
        costs: {
          holdingCost: 1601.56,
          orderingCost: 21560.0,
          stockoutPenaltyCost: 298940.0,
          totalCost: 322101.56,
        },
        totalCost: 322101.56,
      },
      seasonal_baseline: {
        policy_name: 'seasonal_baseline',
        policyName: 'Seasonal Baseline (Lag-7 Repeat Rule)',
        simulatedStockoutDays: 200,
        stockoutDayRatePct: 7.14,
        unitsShort: 55831,
        excessInventoryUnits: 9,
        averageInventoryValue: 52626.15,
        orderFrequency: 808,
        serviceLevel: {
          fillRate: 75.4,
          cycleServiceLevel: 92.86,
        },
        costs: {
          holdingCost: 1614.83,
          orderingCost: 32320.0,
          stockoutPenaltyCost: 279155.0,
          totalCost: 313089.83,
        },
        totalCost: 313089.83,
      },
    },
  };
}

// ─── Model Evaluation Details Mock ─────────────────────────────────────────
export function generateModelEvaluationDetails(): ComprehensiveEvaluationResponse {
  return {
    problemStatement:
      'Reduce avoidable stockouts and excess stock while balancing service level, inventory holding cost, and ordering cost.',
    runMetadata: {
      evaluation_date_range: { start: '2011-10-15', end: '2011-12-09' },
      sku_coverage: { total_skus: 50, regular_skus: 41, intermittent_skus: 9 },
      data_version: 'dvc://backend/data/raw/Online Retail.xlsx.dvc@rev3',
      feature_version: 'features-v2-leak-free-lags-rolling',
      model_version: 'v1.2.0',
      random_seed: 42,
      run_timestamp: '2026-10-13T01:36:06Z',
    },
    dataset: 'UCI Online Retail',
    zeroDemandDayPercentage: 21.0,
    models: {
      random_forest: { mae: 67.45, rmse: 186.58, r2: 0.159, wape: 0.832, nonzero_mape: 78.4 },
      naive_baseline: { mae: 80.64, rmse: 241.16, r2: -0.405, wape: 0.995, nonzero_mape: 99.5 },
    },
    predictionIntervalCalibration: {
      nominal_coverage_pct: 80.0,
      empirical_coverage_pct: 75.8,
      mean_interval_width: 108.4,
      calibration_source: 'Validation split (2011-09-01 to 2011-10-15) residual quantiles [10%, 90%]',
      residual_lower_q10: -72.5,
      residual_upper_q90: 58.09,
      status: 'calibrated_and_tested',
    },
    metricExplanations: {
      mae: {
        name: 'Mean Absolute Error (MAE)',
        unit: 'Units per Day',
        retailMeaning:
          'Average units the forecast misses each day per SKU. For example, an MAE of 12 units means daily restocking orders deviate from demand by ~12 units.',
      },
      rmse: {
        name: 'Root Mean Squared Error (RMSE)',
        unit: 'Units per Day',
        retailMeaning:
          'Penalizes large outlier misses heavily. Essential for identifying sudden sales surges that threaten rapid inventory depletion.',
      },
      wape: {
        name: 'Weighted Absolute Percentage Error (WAPE)',
        unit: 'Percentage (%)',
        retailMeaning:
          'Total error volume divided by total catalog demand. Unlike MAPE, WAPE does not blow up or divide by zero on quiet sales days.',
      },
      seasonal_baseline: {
        name: 'Naive Seasonal Baseline (Lag-7)',
        unit: 'Benchmark Comparison',
        retailMeaning:
          'Compares MORROW to repeating the prior week’s same-day sales. Quantifies the true lift machine learning delivers over standard manual scheduling.',
      },
      prediction_intervals: {
        name: 'Calibrated Prediction Interval Coverage',
        unit: 'Percentage (%)',
        retailMeaning:
          'Percentage of real customer sales days falling between MORROW’s upper and lower forecast safety bounds. Calibrated to ensure reliable safety stocks.',
      },
    },
    volumeSegments: {
      'High-Volume (Fast Movers)': {
        skuCount: 10,
        totalDemand: 117528,
        mae: 154.96,
        rmse: 380.3,
        wape: 0.7384,
      },
      'Mid-Volume (Medium Velocity)': {
        skuCount: 25,
        totalDemand: 86744,
        mae: 52.7,
        rmse: 101.56,
        wape: 0.8506,
      },
      'Low-Volume (Slow Movers)': {
        skuCount: 15,
        totalDemand: 22687,
        mae: 33.68,
        rmse: 49.31,
        wape: 1.2469,
      },
    },
    intermittentVsRegular: {
      intermittent_segment: {
        sku_count: 9,
        samples: 504,
        zero_demand_day_pct: 36.1,
        mae: 56.68,
        rmse: 148.43,
        wape: 1.2461,
        mape_note:
          'MAPE is mathematically excluded for intermittent series due to division by zero on zero-sales days. WAPE is the primary metric.',
      },
      regular_segment: {
        sku_count: 41,
        samples: 2296,
        zero_demand_day_pct: 17.7,
        mae: 69.81,
        rmse: 193.95,
        wape: 0.7856,
        nonzero_mape: 78.4,
      },
    },
    horizonEvaluation: {
      '7_days': {
        horizonDays: 7,
        skusEvaluated: 50,
        rfModel: { mae: 182.26, rmse: 263.62, wape: 0.427 },
        naiveBaseline: { mae: 221.88, rmse: 341.13, wape: 0.5198 },
        wapeImprovementPct: 17.9,
      },
      '14_days': {
        horizonDays: 14,
        skusEvaluated: 50,
        rfModel: { mae: 474.64, rmse: 964.83, wape: 0.4603 },
        naiveBaseline: { mae: 569.12, rmse: 1198.4, wape: 0.552 },
        wapeImprovementPct: 16.6,
      },
      '30_days': {
        horizonDays: 30,
        skusEvaluated: 50,
        rfModel: { mae: 1082.35, rmse: 2108.5, wape: 0.4912 },
        naiveBaseline: { mae: 1290.4, rmse: 2614.2, wape: 0.5855 },
        wapeImprovementPct: 16.1,
      },
    },
  };
}

// ─── Model Promotion Decision Mock ─────────────────────────────────────────
export function generateModelPromotionStatus(): ModelPromotionResponse {
  return {
    timestamp: '2026-10-13T02:49:24Z',
    modelName: 'RandomForestRegressor',
    candidateVersion: 'v1.2.0',
    decision: 'APPROVED',
    reason: 'Candidate model passed all 8 automated performance, quality, and segment guardrails.',
    overallVerdict: true,
    gatesEvaluated: [
      {
        gateId: 'GATE_01_OVERALL_WAPE',
        description: 'Candidate aggregate WAPE must not exceed the operational threshold ceiling',
        threshold: '<= 0.90',
        actualValue: '0.8321',
        passed: true,
        justification: 'Ensures inventory forecasting error does not create runaway replenishment deviations.',
      },
      {
        gateId: 'GATE_02_BASELINE_LIFT',
        description: 'Candidate must outperform naive seasonal Lag-7 baseline by defined minimum relative lift',
        threshold: '>= 5.0% relative lift',
        actualValue: '16.36% relative lift',
        passed: true,
        justification: 'Machine learning model must convincingly justify deployment overhead over simple retail heuristics.',
      },
      {
        gateId: 'GATE_03_EXPLAINED_VARIANCE',
        description: 'Candidate R-squared must indicate meaningful signal capture over mean prediction',
        threshold: '>= 0.05',
        actualValue: '0.1589',
        passed: true,
        justification: 'Protects against models that perform no better than constant horizontal projections.',
      },
      {
        gateId: 'GATE_04_HIGH_VOLUME_GUARDRAIL',
        description: 'Fast-moving revenue drivers must maintain tight WAPE guardrails',
        threshold: '<= 0.85',
        actualValue: '0.7384',
        passed: true,
        justification: 'Fast movers generate over 50% of volume; excessive error here severely damages cash flow.',
      },
      {
        gateId: 'GATE_05_MID_VOLUME_GUARDRAIL',
        description: 'Mid-velocity SKUs must adhere to bounded variance guardrail',
        threshold: '<= 0.95',
        actualValue: '0.8506',
        passed: true,
        justification: 'Maintains catalog consistency without permitting mid-tier margin erosion.',
      },
      {
        gateId: 'GATE_06_LOW_VOLUME_GUARDRAIL',
        description: 'Slow-moving intermittent SKUs must not exceed volatility tolerance threshold',
        threshold: '<= 1.40',
        actualValue: '1.2469',
        passed: true,
        justification: 'Accounts for zero-sales days while preventing extreme over-forecasting.',
      },
      {
        gateId: 'GATE_07_DATA_QUALITY_AUDIT',
        description: 'Training and inference datasets must pass automated integrity and quality checks',
        threshold: '<= 0 critical issues',
        actualValue: '0 issues detected',
        passed: true,
        justification: 'Corrupted or duplicate transactional data must never propagate into active models.',
      },
      {
        gateId: 'GATE_08_INTERVAL_COVERAGE_CALIBRATION',
        description: '80% nominal prediction intervals must demonstrate verified empirical coverage',
        threshold: '>= 70.0% test coverage',
        actualValue: '75.8% test coverage',
        passed: true,
        justification: 'Safety stock formulas rely directly on calibrated uncertainty bounds.',
      },
    ],
    summaryMetrics: {
      candidate_wape: 0.8321,
      baseline_wape: 0.9949,
      wape_lift_pct: 16.36,
      candidate_mae: 67.45,
      candidate_rmse: 186.58,
      candidate_r2: 0.1589,
      empirical_coverage_pct: 75.8,
    },
    mlflowRegistration: {
      registered_model: 'morrow_demand_forecasting_model',
      version: 2,
      alias: '@production',
      tracking_uri: 'sqlite:///mlruns.db',
    },
    rollbackTarget: {
      backup_path: 'backend/models/archived/random_forest_demand_prev_20261012_211924.joblib',
      archived_at: '2026-10-13T02:49:24Z',
      description: 'Pre-promotion snapshot for fast single-command rollback.',
    },
  };
}

// ─── Data Quality Audit Mock ───────────────────────────────────────────────
export function generateDataQualityAudit(): DataQualityAuditResponse {
  return {
    timestamp: '2026-10-13T02:52:24Z',
    status: 'WARNING',
    totalRecordsAudited: 18700,
    modeledSkuCount: 50,
    dateRange: {
      start: '2010-12-01',
      end: '2011-12-09',
      expected_calendar_days: 374,
    },
    integrityMetrics: {
      duplicate_records: 0,
      missing_calendar_dates: 0,
      negative_quantities: 0,
      null_quantities: 0,
      invalid_unit_prices: 0,
      skus_with_gap_days_count: 0,
    },
    spikeDetection: {
      threshold_iqr_multiplier: 5.0,
      total_spikes_detected: 10,
      sample_spikes: [
        { sku: '85123A', date: '2011-11-04', quantity: 840, spike_threshold: 480.0, multiplier_over_median: 5.8 },
        { sku: '22423', date: '2011-11-18', quantity: 390, spike_threshold: 210.0, multiplier_over_median: 6.2 },
        { sku: '84879', date: '2011-12-02', quantity: 512, spike_threshold: 310.0, multiplier_over_median: 5.4 },
      ],
    },
    criticalIssuesCount: 0,
    criticalIssues: [],
    warningIssues: [
      'Detected 10 single-day transaction volume spikes (> 5x IQR) during Q4 Black Friday trading window.',
    ],
  };
}

// ─── Feature Drift (PSI) Mock ──────────────────────────────────────────────
export function generateFeatureDrift(): FeatureDriftResponse {
  return {
    timestamp: '2026-10-13T02:52:25Z',
    method: 'Population Stability Index (PSI)',
    overallStatus: 'DRIFT_DETECTED',
    averageFeaturePsi: 0.077,
    thresholds: {
      stable_threshold: 0.1,
      warning_threshold: 0.25,
      significant_drift_threshold: 0.25,
    },
    windows: {
      baseline_window: {
        start: '2011-09-01',
        end: '2011-10-15',
        sample_count: 2200,
        description: 'Validation split feature distributions',
      },
      monitoring_window: {
        start: '2011-10-15',
        sample_count: 2800,
        description: 'Held-out test / live inference feature distributions',
      },
    },
    featuresEvaluatedCount: 5,
    featuresInDrift: ['rolling_mean_28'],
    featuresInWarning: ['lag_1'],
    featureMetrics: {
      lag_1: {
        featureName: 'lag_1',
        psi: 0.1142,
        status: 'MODERATE_SHIFT',
        interpretation: 'Noticeable distribution movement detected entering Q4 peak.',
        baselineMean: 48.6,
        targetMean: 62.4,
        baselineStd: 112.5,
        targetStd: 145.2,
      },
      lag_7: {
        featureName: 'lag_7',
        psi: 0.0485,
        status: 'STABLE',
        interpretation: 'Minimal distribution shift; seasonal weekly periodicity remains consistent.',
        baselineMean: 49.2,
        targetMean: 58.7,
        baselineStd: 110.1,
        targetStd: 138.4,
      },
      rolling_mean_7: {
        featureName: 'rolling_mean_7',
        psi: 0.0521,
        status: 'STABLE',
        interpretation: 'Short-term rolling velocity remains consistent with validation split.',
        baselineMean: 51.3,
        targetMean: 60.1,
        baselineStd: 88.4,
        targetStd: 104.2,
      },
      rolling_mean_28: {
        featureName: 'rolling_mean_28',
        psi: 0.2618,
        status: 'SIGNIFICANT_DRIFT',
        interpretation: 'Substantial distribution shift due to Q4 holiday retail surge. Requires domain investigation.',
        baselineMean: 46.8,
        targetMean: 68.9,
        baselineStd: 65.3,
        targetStd: 92.1,
      },
      unit_price: {
        featureName: 'unit_price',
        psi: 0.0084,
        status: 'STABLE',
        interpretation: 'Catalog pricing structure remains stable across observation windows.',
        baselineMean: 3.45,
        targetMean: 3.48,
        baselineStd: 4.12,
        targetStd: 4.09,
      },
    },
    operationalGuidance: {
      retraining_philosophy:
        'CRITICAL PRINCIPLE: Feature distribution drift does NOT automatically imply that retraining is required. In retail, seasonal shopping patterns and holiday promotions regularly alter input distributions. Drift must be treated as a trigger for investigative triage and residual validation rather than an automated retraining command.',
      recommended_investigation_steps: [
        '1. Cross-reference high-PSI features with known retail events (e.g. Q4 Black Friday surge).',
        '2. Check whether model forecast residuals (WAPE, MAE) degraded on the drifted SKUs.',
        '3. If downstream accuracy remains resilient, do not trigger retraining; update reference baseline.',
        '4. If forecast accuracy deteriorated alongside drift, validate new training window before retraining.',
      ],
      limitations_note:
        'PSI evaluates marginal distribution shifts relative to training/validation baselines. It does not capture multidimensional interactions, and high PSI does not automatically imply forecast degradation if the shift aligns with known promotional or seasonal calendars.',
    },
  };
}

// ─── Realized Performance Monitoring Mock ──────────────────────────────────
export function generatePerformanceMonitoring(): PerformanceMonitoringResponse {
  return {
    timestamp: '2026-10-13T02:52:25Z',
    modelPath: 'backend/models/random_forest_demand.joblib',
    evaluationPeriod: {
      start: '2011-10-15',
      end: '2011-12-09',
      total_test_observations: 2800,
    },
    overallTestWape: 0.8321,
    overallTestMae: 67.45,
    rollingWindowPerformance: [
      {
        window_name: 'Last 7 Days',
        window_days: 7,
        start_date: '2011-12-02',
        end_date: '2011-12-09',
        sample_count: 350,
        mae: 71.2,
        rmse: 198.4,
        wape: 0.812,
        wape_pct: 81.2,
        bias_direction: 'BALANCED',
        bias_pct: 2.1,
        status: 'HEALTHY',
      },
      {
        window_name: 'Last 14 Days',
        window_days: 14,
        start_date: '2011-11-25',
        end_date: '2011-12-09',
        sample_count: 700,
        mae: 69.8,
        rmse: 192.1,
        wape: 0.825,
        wape_pct: 82.5,
        bias_direction: 'BALANCED',
        bias_pct: -1.8,
        status: 'HEALTHY',
      },
      {
        window_name: 'Last 30 Days',
        window_days: 30,
        start_date: '2011-11-09',
        end_date: '2011-12-09',
        sample_count: 1500,
        mae: 68.1,
        rmse: 187.9,
        wape: 0.834,
        wape_pct: 83.4,
        bias_direction: 'BALANCED',
        bias_pct: 0.5,
        status: 'HEALTHY',
      },
    ],
    totalSkusMonitored: 50,
    highErrorSkusCount: 6,
    topChallengingSkus: [
      {
        sku: '84077',
        description: 'WORLD WAR 2 GLIDERS ASSTD DESIGNS',
        total_demand: 1820,
        observation_days: 56,
        mae: 84.2,
        rmse: 215.1,
        wape: 1.18,
        wape_pct: 118.0,
        status: 'HIGH_ERROR',
      },
      {
        sku: '22197',
        description: 'SMALL POPCORN HOLDER',
        total_demand: 2450,
        observation_days: 56,
        mae: 78.4,
        rmse: 195.8,
        wape: 1.09,
        wape_pct: 109.0,
        status: 'HIGH_ERROR',
      },
    ],
    topPerformingSkus: [
      {
        sku: '85123A',
        description: 'WHITE HANGING HEART T-LIGHT HOLDER',
        total_demand: 4890,
        observation_days: 56,
        mae: 42.1,
        rmse: 98.4,
        wape: 0.58,
        wape_pct: 58.0,
        status: 'EXCELLENT',
      },
    ],
  };
}

// ─── Service Monitoring Mock ───────────────────────────────────────────────
export function generateServiceMonitoring(): ServiceMonitoringResponse {
  return {
    timestamp: '2026-10-13T02:52:25Z',
    uptimeSeconds: 8420.5,
    serviceStatus: 'HEALTHY',
    requestMetrics: {
      total_requests: 1248,
      status_breakdown: { '2xx': 1238, '4xx': 10, '5xx': 0 },
      error_rate_pct: 0.8,
    },
    latencyMs: {
      mean: 18.4,
      p50: 14.2,
      p95: 42.8,
      p99: 88.5,
      sample_size: 1000,
    },
    modelHealth: {
      loaded: true,
      model_version: 'v1.2.0',
      load_time_ms: 38.2,
      last_load_timestamp: '2026-10-13T02:49:24Z',
      load_failures_count: 0,
    },
    systemResources: {
      process_memory_mb: 142.6,
    },
    topEndpoints: [
      { endpoint: 'GET /api/forecast', hits: 512 },
      { endpoint: 'GET /api/recommendations/restock', hits: 340 },
      { endpoint: 'GET /api/inventory/backtest', hits: 182 },
      { endpoint: 'GET /api/monitoring/alerts', hits: 114 },
    ],
  };
}

// ─── Operational Alerts Mock ───────────────────────────────────────────────
export function generateOperationalAlerts(): AlertsListResponse {
  return {
    timestamp: '2026-10-13T02:52:25Z',
    totalAlerts: 3,
    alerts: [
      {
        alertId: 'ALT-DRIFT-HIGH-001',
        timestamp: '2026-10-13T02:52:25Z',
        category: 'feature_drift',
        severity: 'WARNING',
        whatChanged: 'Significant distribution shift (PSI = 0.2618) observed in feature: rolling_mean_28.',
        affectedEntities: ['feature:rolling_mean_28', 'model:v1.2.0'],
        recommendedAction:
          'INVESTIGATION TRIGGER ONLY — DO NOT automatically trigger retraining. Check whether shift coincides with Q4 holiday shopping surge. Validate realized forecast residuals before deciding on retraining.',
        status: 'INVESTIGATING',
      },
      {
        alertId: 'ALT-DQ-SPIKE-002',
        timestamp: '2026-10-13T02:52:24Z',
        category: 'data_quality',
        severity: 'WARNING',
        whatChanged: 'Detected 10 single-day transaction volume spikes exceeding 5x SKU Interquartile Range.',
        affectedEntities: ['85123A', '22423', '84879'],
        recommendedAction:
          'Verify with commercial merchandising if bulk wholesale orders or clearance promotions occurred before updating baseline safety stocks.',
        status: 'ACTIVE',
      },
      {
        alertId: 'ALT-PERF-WAPE-003',
        timestamp: '2026-10-13T02:52:25Z',
        category: 'forecast_performance',
        severity: 'WARNING',
        whatChanged: 'Elevated realized error on SKU 84077 (WORLD WAR 2 GLIDERS): WAPE reached 118.0%.',
        affectedEntities: ['84077'],
        recommendedAction:
          'Inspect whether supplier lead-time buffers or intermittent sales patterns caused stockouts; consider switching to Croston or intermittent safety stock rules.',
        status: 'ACTIVE',
      },
    ],
  };
}

// ─── Feedback Log Mock ─────────────────────────────────────────────────────
export function generateFeedbackLog(): FeedbackLogEntry[] {
  return [
    {
      feedbackId: 'FB-7A1B2C3D',
      forecastTimestamp: '2026-09-29T10:00:00Z',
      modelVersion: 'v1.2.0',
      sku: '85123A',
      forecastHorizonDays: 14,
      forecastQuantity: 420.0,
      recommendedOrderQuantity: 350,
      assumedCurrentStock: 120,
      reorderPoint: 180,
      safetyStock: 45,
      supplierLeadTime: 4,
      eventualActualDemand: 445.0,
      eventualStockoutOccurred: false,
      outcomeError: 25.0,
      notes: 'Restock recommendation executed on schedule. No stockout recorded.',
      loggedAt: '2026-09-29T10:00:00Z',
    },
    {
      feedbackId: 'FB-9E8F7A6B',
      forecastTimestamp: '2026-10-03T14:30:00Z',
      modelVersion: 'v1.2.0',
      sku: '22423',
      forecastHorizonDays: 7,
      forecastQuantity: 185.0,
      recommendedOrderQuantity: 200,
      assumedCurrentStock: 40,
      reorderPoint: 95,
      safetyStock: 30,
      supplierLeadTime: 3,
      eventualActualDemand: 178.0,
      eventualStockoutOccurred: false,
      outcomeError: -7.0,
      notes: 'Tight forecast accuracy (+/- 4%). Service level maintained at 100%.',
      loggedAt: '2026-10-03T14:30:00Z',
    },
    {
      feedbackId: 'FB-3C4D5E6F',
      forecastTimestamp: '2026-10-08T09:15:00Z',
      modelVersion: 'v1.2.0',
      sku: '84879',
      forecastHorizonDays: 7,
      forecastQuantity: 210.0,
      recommendedOrderQuantity: 180,
      assumedCurrentStock: 25,
      reorderPoint: 110,
      safetyStock: 35,
      supplierLeadTime: 5,
      eventualActualDemand: 260.0,
      eventualStockoutOccurred: true,
      outcomeError: 50.0,
      notes: 'Sudden promotional lift caused brief 1-day stockout before purchase order arrived.',
      loggedAt: '2026-10-08T09:15:00Z',
    },
  ];
}


