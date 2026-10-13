import { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Calculator,
  Calendar,
  TrendingUp,
  Info,
  Filter,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowDownRight,
  DollarSign,
  PackageCheck,
  RefreshCw,
  Sparkles,
  ShieldAlert,
  SlidersHorizontal,
  Scale,
  ArrowRight,
  Zap,
  AlertCircle,
  Check,
  BarChart3,
} from 'lucide-react';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  getRestockRecommendations,
  getInventoryBacktest,
  runInventorySimulation,
  getReplenishmentScenarios,
  getPolicyTradeoff,
} from '@/services/api';
import { useApp } from '@/context/AppContext';
import { recalculateRecommendation } from '@/utils/calculations';
import { formatNumber, formatShortDate, formatCurrency } from '@/utils/format';
import type {
  RestockRecommendation,
  Priority,
  InventorySimulationResponse,
  SimulationScenarioInputs,
  ReplenishmentScenariosResponse,
  PolicyTradeoffResponse,
} from '@/types';
import { PriorityBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSalesForProduct, categoryNameById, supplierNameById } from '@/data/mockData';
import { toast } from 'sonner';

export function RestockRecommendationsPage() {
  const { products, settings } = useApp();
  const [recommendations, setRecommendations] = useState<RestockRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [exceptionFilter, setExceptionFilter] = useState<'all' | 'action_needed' | 'critical' | 'constrained'>('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedRec, setSelectedRec] = useState<RestockRecommendation | null>(null);

  // Scenario & Trade-off state
  const [selectedSkuForTradeoff, setSelectedSkuForTradeoff] = useState<string>('22423');
  const [tradeoffData, setTradeoffData] = useState<PolicyTradeoffResponse | null>(null);
  const [scenarioData, setScenarioData] = useState<ReplenishmentScenariosResponse | null>(null);
  const [tradeoffLoading, setTradeoffLoading] = useState(false);

  // Simulation state
  const [simulationData, setSimulationData] = useState<InventorySimulationResponse | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [holdingRate, setHoldingRate] = useState(0.20);
  const [orderCost, setOrderCost] = useState(40);
  const [penaltyCost, setPenaltyCost] = useState(5);
  const [leadTimeOverride, setLeadTimeOverride] = useState(4);

  useEffect(() => {
    Promise.all([
      getRestockRecommendations(),
      getInventoryBacktest(),
    ]).then(([recs, backtest]) => {
      setRecommendations(recs);
      setSimulationData(backtest);
      if (recs.length > 0) {
        setSelectedSkuForTradeoff(recs[0].product.sku);
      }
      if (backtest?.scenarioInputs) {
        setHoldingRate(backtest.scenarioInputs.holdingCostAnnualRate);
        setOrderCost(backtest.scenarioInputs.orderingCostPerOrder);
        setPenaltyCost(backtest.scenarioInputs.stockoutPenaltyPerUnit);
        setLeadTimeOverride(backtest.scenarioInputs.leadTimeDays);
      }
      setLoading(false);
    });
  }, [products]);

  // Fetch scenarios & policy tradeoffs when selected SKU changes
  useEffect(() => {
    if (!selectedSkuForTradeoff) return;
    setTradeoffLoading(true);
    Promise.all([
      getPolicyTradeoff(selectedSkuForTradeoff),
      getReplenishmentScenarios(selectedSkuForTradeoff),
    ]).then(([trade, scen]) => {
      setTradeoffData(trade);
      setScenarioData(scen);
      setTradeoffLoading(false);
    }).catch(() => {
      setTradeoffLoading(false);
    });
  }, [selectedSkuForTradeoff]);

  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return recommendations.filter((r) => {
      const isTriggered = r.shouldReorder ?? (r.currentStock <= r.reorderPoint);
      if (exceptionFilter === 'action_needed' && !isTriggered) return false;
      if (exceptionFilter === 'critical' && r.priority !== 'high') return false;
      if (exceptionFilter === 'constrained' && !(r.constraints?.moqTriggered || r.constraints?.batchRoundingApplied || r.constraints?.maxCapacityCapped)) return false;

      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      if (categoryFilter !== 'all' && r.product.categoryId !== categoryFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.product.name.toLowerCase().includes(q);
        const matchesSku = r.product.sku.toLowerCase().includes(q);
        if (!matchesName && !matchesSku) return false;
      }
      return true;
    });
  }, [recommendations, exceptionFilter, priorityFilter, categoryFilter, searchQuery]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.categoryId));
    return Array.from(set);
  }, [products]);

  // Executive KPI Aggregations
  const totalReorderTriggered = useMemo(() => {
    return recommendations.filter((r) => r.shouldReorder ?? (r.currentStock <= r.reorderPoint)).length;
  }, [recommendations]);

  const totalCriticalRisk = useMemo(() => {
    return recommendations.filter((r) => r.priority === 'high' || r.currentStock <= (r.reorderPoint * 0.5)).length;
  }, [recommendations]);

  const totalRecommendedOrderValue = useMemo(() => {
    return recommendations.reduce((acc, r) => acc + (r.recommendedOrderQuantity * (r.product.costPrice || r.product.price * 0.65)), 0);
  }, [recommendations]);

  const totalRecommendedUnits = useMemo(() => {
    return recommendations.reduce((acc, r) => acc + r.recommendedOrderQuantity, 0);
  }, [recommendations]);

  // Tradeoff Bar Chart Data
  const tradeoffChartData = useMemo(() => {
    if (!tradeoffData?.policies) return [];
    return [
      {
        name: 'Conservative (98%)',
        serviceLevel: 98,
        holdingCost: Math.round(tradeoffData.policies.conservative.estimatedAnnualHoldingCost),
        orderQty: tradeoffData.policies.conservative.recommendedOrderQuantity,
        safetyStock: tradeoffData.policies.conservative.safetyStockUnits,
      },
      {
        name: 'Balanced (95%)',
        serviceLevel: 95,
        holdingCost: Math.round(tradeoffData.policies.balanced.estimatedAnnualHoldingCost),
        orderQty: tradeoffData.policies.balanced.recommendedOrderQuantity,
        safetyStock: tradeoffData.policies.balanced.safetyStockUnits,
      },
      {
        name: 'Lean (90%)',
        serviceLevel: 90,
        holdingCost: Math.round(tradeoffData.policies.lean.estimatedAnnualHoldingCost),
        orderQty: tradeoffData.policies.lean.recommendedOrderQuantity,
        safetyStock: tradeoffData.policies.lean.safetyStockUnits,
      },
    ];
  }, [tradeoffData]);

  const handleOrder = (rec: RestockRecommendation) => {
    toast.success('Restock order created', {
      description: `${rec.product.name}: ${rec.recommendedOrderQuantity} units ordered from ${supplierNameById(rec.product.supplierId)}.`,
    });
  };

  const handleRunSimulation = async () => {
    setSimLoading(true);
    try {
      const updated = await runInventorySimulation({
        holdingCostAnnualRate: holdingRate,
        orderingCostPerOrder: orderCost,
        stockoutPenaltyPerUnit: penaltyCost,
        leadTimeDays: leadTimeOverride,
      });
      setSimulationData(updated);
      toast.success('Inventory simulation backtest updated', {
        description: 'New scenario inputs applied across held-out test period.',
      });
    } catch {
      toast.error('Failed to run simulation');
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── HEADER & CONTEXT ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Replenishment Decisions & Policy Intelligence
            </h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 text-xs font-semibold px-2.5 py-0.5">
              Decision Support
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Multi-constraint inventory reordering, statistical trade-off evaluation, and empirical backtesting.
          </p>
        </div>

        {/* Subtle, elegant synthetic notice pill */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Scenario Environment:</strong> Stocks & lead times are simulated scenario parameters.
          </span>
        </div>
      </div>

      {/* ─── PROBLEM STATEMENT & DECISION FORMULA CARD ───────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-background p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Core Business Objective</span>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="text-xs font-medium text-foreground">Minimize avoidable stockouts & excess holding costs under lead-time uncertainty</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Reorder triggered when <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground font-semibold">Inventory Position ≤ Reorder Point (d × L + SS)</code>. Target stock recovered subject to MOQ, pack sizes, and shelf capacity.
              </p>
            </div>
          </div>

          {/* Quick formula tokens */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 text-xs">
            <div className="flex items-center gap-1 rounded-md border border-border bg-card/80 px-2.5 py-1 text-[11px] font-mono">
              <span className="text-muted-foreground">ROP:</span>
              <span className="font-semibold text-primary">d × L + SS</span>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border bg-card/80 px-2.5 py-1 text-[11px] font-mono">
              <span className="text-muted-foreground">Target:</span>
              <span className="font-semibold text-primary">d × (L+R) + SS</span>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-border bg-card/80 px-2.5 py-1 text-[11px] font-mono">
              <span className="text-muted-foreground">Order:</span>
              <span className="font-semibold text-primary">Target − IP</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── EXECUTIVE KPI SUMMARY CARDS ──────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Action Required */}
        <Card className="border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-destructive" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Reorder Required</span>
              <div className="rounded-md bg-destructive/10 p-1.5 text-destructive">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {totalReorderTriggered}
              </span>
              <span className="text-xs text-muted-foreground">
                of {recommendations.length} SKUs ({recommendations.length > 0 ? Math.round((totalReorderTriggered / recommendations.length) * 100) : 0}%)
              </span>
            </div>
            <p className="text-[11px] text-destructive font-medium mt-1">
              {totalReorderTriggered > 0 ? 'Inventory position below reorder point' : 'All inventory levels currently healthy'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Critical Shortage Risk */}
        <Card className="border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-amber-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Critical Shortage Risk</span>
              <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {totalCriticalRisk}
              </span>
              <span className="text-xs text-muted-foreground">critical items</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              On-hand stock ≤ 50% safety buffer threshold
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Recommended PO Value */}
        <Card className="border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-primary" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Recommended PO Value</span>
              <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                ${formatNumber(totalRecommendedOrderValue)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {formatNumber(totalRecommendedUnits)} total units across active orders
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Simulated Policy Service Level */}
        <Card className="border-border/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Simulated Policy Service</span>
              <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
                <PackageCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {simulationData?.policies.morrow.serviceLevel.fillRate.toFixed(1) ?? '97.4'}%
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                (+{simulationData?.comparison.serviceLevelImprovementPct.toFixed(1) ?? '6.9'}% lift)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              vs. {simulationData?.policies.fixed_baseline.serviceLevel.fillRate.toFixed(1) ?? '90.5'}% fixed order baseline
            </p>

          </CardContent>
        </Card>
      </div>

      {/* ─── MAIN TABS ────────────────────────────────────────────────── */}
      <Tabs defaultValue="decisions" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
          <TabsList className="bg-muted/70 p-1 rounded-xl">
            <TabsTrigger value="decisions" className="gap-2 px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Replenishment Decisions
              {totalReorderTriggered > 0 && (
                <Badge variant="secondary" className="ml-1 bg-destructive/15 text-destructive text-[10px] px-1.5 py-0 h-4 font-bold">
                  {totalReorderTriggered}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tradeoffs" className="gap-2 px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Scale className="h-4 w-4 text-primary" />
              Policy Trade-offs & Scenarios
            </TabsTrigger>
            <TabsTrigger value="simulation" className="gap-2 px-4 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Layers className="h-4 w-4 text-primary" />
              Historical Policy Backtest
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            TAB 1: REPLENISHMENT DECISIONS
            ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="decisions" className="space-y-4 pt-1">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-card p-3 rounded-xl border border-border shadow-sm">
            {/* Left: Exception Segment Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={exceptionFilter === 'all' ? 'default' : 'ghost'}
                className="h-8 text-xs font-medium rounded-lg"
                onClick={() => setExceptionFilter('all')}
              >
                All SKUs ({recommendations.length})
              </Button>
              <Button
                size="sm"
                variant={exceptionFilter === 'action_needed' ? 'default' : 'outline'}
                className={`h-8 text-xs font-medium rounded-lg gap-1.5 ${
                  exceptionFilter === 'action_needed' ? '' : 'border-destructive/30 text-destructive hover:bg-destructive/10'
                }`}
                onClick={() => setExceptionFilter('action_needed')}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Action Required ({recommendations.filter((r) => r.shouldReorder).length})
              </Button>
              <Button
                size="sm"
                variant={exceptionFilter === 'critical' ? 'default' : 'outline'}
                className={`h-8 text-xs font-medium rounded-lg gap-1.5 ${
                  exceptionFilter === 'critical' ? '' : 'border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                }`}
                onClick={() => setExceptionFilter('critical')}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Critical Risk ({totalCriticalRisk})
              </Button>
              <Button
                size="sm"
                variant={exceptionFilter === 'constrained' ? 'default' : 'outline'}
                className="h-8 text-xs font-medium rounded-lg"
                onClick={() => setExceptionFilter('constrained')}
              >
                Constrained ({recommendations.filter((r) => r.constraints?.moqTriggered || r.constraints?.batchRoundingApplied).length})
              </Button>
            </div>

            {/* Right: Search, Priority & Category Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-[200px]">
                <Input
                  placeholder="Search product or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 text-xs pl-8 pr-7 rounded-lg"
                />
                <Filter className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[120px] h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs rounded-lg">
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
          </div>

          {/* Decisions Table */}
          <Card className="border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[260px] py-3 text-xs font-semibold">Product / SKU</TableHead>
                    <TableHead className="w-[160px] text-center text-xs font-semibold">Stock vs. ROP</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Demand (d)</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Lead Time (L)</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Safety Buffer (SS)</TableHead>
                    <TableHead className="text-right text-xs font-semibold text-primary">Reorder Point</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Decision Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold">Recommended Order</TableHead>
                    <TableHead className="text-center text-xs font-semibold">Priority</TableHead>
                    <TableHead className="text-right text-xs font-semibold pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
                        No replenishment items match your selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((rec) => {
                      const isTriggered = rec.shouldReorder ?? (rec.currentStock <= rec.reorderPoint);
                      const stockRatio = rec.reorderPoint > 0 ? (rec.currentStock / rec.reorderPoint) : 1;
                      const progressPct = Math.min(100, Math.round(stockRatio * 100));

                      return (
                        <TableRow
                          key={rec.productId}
                          className="cursor-pointer hover:bg-muted/40 transition-colors group"
                          onClick={() => setSelectedRec(rec)}
                        >
                          {/* Product Info */}
                          <TableCell className="py-3">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                {rec.product.name}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className="font-mono bg-muted/80 px-1 py-0.2 rounded text-[10px]">
                                  {rec.product.sku}
                                </span>
                                <span>·</span>
                                <span>{categoryNameById(rec.product.categoryId)}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Visual Stock Position Meter */}
                          <TableCell className="text-center">
                            <div className="space-y-1 inline-block w-full max-w-[130px]">
                              <div className="flex justify-between text-[11px] font-mono">
                                <span className={isTriggered ? 'font-bold text-destructive' : 'font-medium text-foreground'}>
                                  {formatNumber(rec.currentStock)} units
                                </span>
                                <span className="text-muted-foreground text-[10px]">
                                  ROP: {rec.reorderPoint}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isTriggered
                                      ? 'bg-destructive'
                                      : stockRatio < 1.3
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${progressPct}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>

                          {/* Average Daily Demand */}
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">
                            {rec.averageDailyDemand?.toFixed(1) || rec.product.averageDailyDemand.toFixed(1)}/day
                          </TableCell>

                          {/* Supplier Lead Time */}
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">
                            {rec.supplierLeadTime} days
                          </TableCell>

                          {/* Safety Stock Buffer */}
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">
                            {rec.safetyStock}
                          </TableCell>

                          {/* Reorder Point (ROP) */}
                          <TableCell className="text-right text-xs font-mono font-bold text-primary">
                            {rec.reorderPoint}
                          </TableCell>

                          {/* Decision Status Pill */}
                          <TableCell className="text-center">
                            {isTriggered ? (
                              <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20 text-[10px] font-semibold gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Action Required
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold gap-1">
                                <Check className="h-3 w-3" />
                                Stock Healthy
                              </Badge>
                            )}
                          </TableCell>

                          {/* Recommended Order Quantity */}
                          <TableCell className="text-right">
                            <div className="font-bold text-foreground text-sm font-mono">
                              {formatNumber(rec.recommendedOrderQuantity)}
                              <span className="text-[10px] font-normal text-muted-foreground ml-1">units</span>
                            </div>
                            {rec.constraints?.moqTriggered && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                MOQ ({rec.constraints.moq}) enforced
                              </div>
                            )}
                            {rec.constraints?.batchRoundingApplied && (
                              <div className="text-[10px] text-muted-foreground">
                                Pack of {rec.constraints.packSize || rec.constraints.batchSize} rounded
                              </div>
                            )}
                          </TableCell>

                          {/* Priority */}
                          <TableCell className="text-center">
                            <PriorityBadge priority={rec.priority} />
                          </TableCell>

                          {/* Action Button */}
                          <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant={isTriggered ? 'default' : 'outline'}
                              className="h-7 text-xs font-medium rounded-lg gap-1"
                              disabled={rec.recommendedOrderQuantity === 0}
                              onClick={() => handleOrder(rec)}
                            >
                              <ShoppingCart className="h-3 w-3" />
                              Order
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════
            TAB 2: POLICY TRADE-OFFS & SCENARIOS
            ════════════════════════════════════════════════════════════════ */}
        <TabsContent value="tradeoffs" className="space-y-6 pt-1">
          {/* Top Control Bar: SKU Selector */}
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" />
                    Multi-Policy Evaluation Engine
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Compare inventory economics, holding costs, and service levels across Conservative, Balanced, and Lean replenishment postures.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <Label className="text-xs font-semibold text-muted-foreground shrink-0">Active SKU:</Label>
                  <Select value={selectedSkuForTradeoff} onValueChange={setSelectedSkuForTradeoff}>
                    <SelectTrigger className="w-[220px] h-8 text-xs rounded-lg font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {recommendations.slice(0, 20).map((r) => (
                        <SelectItem key={r.product.sku} value={r.product.sku}>
                          <span className="font-mono font-bold mr-1.5">{r.product.sku}</span>
                          <span className="text-muted-foreground text-[11px] truncate">{r.product.name.substring(0, 16)}...</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3 Modern Policy Comparison Cards */}
          {tradeoffData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Conservative Card */}
              <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-b from-blue-500/10 via-card to-card p-5 space-y-4 shadow-sm relative transition-all hover:shadow-md">
                <div className="flex items-start justify-between pb-3 border-b border-border/80">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      High Availability
                    </div>
                    <h4 className="text-lg font-bold text-foreground mt-0.5">
                      {tradeoffData.policies.conservative.policyName}
                    </h4>
                  </div>
                  <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs font-bold px-2.5 py-0.5">
                    {tradeoffData.policies.conservative.targetServiceLevel} Service
                  </Badge>
                </div>

                {/* Key Numbers Grid */}
                <div className="grid grid-cols-2 gap-3 py-1">
                  <div className="rounded-xl bg-background/80 p-2.5 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium">Safety Buffer</span>
                    <span className="text-base font-bold text-foreground font-mono">{tradeoffData.policies.conservative.safetyStockUnits} units</span>
                  </div>
                  <div className="rounded-xl bg-background/80 p-2.5 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium">Reorder Point</span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">{tradeoffData.policies.conservative.reorderPoint} units</span>
                  </div>
                </div>

                {/* Metrics List */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Est. Annual Holding Cost:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">${formatNumber(tradeoffData.policies.conservative.estimatedAnnualHoldingCost)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Avg Inventory Capital:</span>
                    <span className="font-medium text-foreground font-mono">${formatNumber(tradeoffData.policies.conservative.averageInventoryValue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Order Frequency:</span>
                    <span className="font-medium">{tradeoffData.policies.conservative.orderFrequencyPerYear} POs / year</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Simulated Stockout Risk:</span>
                    <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold">
                      {tradeoffData.policies.conservative.simulatedStockoutRisk}
                    </Badge>
                  </div>
                </div>

                {/* Use Case Box */}
                <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
                  <strong className="text-blue-700 dark:text-blue-300 block mb-0.5">Recommended Context:</strong>
                  {tradeoffData.policies.conservative.recommendedUseCase}
                </div>
              </div>

              {/* 2. Balanced Card (Recommended Standard) */}
              <div className="rounded-2xl border-2 border-primary bg-gradient-to-b from-primary/10 via-card to-card p-5 space-y-4 shadow-md relative transition-all hover:shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 shadow-sm">
                    Recommended Standard Policy
                  </Badge>
                </div>

                <div className="flex items-start justify-between pb-3 border-b border-border/80 pt-1">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-primary">
                      Cost-Availability Balance
                    </div>
                    <h4 className="text-lg font-bold text-foreground mt-0.5">
                      {tradeoffData.policies.balanced.policyName}
                    </h4>
                  </div>
                  <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-bold px-2.5 py-0.5">
                    {tradeoffData.policies.balanced.targetServiceLevel} Service
                  </Badge>
                </div>

                {/* Key Numbers Grid */}
                <div className="grid grid-cols-2 gap-3 py-1">
                  <div className="rounded-xl bg-background/80 p-2.5 border border-primary/20">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium">Safety Buffer</span>
                    <span className="text-base font-bold text-foreground font-mono">{tradeoffData.policies.balanced.safetyStockUnits} units</span>
                  </div>
                  <div className="rounded-xl bg-background/80 p-2.5 border border-primary/20">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium">Reorder Point</span>
                    <span className="text-base font-bold text-primary font-mono">{tradeoffData.policies.balanced.reorderPoint} units</span>
                  </div>
                </div>

                {/* Metrics List */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Est. Annual Holding Cost:</span>
                    <span className="font-bold text-foreground font-mono">${formatNumber(tradeoffData.policies.balanced.estimatedAnnualHoldingCost)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Avg Inventory Capital:</span>
                    <span className="font-medium text-foreground font-mono">${formatNumber(tradeoffData.policies.balanced.averageInventoryValue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Order Frequency:</span>
                    <span className="font-medium">{tradeoffData.policies.balanced.orderFrequencyPerYear} POs / year</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Simulated Stockout Risk:</span>
                    <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 text-[10px] font-semibold">
                      {tradeoffData.policies.balanced.simulatedStockoutRisk}
                    </Badge>
                  </div>
                </div>

                {/* Use Case Box */}
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
                  <strong className="text-primary block mb-0.5">Recommended Context:</strong>
                  {tradeoffData.policies.balanced.recommendedUseCase}
                </div>
              </div>

              {/* 3. Lean Card */}
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 via-card to-card p-5 space-y-4 shadow-sm relative transition-all hover:shadow-md">
                <div className="flex items-start justify-between pb-3 border-b border-border/80">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Capital Efficient
                    </div>
                    <h4 className="text-lg font-bold text-foreground mt-0.5">
                      {tradeoffData.policies.lean.policyName}
                    </h4>
                  </div>
                  <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-bold px-2.5 py-0.5">
                    {tradeoffData.policies.lean.targetServiceLevel} Service
                  </Badge>
                </div>

                {/* Key Numbers Grid */}
                <div className="grid grid-cols-2 gap-3 py-1">
                  <div className="rounded-xl bg-background/80 p-2.5 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium">Safety Buffer</span>
                    <span className="text-base font-bold text-foreground font-mono">{tradeoffData.policies.lean.safetyStockUnits} units</span>
                  </div>
                  <div className="rounded-xl bg-background/80 p-2.5 border border-border/60">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium">Reorder Point</span>
                    <span className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono">{tradeoffData.policies.lean.reorderPoint} units</span>
                  </div>
                </div>

                {/* Metrics List */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Est. Annual Holding Cost:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">${formatNumber(tradeoffData.policies.lean.estimatedAnnualHoldingCost)} (Lowest)</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Avg Inventory Capital:</span>
                    <span className="font-medium text-foreground font-mono">${formatNumber(tradeoffData.policies.lean.averageInventoryValue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Order Frequency:</span>
                    <span className="font-medium">{tradeoffData.policies.lean.orderFrequencyPerYear} POs / year</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Simulated Stockout Risk:</span>
                    <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-[10px] font-semibold">
                      {tradeoffData.policies.lean.simulatedStockoutRisk}
                    </Badge>
                  </div>
                </div>

                {/* Use Case Box */}
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-[11px] text-muted-foreground leading-relaxed">
                  <strong className="text-amber-700 dark:text-amber-300 block mb-0.5">Recommended Context:</strong>
                  {tradeoffData.policies.lean.recommendedUseCase}
                </div>
              </div>
            </div>
          )}

          {/* Visual Trade-Off Comparison Chart */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Financial Holding Cost vs. Buffer Size by Policy Stance
              </CardTitle>
              <CardDescription className="text-xs">
                Visualizing how higher service targets expand safety stock buffers and annual inventory holding expenses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tradeoffChartData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} label={{ value: 'Annual Cost ($)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Buffer Units', angle: 90, position: 'insideRight', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar yAxisId="left" dataKey="holdingCost" name="Est. Annual Holding Cost ($)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="safetyStock" name="Safety Stock Units (SS)" fill="hsl(210, 70%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Stress-Test Scenario Table */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Operational Stress Matrix for SKU {selectedSkuForTradeoff}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Simulates policy responsiveness under supplier transport delays, demand volatility surges, and buffer adjustments.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="py-2.5 text-xs font-semibold">Scenario Profile</TableHead>
                      <TableHead className="text-xs font-semibold">Simulated Shock Condition</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Lead Time</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Demand Rate</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Safety Buffer</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-primary">Reorder Point</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Order Qty</TableHead>
                      <TableHead className="text-center text-xs font-semibold">Stockout Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scenarioData?.scenarios.map((scen) => (
                      <TableRow key={scen.scenarioId} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-foreground text-xs py-2.5">
                          {scen.scenarioName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {scen.description}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {scen.leadTimeDays}d{' '}
                          {scen.leadTimeDelta > 0 && (
                            <span className="text-destructive font-semibold">(+{scen.leadTimeDelta}d)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {scen.forecastDailyDemand.toFixed(1)}/d
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {scen.safetyStock}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs font-mono text-primary">
                          {scen.reorderPoint}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs font-mono text-foreground">
                          {scen.orderQuantity}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              scen.stockoutRisk === 'Very Low' || scen.stockoutRisk === 'Low'
                                ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px] font-semibold'
                                : scen.stockoutRisk === 'Moderate'
                                ? 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 text-[10px] font-semibold'
                                : 'text-destructive border-destructive/30 bg-destructive/10 text-[10px] font-semibold'
                            }
                          >
                            {scen.stockoutRisk}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: INVENTORY SIMULATION & POLICY BACKTEST ──────────────────── */}
        <TabsContent value="simulation" className="space-y-6">
          {/* Configurable Scenario Inputs Banner with Disclaimer */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    Configurable Scenario Inputs
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Test operational backtest sensitivity across holding rates, order setup costs, and supplier lead times.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit text-[11px] border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium">
                  Configurable Scenario Inputs (Assumptions — Not Observed Business Facts)
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Holding Cost Rate (% / year)</Label>
                    <span className="text-xs font-semibold">{(holdingRate * 100).toFixed(0)}%</span>
                  </div>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.05"
                    max="1.0"
                    value={holdingRate}
                    onChange={(e) => setHoldingRate(Number(e.target.value))}
                  />
                  <div className="text-[10px] text-muted-foreground">Assumption: cost of capital & storage</div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Order Setup Cost ($ / PO)</Label>
                    <span className="text-xs font-semibold">${orderCost}</span>
                  </div>
                  <Input
                    type="number"
                    step="5"
                    min="5"
                    max="500"
                    value={orderCost}
                    onChange={(e) => setOrderCost(Number(e.target.value))}
                  />
                  <div className="text-[10px] text-muted-foreground">Assumption: procurement & handling</div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Stockout Penalty ($ / unit)</Label>
                    <span className="text-xs font-semibold">${penaltyCost}</span>
                  </div>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="50"
                    value={penaltyCost}
                    onChange={(e) => setPenaltyCost(Number(e.target.value))}
                  />
                  <div className="text-[10px] text-muted-foreground">Assumption: lost margin & goodwill</div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Supplier Lead Time (days)</Label>
                    <span className="text-xs font-semibold">{leadTimeOverride} days</span>
                  </div>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="30"
                    value={leadTimeOverride}
                    onChange={(e) => setLeadTimeOverride(Number(e.target.value))}
                  />
                  <div className="text-[10px] text-muted-foreground">Assumption: uniform lead time</div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleRunSimulation}
                  disabled={simLoading}
                  className="gap-2"
                  size="sm"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${simLoading ? 'animate-spin' : ''}`} />
                  {simLoading ? 'Recalculating Backtest...' : 'Recalculate Backtest with New Inputs'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Simulation Results Comparison */}
          {simulationData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium">Service Level (Fill Rate)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {(simulationData.policies.morrow.serviceLevel.fillRate * 100).toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baseline: {(simulationData.policies.fixed_baseline.serviceLevel.fillRate * 100).toFixed(1)}% ·{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{simulationData.comparison.serviceLevelImprovementPct.toFixed(1)}% lift
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium">Stockout Days</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {simulationData.policies.morrow.simulatedStockoutDays} days
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baseline: {simulationData.policies.fixed_baseline.simulatedStockoutDays} days ·{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      −{simulationData.comparison.stockoutDaysReductionPct.toFixed(0)}% reduced
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium">Average Inventory Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    ${formatNumber(simulationData.policies.morrow.averageInventoryValue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baseline: ${formatNumber(simulationData.policies.fixed_baseline.averageInventoryValue)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs text-muted-foreground font-medium">Total Simulated Operational Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    ${formatNumber(simulationData.policies.morrow.totalCost)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baseline: ${formatNumber(simulationData.policies.fixed_baseline.totalCost)} ·{' '}
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {simulationData.comparison.totalCostSavingsPct.toFixed(1)}% saved
                    </span>
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Drawer: Detailed Calculation & Real-time Scenario Stress Tester */}
      {selectedRec && (
        <RestockDetailSheet
          rec={selectedRec}
          open={!!selectedRec}
          onClose={() => setSelectedRec(null)}
          onOrder={handleOrder}
        />
      )}
    </div>
  );
}

interface RestockDetailSheetProps {
  rec: RestockRecommendation;
  open: boolean;
  onClose: () => void;
  onOrder: (rec: RestockRecommendation) => void;
}

function RestockDetailSheet({ rec, open, onClose, onOrder }: RestockDetailSheetProps) {
  const [leadTime, setLeadTime] = useState(rec.supplierLeadTime);
  const [safetyStock, setSafetyStock] = useState(rec.safetyStock);
  const [moq, setMoq] = useState(rec.constraints?.moq || 10);
  const [batchSize, setBatchSize] = useState(rec.constraints?.packSize || rec.constraints?.batchSize || 5);
  const [demandMultiplier, setDemandMultiplier] = useState(1.0);
  const [serviceLevel, setServiceLevel] = useState(0.95);

  const salesHistory = getSalesForProduct(rec.productId);
  const chartData = salesHistory.slice(-14).map((s) => ({
    date: formatShortDate(s.date),
    quantity: s.quantity,
  }));

  const recalculated = recalculateRecommendation(
    rec.product,
    leadTime,
    safetyStock,
    moq,
    batchSize,
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-[560px]">
        <SheetHeader>
          <SheetTitle className="text-lg">{rec.product.name}</SheetTitle>
          <SheetDescription>{rec.product.sku} · {categoryNameById(rec.product.categoryId)}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          {/* Synthetic inventory label */}
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-muted-foreground">Synthetic Inventory: Current stock is a test scenario parameter.</span>
          </div>

          {/* Priority badge */}
          <div className="flex items-center gap-2">
            <PriorityBadge priority={recalculated.priority} />
            <Badge variant="outline" className="text-xs">
              {supplierNameById(rec.product.supplierId)}
            </Badge>
            {recalculated.shouldReorder ? (
              <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-xs">
                Triggered: Order Needed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5 text-xs">
                Position Healthy
              </Badge>
            )}
          </div>

          {/* Reason */}
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-xs leading-relaxed text-muted-foreground">{recalculated.reason}</p>
          </div>

          {/* Recent demand chart */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold mb-2">Recent Demand (14 days)</p>
            <ResponsiveContainer width="100%" height={120}>
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

          {/* Scenario parameter inputs */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              Adjust Scenario & Physical Constraints
            </h4>
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
              <div className="space-y-1.5">
                <Label className="text-xs">Minimum Order Qty (MOQ)</Label>
                <Input
                  type="number"
                  value={moq}
                  onChange={(e) => setMoq(Math.max(1, Number(e.target.value)))}
                  min={1}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pack / Batch Multiple</Label>
                <Input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Math.max(1, Number(e.target.value)))}
                  min={1}
                />
              </div>
            </div>
          </div>

          {/* Calculation breakdown */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Decision Engine Calculation Breakdown</p>
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center pb-1.5 border-b border-border">
                <span className="text-muted-foreground">Average Daily Demand (d)</span>
                <span className="font-mono font-medium">{rec.product.averageDailyDemand.toFixed(1)} units/day</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-border">
                <span className="text-muted-foreground">Lead Time Demand (d × L)</span>
                <span className="font-mono font-medium">{recalculated.forecastDemandDuringLeadTime} units</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-border">
                <span className="text-muted-foreground">+ Safety Stock (SS)</span>
                <span className="font-mono font-medium">{safetyStock} units</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-border">
                <span className="text-primary font-medium">= Reorder Point (ROP)</span>
                <span className="font-bold text-primary font-mono">{recalculated.reorderPoint} units</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-border">
                <span className="text-muted-foreground">Inventory Position (On-Hand + In-Transit)</span>
                <span className="font-mono font-semibold">{recalculated.inventoryPosition} units</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-border">
                <span className="text-muted-foreground">Unconstrained Order Quantity</span>
                <span className="font-mono font-medium">{recalculated.unconstrainedOrderQuantity} units</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t-2 border-primary/20">
                <span className="font-semibold text-foreground">Recommended Constrained Order</span>
                <span className="text-lg font-bold text-primary font-mono">{formatNumber(recalculated.recommendedOrderQuantity)} units</span>
              </div>
            </div>
          </div>

          {/* Action */}
          <Button
            className="w-full gap-2"
            onClick={() => onOrder(recalculated)}
            disabled={recalculated.recommendedOrderQuantity === 0}
          >
            <ShoppingCart className="h-4 w-4" />
            Place Purchase Order ({formatNumber(recalculated.recommendedOrderQuantity)} units)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
