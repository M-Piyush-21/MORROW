import type { RestockRecommendation, Product } from '@/types';

export function calculateReorderPoint(
  averageDailyDemand: number,
  leadTimeDays: number,
  safetyStock: number,
): number {
  return Math.round(averageDailyDemand * leadTimeDays) + safetyStock;
}

export function calculateRecommendedOrderQuantity(
  targetStockLevel: number,
  currentStock: number,
): number {
  return Math.max(0, targetStockLevel - currentStock);
}

export function calculateDaysUntilStockout(
  currentStock: number,
  averageDailyDemand: number,
): number | null {
  if (averageDailyDemand <= 0) return null;
  return Math.floor(currentStock / averageDailyDemand);
}

export function recalculateRecommendation(
  product: Product,
  leadTimeDays: number,
  safetyStock: number,
): RestockRecommendation {
  const forecastDemandDuringLeadTime = Math.round(
    product.averageDailyDemand * leadTimeDays,
  );
  const reorderPoint = calculateReorderPoint(
    product.averageDailyDemand,
    leadTimeDays,
    safetyStock,
  );
  const recommendedOrderQuantity = calculateRecommendedOrderQuantity(
    product.targetStockLevel,
    product.currentStock,
  );

  const daysUntilStockout = calculateDaysUntilStockout(
    product.currentStock,
    product.averageDailyDemand,
  );

  let estimatedStockoutDate: string | null = null;
  if (daysUntilStockout !== null && daysUntilStockout >= 0) {
    const date = new Date('2026-09-25');
    date.setDate(date.getDate() + daysUntilStockout);
    estimatedStockoutDate = date.toISOString().split('T')[0];
  }

  let priority: 'high' | 'medium' | 'low' = 'low';
  if (product.status === 'out-of-stock' || product.status === 'critical') priority = 'high';
  else if (product.status === 'low-stock') priority = 'medium';

  let reason = 'Stock level is healthy.';
  if (product.status === 'out-of-stock') {
    reason = 'Product is out of stock. Immediate restock required.';
  } else if (product.status === 'critical') {
    reason = `Critical stock level. Only ${daysUntilStockout} days of inventory remaining.`;
  } else if (product.status === 'low-stock') {
    reason = `Below reorder point. ${daysUntilStockout} days of inventory remaining.`;
  } else if (product.currentStock <= reorderPoint) {
    reason = 'Approaching reorder point based on current demand.';
  }

  return {
    productId: product.id,
    product,
    currentStock: product.currentStock,
    forecastDemandDuringLeadTime,
    safetyStock,
    reorderPoint,
    recommendedOrderQuantity,
    supplierLeadTime: leadTimeDays,
    priority,
    reason,
    estimatedStockoutDate,
    daysUntilStockout,
  };
}
