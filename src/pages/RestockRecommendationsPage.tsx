import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Calculator,
  Calendar,
  TrendingUp,
  Info,
  Filter,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { getRestockRecommendations } from '@/services/mockApi';
import { useApp } from '@/context/AppContext';
import { recalculateRecommendation } from '@/utils/calculations';
import { formatNumber, formatShortDate, formatCurrency } from '@/utils/format';
import type { RestockRecommendation, Priority } from '@/types';
import { PriorityBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { getSalesForProduct, categoryNameById, supplierNameById } from '@/data/mockData';
import { toast } from 'sonner';

export function RestockRecommendationsPage() {
  const { products, settings } = useApp();
  const [recommendations, setRecommendations] = useState<RestockRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedRec, setSelectedRec] = useState<RestockRecommendation | null>(null);

  useEffect(() => {
    getRestockRecommendations().then((data) => {
      setRecommendations(data);
      setLoading(false);
    });
  }, [products]);

  const filtered = useMemo(() => {
    return recommendations.filter((r) => {
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && r.product.categoryId !== categoryFilter) return false;
      return true;
    });
  }, [recommendations, priorityFilter, categoryFilter]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.categoryId));
    return Array.from(set);
  }, [products]);

  const handleOrder = (rec: RestockRecommendation) => {
    toast.success('Restock order created', {
      description: `${rec.product.name}: ${rec.recommendedOrderQuantity} units ordered from ${supplierNameById(rec.product.supplierId)}.`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Restock Recommendations</h2>
        <p className="text-sm text-muted-foreground">
          AI-driven restocking suggestions based on demand forecasts and lead times.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Reorder Point</span> = Expected Demand During Lead Time + Safety Stock ·{' '}
          <span className="font-medium text-foreground">Suggested Order Qty</span> = max(0, Target Stock Level − Current Stock)
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[140px] gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((catId) => (
              <SelectItem key={catId} value={catId}>{categoryNameById(catId)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Lead Time Demand</TableHead>
                <TableHead className="text-right">Safety Stock</TableHead>
                <TableHead className="text-right">Reorder Point</TableHead>
                <TableHead className="text-right">Order Qty</TableHead>
                <TableHead className="text-right">Lead Time</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((rec) => (
                <TableRow
                  key={rec.productId}
                  className="cursor-pointer hover:bg-secondary/30"
                  onClick={() => setSelectedRec(rec)}
                >
                  <TableCell className="font-medium">{rec.product.name}</TableCell>
                  <TableCell className="text-right">{formatNumber(rec.currentStock)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{rec.forecastDemandDuringLeadTime}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{rec.safetyStock}</TableCell>
                  <TableCell className="text-right font-medium">{rec.reorderPoint}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-primary">{formatNumber(rec.recommendedOrderQuantity)}</span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{rec.supplierLeadTime}d</TableCell>
                  <TableCell><PriorityBadge priority={rec.priority} /></TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{rec.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-muted-foreground">No recommendations found</p>
            <p className="text-xs text-muted-foreground">All products are well stocked</p>
          </div>
        )}
      </Card>

      {/* Detail Drawer */}
      <RecommendationDetailDrawer
        rec={selectedRec}
        open={!!selectedRec}
        onClose={() => setSelectedRec(null)}
        onOrder={handleOrder}
        currency={settings.currency}
      />
    </div>
  );
}

// ─── Recommendation Detail Drawer ─────────────────────────────────────────
function RecommendationDetailDrawer({
  rec, open, onClose, onOrder, currency,
}: {
  rec: RestockRecommendation | null;
  open: boolean;
  onClose: () => void;
  onOrder: (rec: RestockRecommendation) => void;
  currency: string;
}) {
  const [leadTime, setLeadTime] = useState(5);
  const [safetyStock, setSafetyStock] = useState(20);

  useEffect(() => {
    if (rec) {
      setLeadTime(rec.supplierLeadTime);
      setSafetyStock(rec.safetyStock);
    }
  }, [rec]);

  if (!rec) return null;

  const recalculated = recalculateRecommendation(rec.product, leadTime, safetyStock);
  const sales = getSalesForProduct(rec.productId, 14);
  const chartData = sales.map((s) => ({
    date: formatShortDate(s.date),
    quantity: s.quantity,
  }));

  // Timeline calculation
  const today = new Date('2026-09-25');
  const stockoutDate = recalculated.estimatedStockoutDate
    ? new Date(recalculated.estimatedStockoutDate)
    : null;
  const daysToStockout = recalculated.daysUntilStockout ?? 0;
  const daysToRestock = leadTime;
  const bufferDays = daysToStockout - daysToRestock;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle className="text-lg">{rec.product.name}</SheetTitle>
          <SheetDescription>{rec.product.sku} · {categoryNameById(rec.product.categoryId)}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          {/* Priority badge */}
          <div className="flex items-center gap-2">
            <PriorityBadge priority={recalculated.priority} />
            <Badge variant="outline" className="text-xs">
              {supplierNameById(rec.product.supplierId)}
            </Badge>
          </div>

          {/* Reason */}
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-xs leading-relaxed text-muted-foreground">{recalculated.reason}</p>
          </div>

          {/* Recent demand chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold mb-2">Recent Demand (14 days)</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="recDemand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(210, 70%, 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(210, 70%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={3} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '0.5rem' }} />
                <Area type="monotone" dataKey="quantity" name="Units Sold" stroke="hsl(210, 70%, 50%)" strokeWidth={2} fill="url(#recDemand)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Editable inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Supplier Lead Time (days)</Label>
              <Input
                type="number"
                value={leadTime}
                onChange={(e) => setLeadTime(Math.max(1, Number(e.target.value)))}
                min={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Safety Stock (units)</Label>
              <Input
                type="number"
                value={safetyStock}
                onChange={(e) => setSafetyStock(Math.max(0, Number(e.target.value)))}
                min={0}
              />
            </div>
          </div>

          {/* Calculation breakdown */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Calculation Breakdown</p>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">Avg Daily Demand</span>
                <span className="font-medium">{rec.product.averageDailyDemand} units</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">× Lead Time</span>
                <span className="font-medium">{leadTime} days</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">= Demand During Lead Time</span>
                <span className="font-medium">{recalculated.forecastDemandDuringLeadTime} units</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-muted-foreground">+ Safety Stock</span>
                <span className="font-medium">{safetyStock} units</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-primary font-medium">= Reorder Point</span>
                <span className="font-bold text-primary">{recalculated.reorderPoint} units</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-muted-foreground">Target Stock Level</span>
                <span className="font-medium">{rec.product.targetStockLevel} units</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">− Current Stock</span>
                <span className="font-medium">{rec.product.currentStock} units</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t-2 border-primary/20">
                <span className="font-semibold text-foreground">Recommended Order Qty</span>
                <span className="text-lg font-bold text-primary">{formatNumber(recalculated.recommendedOrderQuantity)} units</span>
              </div>
            </div>
          </div>

          {/* Stockout timeline */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-warning" />
              <p className="text-sm font-semibold">Estimated Stockout Timeline</p>
            </div>
            <div className="relative h-12 rounded-full bg-secondary overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full ${bufferDays > 0 ? 'bg-success/30' : 'bg-destructive/30'}`}
                style={{ width: `${Math.min(100, (daysToStockout / (daysToStockout + leadTime)) * 100)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium">
                <span>Today</span>
                <span className={bufferDays > 0 ? 'text-success' : 'text-destructive'}>
                  {daysToStockout > 0 ? `${daysToStockout}d to stockout` : 'Stocked out'}
                </span>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Stockout: {recalculated.estimatedStockoutDate ? formatShortDate(recalculated.estimatedStockoutDate) : 'N/A'}</span>
              <span className={bufferDays > 0 ? 'text-success' : 'text-destructive'}>
                {bufferDays > 0 ? `${bufferDays}d buffer before reorder arrives` : 'Reorder needed immediately'}
              </span>
            </div>
          </div>

          {/* Current stock vs reorder point */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Current Stock</p>
              <p className="text-base font-bold">{formatNumber(rec.product.currentStock)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Reorder Point</p>
              <p className="text-base font-bold text-warning">{recalculated.reorderPoint}</p>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
              <p className="text-xs text-muted-foreground">Order Qty</p>
              <p className="text-base font-bold text-primary">{formatNumber(recalculated.recommendedOrderQuantity)}</p>
            </div>
          </div>

          {/* Action */}
          <Button
            className="w-full gap-2"
            onClick={() => onOrder(recalculated)}
            disabled={recalculated.recommendedOrderQuantity === 0}
          >
            <ShoppingCart className="h-4 w-4" />
            Create Restock Order ({formatNumber(recalculated.recommendedOrderQuantity)} units)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
