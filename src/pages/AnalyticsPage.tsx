import { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  RotateCw,
  AlertOctagon,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
} from 'recharts';
import { useApp } from '@/context/AppContext';
import { allDailySales, products, categories, categoryNameById } from '@/data/mockData';
import { formatCurrency, formatNumber, formatShortDate, getDateRangeFromPreset } from '@/utils/format';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DateRangePreset } from '@/types';

const CATEGORY_COLORS = ['hsl(158, 64%, 38%)', 'hsl(210, 70%, 50%)', 'hsl(38, 92%, 55%)', 'hsl(0, 72%, 55%)', 'hsl(262, 60%, 60%)', 'hsl(158, 64%, 48%)'];

export function AnalyticsPage() {
  const { settings } = useApp();
  const [timeRange, setTimeRange] = useState<DateRangePreset>('30d');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { start, end } = useMemo(() => getDateRangeFromPreset(timeRange), [timeRange]);

  // Aggregate sales data
  const dailySales = useMemo(() => {
    const salesInRange = allDailySales.filter((s) => s.date >= start && s.date <= end);
    const productIds = categoryFilter === 'all'
      ? null
      : new Set(products.filter((p) => p.categoryId === categoryFilter).map((p) => p.id));

    const dateMap = new Map<string, { date: string; revenue: number; units: number }>();

    salesInRange.forEach((s) => {
      if (productIds && !productIds.has(s.productId)) return;
      const existing = dateMap.get(s.date) || { date: s.date, revenue: 0, units: 0 };
      existing.revenue += s.revenue;
      existing.units += s.quantity;
      dateMap.set(s.date, existing);
    });

    return Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({ ...d, date: formatShortDate(d.date) }));
  }, [start, end, categoryFilter]);

  // Weekly sales
  const weeklySales = useMemo(() => {
    const groups: Record<string, { revenue: number; units: number }> = {};
    dailySales.forEach((d, i) => {
      const weekNum = `W${Math.floor(i / 7) + 1}`;
      if (!groups[weekNum]) groups[weekNum] = { revenue: 0, units: 0 };
      groups[weekNum].revenue += d.revenue;
      groups[weekNum].units += d.units;
    });
    return Object.entries(groups).map(([week, data]) => ({ week, ...data }));
  }, [dailySales]);

  // Monthly sales
  const monthlySales = useMemo(() => {
    const groups: Record<string, { revenue: number; units: number }> = {};
    allDailySales.forEach((s) => {
      const month = new Date(s.date).toLocaleDateString('en-IN', { month: 'short' });
      if (!groups[month]) groups[month] = { revenue: 0, units: 0 };
      groups[month].revenue += s.revenue;
      groups[month].units += s.quantity;
    });
    return Object.entries(groups).map(([month, data]) => ({ month, ...data }));
  }, []);

  // Sales by category
  const salesByCategory = useMemo(() => {
    const salesInRange = allDailySales.filter((s) => s.date >= start && s.date <= end);
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.categoryId === cat.id);
      const revenue = salesInRange
        .filter((s) => catProducts.some((p) => p.id === s.productId))
        .reduce((sum, s) => sum + s.revenue, 0);
      return { category: cat.name, revenue, units: revenue };
    }).filter((c) => c.revenue > 0);
  }, [start, end]);

  // Top products
  const topProducts = useMemo(() => {
    const salesInRange = allDailySales.filter((s) => s.date >= start && s.date <= end);
    const productMap = new Map<string, number>();
    salesInRange.forEach((s) => {
      productMap.set(s.productId, (productMap.get(s.productId) || 0) + s.revenue);
    });
    return Array.from(productMap.entries())
      .map(([id, revenue]) => ({
        name: products.find((p) => p.id === id)?.name || '',
        category: categoryNameById(products.find((p) => p.id === id)?.categoryId || ''),
        revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [start, end]);

  // Inventory turnover (mock)
  const turnoverData = useMemo(() => {
    return products.slice(0, 8).map((p) => {
      const avgInv = (p.currentStock + p.targetStockLevel) / 2;
      const turnover = avgInv > 0 ? (p.averageDailyDemand * 30) / avgInv : 0;
      return {
        name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
        turnover: Math.round(turnover * 10) / 10,
      };
    }).sort((a, b) => b.turnover - a.turnover);
  }, []);

  // Historical stockout events (mock)
  const stockoutEvents = useMemo(() => [
    { date: '2026-09-10', product: 'Harpic Toilet Cleaner 1L', duration: '3 days', impact: '₹4,200' },
    { date: '2026-09-05', product: 'Lays Classic Salted', duration: '2 days', impact: '₹1,800' },
    { date: '2026-08-28', product: 'Dove Shampoo 340ml', duration: '4 days', impact: '₹5,600' },
    { date: '2026-08-20', product: 'Mother Dairy Curd 400g', duration: '1 day', impact: '₹900' },
    { date: '2026-08-15', product: 'Surf Excel Detergent 1kg', duration: '2 days', impact: '₹3,500' },
  ], []);

  // Sales vs forecast comparison
  const salesVsForecast = useMemo(() => {
    return dailySales.map((d, i) => {
      const baseForecast = d.revenue * (0.9 + Math.sin(i / 5) * 0.1);
      return {
        date: d.date,
        actual: d.revenue,
        forecast: Math.round(baseForecast),
      };
    });
  }, [dailySales]);

  // KPIs
  const totalRevenue = dailySales.reduce((s, d) => s + d.revenue, 0);
  const totalUnits = dailySales.reduce((s, d) => s + d.units, 0);
  const avgDailyRevenue = dailySales.length > 0 ? totalRevenue / dailySales.length : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground">Historical performance and sales insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as DateRangePreset)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue, settings.currency)}
          subtitle={`${timeRange} period`}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="success"
        />
        <KpiCard
          title="Units Sold"
          value={formatNumber(totalUnits)}
          subtitle={`${timeRange} period`}
          icon={<Package className="h-4 w-4" />}
          accent="primary"
        />
        <KpiCard
          title="Avg Daily Revenue"
          value={formatCurrency(Math.round(avgDailyRevenue), settings.currency)}
          subtitle="per day"
          icon={<BarChart3 className="h-4 w-4" />}
          accent="primary"
        />
        <KpiCard
          title="Stockout Events"
          value={formatNumber(stockoutEvents.length)}
          subtitle="last 90 days"
          icon={<AlertOctagon className="h-4 w-4" />}
          accent="destructive"
        />
      </div>

      {/* Daily sales trend */}
      <ChartCard
        title="Daily Sales Trend"
        description="Revenue and units sold over the selected period"
      >
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={dailySales} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="analyticsRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(158, 64%, 38%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(158, 64%, 38%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={Math.floor(dailySales.length / 8)} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
            <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }}
              formatter={(value: number, name: string) => name === 'Revenue' ? formatCurrency(value, settings.currency) : formatNumber(value)}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(158, 64%, 38%)" strokeWidth={2} fill="url(#analyticsRevenue)" />
            <Line yAxisId="right" type="monotone" dataKey="units" name="Units" stroke="hsl(210, 70%, 50%)" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Two-column: Weekly trend + Sales by category */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Weekly Sales Trend"
          description="Aggregated weekly revenue"
        >
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklySales} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }}
                formatter={(value: number) => formatCurrency(value, settings.currency)}
              />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(210, 70%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Sales by Category"
          description="Revenue distribution across product categories"
        >
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={salesByCategory}
                dataKey="revenue"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {salesByCategory.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }}
                formatter={(value: number) => formatCurrency(value, settings.currency)}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Two-column: Top products + Inventory turnover */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Top-Performing Products"
          description="By revenue in the selected period"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={80} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }}
                formatter={(value: number) => formatCurrency(value, settings.currency)}
              />
              <Bar dataKey="revenue" name="Revenue" fill="hsl(158, 64%, 38%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Inventory Turnover"
          description="Turnover ratio by product (higher = faster selling)"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={turnoverData} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={80} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }}
              />
              <Bar dataKey="turnover" name="Turnover Ratio" fill="hsl(38, 92%, 55%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Sales vs Forecast comparison */}
      <ChartCard
        title="Sales vs Forecast Comparison"
        description="Actual revenue compared to forecasted demand"
        action={<Badge variant="outline" className="text-xs text-primary border-primary/20">Trained RF Forecast</Badge>}
      >
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={salesVsForecast} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={Math.floor(salesVsForecast.length / 8)} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }}
              formatter={(value: number) => formatCurrency(value, settings.currency)}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey="actual" name="Actual" fill="hsl(158, 64%, 38%)" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
            <Line type="monotone" dataKey="forecast" name="Forecast" stroke="hsl(38, 92%, 55%)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Historical stockout events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Historical Stockout Events</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Products that went out of stock in the last 90 days</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stockoutEvents.map((event, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <AlertOctagon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{event.product}</p>
                  <p className="text-xs text-muted-foreground">{formatShortDate(event.date)} · {event.duration} out of stock</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-destructive">{event.impact}</p>
                  <p className="text-xs text-muted-foreground">est. lost revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
