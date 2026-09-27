import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  IndianRupee,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  ArrowRight,
  Activity,
  Boxes,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { getDashboardSummary } from '@/services/api';
import type { DashboardSummary } from '@/types';
import { useApp } from '@/context/AppContext';
import { formatCurrency, formatNumber, formatShortDate, formatRelativeTime } from '@/utils/format';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { StockStatusBadge } from '@/components/shared/StatusBadge';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/shared/LoadingSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const CATEGORY_COLORS = ['hsl(158, 64%, 38%)', 'hsl(210, 70%, 50%)', 'hsl(38, 92%, 55%)', 'hsl(0, 72%, 55%)', 'hsl(262, 60%, 60%)', 'hsl(158, 64%, 48%)'];

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardSummary().then((data) => {
      setSummary(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <CardSkeleton />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const chartData = summary.salesVsForecast.map((d) => ({
    date: formatShortDate(d.date),
    actual: d.actual,
    forecast: d.predicted,
  }));

  // Find the boundary between actual and forecast
  const boundaryIndex = chartData.findIndex((d) => d.actual === null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome banner */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Welcome back, Rahul
        </h2>
        <p className="text-sm text-muted-foreground">
          You have <span className="font-medium text-warning">{summary.productsRunningLow} products running low</span> and{' '}
          <span className="font-medium text-destructive">{summary.stockoutRiskCount} at stockout risk</span>.
          Forecasted sales for next 7 days: <span className="font-medium text-foreground">{formatNumber(summary.forecastedSales7Days)} units</span>.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Total Products"
          value={formatNumber(summary.totalProducts)}
          subtitle="active SKUs"
          icon={<Package className="h-4 w-4" />}
          accent="primary"
          trend={{ value: '2 new', positive: true }}
        />
        <KpiCard
          title="Inventory Value"
          value={formatCurrency(summary.totalInventoryValue, settings.currency)}
          subtitle={`+${summary.inventoryValueChangePct}% this month`}
          icon={<IndianRupee className="h-4 w-4" />}
          accent="success"
          trend={{ value: `${summary.inventoryValueChangePct}%`, positive: true }}
        />
        <KpiCard
          title="Running Low"
          value={formatNumber(summary.productsRunningLow)}
          subtitle="need attention"
          icon={<AlertTriangle className="h-4 w-4" />}
          accent="warning"
        />
        <KpiCard
          title="Stockout Risk"
          value={formatNumber(summary.stockoutRiskCount)}
          subtitle="critical items"
          icon={<TrendingDown className="h-4 w-4" />}
          accent="destructive"
        />
        <KpiCard
          title="Forecast (7 days)"
          value={formatNumber(summary.forecastedSales7Days)}
          subtitle="units expected"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="primary"
          trend={{ value: `${summary.forecastedSalesChangePct}%`, positive: true }}
        />
      </div>

      {/* Sales vs Forecast Chart */}
      <ChartCard
        title="Sales vs Forecast"
        description="Historical revenue and 7-day demand forecast"
        action={
          <Badge variant="outline" className="gap-1.5 text-xs text-primary border-primary/20">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Trained RF Model
          </Badge>
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(158, 64%, 38%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(158, 64%, 38%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={4} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                fontSize: '12px',
              }}
              formatter={(value: number) => formatCurrency(value, settings.currency)}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual Sales"
              stroke="hsl(158, 64%, 38%)"
              strokeWidth={2}
              fill="url(#actualGradient)"
            />
            <Area
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke="hsl(38, 92%, 55%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#forecastGradient)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Two-column section */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top Selling Products */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Top-Selling Products</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">By revenue, last 30 days</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate('/inventory')}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {summary.topSellingProducts.map((product, idx) => (
                <div
                  key={product.productId}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-muted-foreground">
                    {idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category} · {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(product.revenue, settings.currency)}</p>
                    <p className="text-xs text-muted-foreground">{formatNumber(product.unitsSold)} units</p>
                  </div>
                  <div className="w-16 text-right">
                    <span className={`text-xs font-medium ${product.trendPct >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {product.trendPct >= 0 ? '↑' : '↓'} {Math.abs(product.trendPct)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Category Distribution</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Inventory value by category</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={summary.categoryDistribution}
                  dataKey="inventoryValue"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {summary.categoryDistribution.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => formatCurrency(value, settings.currency)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5">
              {summary.categoryDistribution.map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  <span className="text-muted-foreground">{cat.category}</span>
                  <span className="ml-auto font-medium text-foreground">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Three-column section */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Low Stock Alerts</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Items needing restock</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate('/restock')}>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.lowStockAlerts.slice(0, 5).map((alert) => (
                <div key={alert.productId} className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:bg-secondary/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{alert.name}</p>
                    <p className="text-xs text-muted-foreground">{alert.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{alert.currentStock}</p>
                    <p className="text-xs text-muted-foreground">{alert.daysRemaining}d left</p>
                  </div>
                  <StockStatusBadge status={alert.status} />
                </div>
              ))}
              {summary.lowStockAlerts.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">All products well stocked</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Restock Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Restock Preview</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Recommended orders</p>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate('/restock')}>
              View all <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.restockPreview.map((rec) => (
                <div key={rec.productId} className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:bg-secondary/50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{rec.product.name}</p>
                    <p className="text-xs text-muted-foreground">Order {rec.recommendedOrderQuantity} units</p>
                  </div>
                  <Badge variant="outline" className={`text-xs ${rec.priority === 'high' ? 'bg-destructive/10 text-destructive' : rec.priority === 'medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                    {rec.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Inventory updates</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[260px] pr-3">
              <div className="space-y-3">
                {summary.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      {activity.type === 'stock-update' && <Boxes className="h-3.5 w-3.5" />}
                      {activity.type === 'product-added' && <Package className="h-3.5 w-3.5" />}
                      {activity.type === 'restock-order' && <ShoppingCart className="h-3.5 w-3.5" />}
                      {activity.type === 'forecast-generated' && <TrendingUp className="h-3.5 w-3.5" />}
                      {activity.type === 'alert-triggered' && <AlertTriangle className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground">{activity.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {activity.user} · {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
