import type { StockStatus, Priority, DateRangePreset } from '@/types';

export function formatCurrency(value: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
  return `$${value.toLocaleString('en-US')}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-IN');
}

export function formatDate(dateStr: string, format: string = 'DD/MM/YYYY'): string {
  const date = new Date(dateStr);
  if (format === 'DD/MM/YYYY') {
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  if (format === 'MM/DD/YYYY') {
    return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return date.toLocaleDateString();
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatRelativeTime(timestamp: string): string {
  const now = new Date('2026-09-25T09:00:00Z');
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export function getStockStatusColor(status: StockStatus): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (status) {
    case 'in-stock':
      return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20', label: 'In Stock' };
    case 'low-stock':
      return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20', label: 'Low Stock' };
    case 'critical':
      return { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20', label: 'Critical' };
    case 'out-of-stock':
      return { bg: 'bg-destructive/15', text: 'text-destructive', border: 'border-destructive/30', label: 'Out of Stock' };
  }
}

export function getPriorityColor(priority: Priority): {
  bg: string;
  text: string;
  label: string;
} {
  switch (priority) {
    case 'high':
      return { bg: 'bg-destructive/10', text: 'text-destructive', label: 'High' };
    case 'medium':
      return { bg: 'bg-warning/10', text: 'text-warning', label: 'Medium' };
    case 'low':
      return { bg: 'bg-success/10', text: 'text-success', label: 'Low' };
  }
}

export function computeStockStatus(stock: number, reorderPoint: number): StockStatus {
  if (stock <= 0) return 'out-of-stock';
  if (stock <= reorderPoint * 0.5) return 'critical';
  if (stock <= reorderPoint) return 'low-stock';
  return 'in-stock';
}

export function getDateRangeFromPreset(preset: DateRangePreset): { start: string; end: string } {
  const end = new Date('2026-09-25');
  const start = new Date(end);
  switch (preset) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '14d':
      start.setDate(start.getDate() - 14);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
  }
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}
