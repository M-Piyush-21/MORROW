import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  Activity,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { getDemandForecast } from '@/services/api';
import { useApp } from '@/context/AppContext';
import type { DemandForecast } from '@/types';
import { formatNumber, formatShortDate } from '@/utils/format';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { ChartSkeleton, CardSkeleton } from '@/components/shared/LoadingSkeleton';

export function DemandForecastPage() {
  const { products } = useApp();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [horizon, setHorizon] = useState(7);
  const [forecast, setForecast] = useState<DemandForecast | null>(null);
  const [loading, setLoading] = useState(false);

  const product = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );

  const generateForecast = () => {
    setLoading(true);
    getDemandForecast(selectedProductId, horizon).then((data) => {
      setForecast(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    generateForecast();
  }, [selectedProductId, horizon]);

  const chartData = useMemo(() => {
    if (!forecast) return [];
    return forecast.points.map((p) => ({
      date: formatShortDate(p.date),
      actual: p.actual,
      predicted: p.predicted,
      lowerBound: p.lowerBound,
      upperBound: p.upperBound,
    }));
  }, [forecast]);

  const boundaryIndex = chartData.findIndex((d) => d.actual === null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Demand Forecast</h2>
        <p className="text-sm text-muted-foreground">
          Generate multi-step demand forecasts powered by trained Random Forest regression models.
        </p>
      </div>

      {/* Model status banner */}
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-primary">Live ML Model Active</span> — Multi-step recursive forecasting with auto-regressive lag features and uncertainty bounds.
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-primary border-primary/20">
          Model v1.0.0 (RF)
        </Badge>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Product</label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Forecast Horizon</label>
              <div className="flex gap-1.5">
                {[7, 14, 30].map((h) => (
                  <Button
                    key={h}
                    variant={horizon === h ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setHorizon(h)}
                    className="w-16"
                  >
                    {h}d
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={generateForecast} disabled={loading} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {loading ? 'Generating...' : 'Generate Forecast'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : forecast ? (
        <div className="grid gap-4 md:grid-cols-3">
          <KpiCard
            title="Expected Demand"
            value={formatNumber(forecast.expectedTotalDemand)}
            subtitle={`over ${horizon} days`}
            icon={<TrendingUp className="h-4 w-4" />}
            accent="primary"
          />
          <KpiCard
            title="Avg Daily Forecast"
            value={formatNumber(forecast.averageDailyForecast)}
            subtitle="units per day"
            icon={<Activity className="h-4 w-4" />}
            accent="success"
          />
          <KpiCard
            title="Uncertainty"
            value={`±${formatNumber(forecast.uncertainty)}`}
            subtitle="std. deviation"
            icon={<AlertCircle className="h-4 w-4" />}
            accent="warning"
          />
        </div>
      ) : null}

      {/* Forecast Chart */}
      {loading ? (
        <ChartSkeleton />
      ) : forecast ? (
        <ChartCard
          title={`${product?.name || 'Product'} — Demand Forecast`}
          description="Historical sales (solid) and predicted demand (dashed) with confidence interval"
          action={
            <Badge variant="outline" className="gap-1.5 text-xs text-primary border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {forecast?.isDemo ? 'Offline Fallback' : 'ML Model (RF)'}
            </Badge>
          }
        >
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(158, 64%, 38%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(158, 64%, 38%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={3} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Area
                type="monotone"
                dataKey="upperBound"
                name="Upper Bound"
                stroke="none"
                fill="hsl(38, 92%, 55%)"
                fillOpacity={0.08}
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                name="Lower Bound"
                stroke="none"
                fill="hsl(var(--background))"
                fillOpacity={1}
              />
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual Sales"
                stroke="hsl(158, 64%, 38%)"
                strokeWidth={2}
                fill="url(#actualGrad)"
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name="Forecast"
                stroke="hsl(38, 92%, 55%)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              {boundaryIndex > 0 && (
                <ReferenceLine
                  x={chartData[boundaryIndex - 1]?.date}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 3"
                  label={{ value: 'Today', position: 'top', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}

      {/* Daily forecast table & factors */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Daily forecast table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Daily Forecast Values</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Predicted demand for each day in the forecast horizon</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : forecast ? (
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Predicted</TableHead>
                      <TableHead className="text-right">Lower Bound</TableHead>
                      <TableHead className="text-right">Upper Bound</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecast.points
                      .filter((p) => p.actual === null)
                      .map((p) => (
                        <TableRow key={p.date}>
                          <TableCell className="text-sm">{formatShortDate(p.date)}</TableCell>
                          <TableCell className="text-right font-medium">{p.predicted}</TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">{p.lowerBound}</TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">{p.upperBound}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Factors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Forecast Factors</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Key engineered features used in prediction</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Prior day lag (lag_1)', value: 'Primary auto-regressive signal', weight: '35%' },
                { label: 'Weekly seasonality (lag_7)', value: 'Same-day prior week demand', weight: '28%' },
                { label: 'Rolling 7d & 14d mean', value: 'Trend smoothing window', weight: '22%' },
                { label: 'Calendar (Day of Week, Month)', value: 'Cyclical demand patterns', weight: '15%' },
              ].map((f) => (
                <div key={f.label} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">{f.label}</p>
                    <Badge variant="outline" className="text-[10px]">{f.weight}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{f.value}</p>
                </div>
              ))}
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  These factors are illustrative. The real model will use lag features, rolling statistics,
                  day-of-week encoding, and external signals (promotions, holidays).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
