import {
  products,
  getProductById,
  generateForecastData,
  generateRestockRecommendations,
  generateDashboardSummary,
  modelMetrics,
  modelComparison,
  experimentHistory,
  modelVersions,
  generateActualVsPredicted,
  getSalesForProduct,
  allDailySales,
  categories,
  suppliers,
  categoryNameById,
  supplierNameById,
} from '@/data/mockData';
import { API_BASE_URL, USING_MOCK_DATA } from '@/services/api';
import type {
  Product,
  DemandForecast,
  RestockRecommendation,
  DashboardSummary,
  ModelMetrics,
  ModelComparisonRow,
  ExperimentRun,
  ModelVersion,
  ActualVsPredictedPoint,
  DailySales,
  Category,
  Supplier,
} from '@/types';

// Simulate network latency
function delay<T>(data: T, ms: number = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (USING_MOCK_DATA) {
    return delay(generateDashboardSummary(), 400);
  }
  const res = await fetch(`${API_BASE_URL}/dashboard/summary`);
  if (!res.ok) throw new Error('Failed to fetch dashboard summary');
  return res.json();
}

// ─── Products ──────────────────────────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  if (USING_MOCK_DATA) {
    return delay([...products], 300);
  }
  const res = await fetch(`${API_BASE_URL}/products`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function getProductByIdAsync(id: string): Promise<Product | undefined> {
  if (USING_MOCK_DATA) {
    return delay(getProductById(id), 200);
  }
  const res = await fetch(`${API_BASE_URL}/products/${id}`);
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

export async function getCategories(): Promise<Category[]> {
  return delay([...categories], 100);
}

export async function getSuppliers(): Promise<Supplier[]> {
  return delay([...suppliers], 100);
}

// ─── Demand Forecast ──────────────────────────────────────────────────────
export async function getDemandForecast(
  productId: string,
  horizon: number,
): Promise<DemandForecast | null> {
  if (USING_MOCK_DATA) {
    return delay(generateForecastData(productId, horizon), 800);
  }
  const res = await fetch(`${API_BASE_URL}/forecast/${productId}?horizon=${horizon}`);
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
}

// ─── Sales ────────────────────────────────────────────────────────────────
export async function getProductSales(
  productId: string,
  days: number = 90,
): Promise<DailySales[]> {
  if (USING_MOCK_DATA) {
    return delay(getSalesForProduct(productId, days), 300);
  }
  const res = await fetch(`${API_BASE_URL}/sales/${productId}?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch sales');
  return res.json();
}

export async function getAllSales(): Promise<DailySales[]> {
  return delay([...allDailySales], 200);
}

// ─── Restock Recommendations ──────────────────────────────────────────────
export async function getRestockRecommendations(): Promise<RestockRecommendation[]> {
  if (USING_MOCK_DATA) {
    return delay(generateRestockRecommendations(), 500);
  }
  const res = await fetch(`${API_BASE_URL}/recommendations`);
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  return res.json();
}

// ─── Model Performance ────────────────────────────────────────────────────
export async function getModelMetrics(): Promise<ModelMetrics> {
  if (USING_MOCK_DATA) {
    return delay(modelMetrics, 300);
  }
  const res = await fetch(`${API_BASE_URL}/model/metrics`);
  if (!res.ok) throw new Error('Failed to fetch model metrics');
  return res.json();
}

export async function getModelComparison(): Promise<ModelComparisonRow[]> {
  if (USING_MOCK_DATA) {
    return delay([...modelComparison], 300);
  }
  const res = await fetch(`${API_BASE_URL}/model/comparison`);
  if (!res.ok) throw new Error('Failed to fetch model comparison');
  return res.json();
}

export async function getExperimentHistory(): Promise<ExperimentRun[]> {
  if (USING_MOCK_DATA) {
    return delay([...experimentHistory], 400);
  }
  const res = await fetch(`${API_BASE_URL}/model/experiments`);
  if (!res.ok) throw new Error('Failed to fetch experiment history');
  return res.json();
}

export async function getModelVersions(): Promise<ModelVersion[]> {
  if (USING_MOCK_DATA) {
    return delay([...modelVersions], 300);
  }
  const res = await fetch(`${API_BASE_URL}/model/versions`);
  if (!res.ok) throw new Error('Failed to fetch model versions');
  return res.json();
}

export async function getActualVsPredicted(productId: string): Promise<ActualVsPredictedPoint[]> {
  if (USING_MOCK_DATA) {
    return delay(generateActualVsPredicted(productId), 400);
  }
  const res = await fetch(`${API_BASE_URL}/model/actual-vs-predicted/${productId}`);
  if (!res.ok) throw new Error('Failed to fetch actual vs predicted');
  return res.json();
}

// ─── Helper exports ──────────────────────────────────────────────────────
export { categoryNameById, supplierNameById };
