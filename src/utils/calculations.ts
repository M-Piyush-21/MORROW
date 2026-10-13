import type { RestockRecommendation, Product, DecisionConstraints } from '@/types';

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
  moq: number = 10,
  batchSize: number = 5,
  maxCapacity: number = 500,
): { recommendedQty: number; unconstrainedQty: number; constraints: DecisionConstraints } {
  const unconstrainedQty = Math.max(0, targetStockLevel - currentStock);
  let recommendedQty = unconstrainedQty;
  let moqTriggered = false;
  let batchRoundingApplied = false;
  let maxCapacityCapped = false;

  if (recommendedQty > 0 && recommendedQty < moq) {
    recommendedQty = moq;
    moqTriggered = true;
  }
  if (batchSize > 1 && recommendedQty > 0) {
    const remainder = recommendedQty % batchSize;
    if (remainder !== 0) {
      recommendedQty += (batchSize - remainder);
      batchRoundingApplied = true;
    }
  }
  if (currentStock + recommendedQty > maxCapacity) {
    recommendedQty = Math.max(0, maxCapacity - currentStock);
    maxCapacityCapped = true;
  }

  return {
    recommendedQty,
    unconstrainedQty,
    constraints: {
      moq,
      batchSize,
      maxCapacity,
      moqTriggered,
      batchRoundingApplied,
      maxCapacityCapped,
    },
  };
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
  moq: number = 15,
  batchSize: number = 5,
): RestockRecommendation {
  const forecastDemandDuringLeadTime = Math.round(
    product.averageDailyDemand * leadTimeDays,
  );
  const reorderPoint = calculateReorderPoint(
    product.averageDailyDemand,
    leadTimeDays,
    safetyStock,
  );
  const maxCapacity = Math.max(product.targetStockLevel * 2, 500);

  const { recommendedQty, unconstrainedQty, constraints } = calculateRecommendedOrderQuantity(
    product.targetStockLevel,
    product.currentStock,
    moq,
    batchSize,
    maxCapacity,
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

  const shouldReorder = product.currentStock <= reorderPoint;

  let priority: 'high' | 'medium' | 'low' = 'low';
  if (product.status === 'out-of-stock' || product.status === 'critical') priority = 'high';
  else if (product.status === 'low-stock' || shouldReorder) priority = 'medium';

  let reason = 'Stock level is healthy.';
  if (product.status === 'out-of-stock') {
    reason = 'Product is out of stock. Immediate replenishment order required.';
  } else if (product.status === 'critical') {
    reason = `Critical stock level. Only ${daysUntilStockout} days of inventory remaining.`;
  } else if (product.status === 'low-stock') {
    reason = `Below reorder point (${reorderPoint} units). Restock to maintain safety stock buffer.`;
  } else if (shouldReorder) {
    reason = `Stock position (${product.currentStock}) has reached reorder point (${reorderPoint} units).`;
  }

  return {
    productId: product.id,
    product,
    currentStock: product.currentStock,
    inTransitStock: 0,
    inventoryPosition: product.currentStock,
    forecastDemandDuringLeadTime,
    safetyStock,
    reorderPoint,
    recommendedOrderQuantity: shouldReorder ? recommendedQty : 0,
    unconstrainedOrderQuantity: unconstrainedQty,
    supplierLeadTime: leadTimeDays,
    priority,
    reason,
    shouldReorder,
    estimatedStockoutDate,
    daysUntilStockout,
    constraints,
    problemStatement:
      'Reduce avoidable stockouts and excess stock while balancing service level, inventory holding cost, and ordering cost.',
  };
}
