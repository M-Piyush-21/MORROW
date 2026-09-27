// Centralized API configuration and client for Morrow FastAPI backend
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
import {
  products as fallbackProducts,
  getProductById as fallbackGetProductById,
  generateForecastData,
  generateRestockRecommendations,
  generateDashboardSummary,
  modelMetrics as fallbackModelMetrics,
  modelComparison as fallbackModelComparison,
  experimentHistory as fallbackExperimentHistory,
  modelVersions as fallbackModelVersions,
  generateActualVsPredicted,
  getSalesForProduct,
  allDailySales,
  categories as fallbackCategories,
  suppliers as fallbackSuppliers,
  categoryNameById,
  supplierNameById,
} from '@/data/mockData';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

export async function checkBackendHealth(): Promise<{ isOnline: boolean; details?: any }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      return { isOnline: true, details: data };
    }
    return { isOnline: false };
  } catch {
    return { isOnline: false };
  }
}

// Generic fetcher with fallback for resilient operations
async function fetchWithFallback<T>(
  endpoint: string,
  fallbackFn: () => T | Promise<T>,
  timeoutMs: number = 4000,
): Promise<T> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // If backend is offline or timed out, fallback to local cache
  }
  return await fallbackFn();
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return fetchWithFallback('/dashboard/summary', () => generateDashboardSummary());
}

// ─── Products ──────────────────────────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  return fetchWithFallback('/products', () => [...fallbackProducts]);
}

export async function getProductByIdAsync(id: string): Promise<Product | undefined> {
  return fetchWithFallback(
    `/products/${id}`,
    () => fallbackGetProductById(id),
  );
}

export async function getCategories(): Promise<Category[]> {
  return fetchWithFallback('/categories', () => [...fallbackCategories]);
}

export async function getSuppliers(): Promise<Supplier[]> {
  return fetchWithFallback('/suppliers', () => [...fallbackSuppliers]);
}

// ─── Demand Forecast ──────────────────────────────────────────────────────
export async function getDemandForecast(
  productId: string,
  horizon: number,
): Promise<DemandForecast | null> {
  return fetchWithFallback(
    `/forecast/${productId}?horizon=${horizon}`,
    () => generateForecastData(productId, horizon),
  );
}

// ─── Sales ────────────────────────────────────────────────────────────────
export async function getProductSales(
  productId: string,
  days: number = 90,
): Promise<DailySales[]> {
  return fetchWithFallback(
    `/sales/${productId}?days=${days}`,
    () => getSalesForProduct(productId, days),
  );
}

export async function getAllSales(): Promise<DailySales[]> {
  return [...allDailySales];
}

// ─── Restock Recommendations ──────────────────────────────────────────────
export async function getRestockRecommendations(): Promise<RestockRecommendation[]> {
  return fetchWithFallback(
    '/recommendations/restock',
    () => generateRestockRecommendations(),
  );
}

// ─── Model Performance ────────────────────────────────────────────────────
export async function getModelMetrics(): Promise<ModelMetrics> {
  return fetchWithFallback(
    '/model/metrics',
    () => fallbackModelMetrics,
  );
}

export async function getModelComparison(): Promise<ModelComparisonRow[]> {
  return fetchWithFallback(
    '/model/comparison',
    () => [...fallbackModelComparison],
  );
}

export async function getExperimentHistory(): Promise<ExperimentRun[]> {
  return fetchWithFallback(
    '/model/experiments',
    () => [...fallbackExperimentHistory],
  );
}

export async function getModelVersions(): Promise<ModelVersion[]> {
  return fetchWithFallback(
    '/model/versions',
    () => [...fallbackModelVersions],
  );
}

export async function getActualVsPredicted(productId: string): Promise<ActualVsPredictedPoint[]> {
  return fetchWithFallback(
    `/model/actual-vs-predicted/${productId}`,
    () => generateActualVsPredicted(productId),
  );
}

export { categoryNameById, supplierNameById };
