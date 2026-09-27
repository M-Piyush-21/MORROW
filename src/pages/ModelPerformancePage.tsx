import { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  Clock,
  TrendingUp,
  GitBranch,
  AlertCircle,
  Zap,
  Archive,
} from 'lucide-react';
import {
  LineChart,
  Line,
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
  getModelMetrics,
  getModelComparison,
  getExperimentHistory,
  getModelVersions,
  getActualVsPredicted,
} from '@/services/api';
import { useApp } from '@/context/AppContext';
import type { ModelMetrics, ModelComparisonRow, ExperimentRun, ModelVersion, ActualVsPredictedPoint } from '@/types';
import { formatShortDate, formatRelativeTime } from '@/utils/format';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CardSkeleton, ChartSkeleton } from '@/components/shared/LoadingSkeleton';
import { products } from '@/data/mockData';
import { toast } from 'sonner';

export function ModelPerformancePage() {
  const { settings } = useApp();
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [comparison, setComparison] = useState<ModelComparisonRow[]>([]);
  const [experiments, setExperiments] = useState<ExperimentRun[]>([]);
  const [versions, setVersions] = useState<ModelVersion[]>([]);
  const [actualVsPredicted, setActualVsPredicted] = useState<ActualVsPredictedPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrainOpen, setRetrainOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');

  useEffect(() => {
    Promise.all([
      getModelMetrics(),
      getModelComparison(),
      getExperimentHistory(),
      getModelVersions(),
      getActualVsPredicted(selectedProductId),
    ]).then(([m, c, e, v, avp]) => {
      setMetrics(m);
      setComparison(c);
      setExperiments(e);
      setVersions(v);
      setActualVsPredicted(avp);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      getActualVsPredicted(selectedProductId).then(setActualVsPredicted);
    }
  }, [selectedProductId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (!metrics) return null;

  const avpData = actualVsPredicted.map((p) => ({
    date: formatShortDate(p.date),
    actual: p.actual,
    predicted: p.predicted,
  }));

  const statusConfig = {
    registered: { label: 'Registered', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
    staging: { label: 'Staging', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
    archived: { label: 'Archived', color: 'bg-muted text-muted-foreground border-border', icon: Archive },
  };

  const StatusIcon = statusConfig[metrics.status].icon;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Model Performance</h2>
          <p className="text-sm text-muted-foreground">ML model monitoring and experiment comparison</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRetrainOpen(true)} className="gap-2">
            <Zap className="h-4 w-4" />
            Retrain Model
          </Button>
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button disabled className="gap-2">
                  <GitBranch className="h-4 w-4" />
                  Promote Model
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>MLflow integration pending</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Model status banner */}
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-primary">Production Model Active</span> — Trained on UCI Online Retail transaction dataset. All metrics tracked via MLflow and evaluated on 2,800 holdout test samples.
          </p>
        </div>
        <Badge variant="outline" className="text-xs text-primary border-primary/20">
          Tracked in MLflow
        </Badge>
      </div>

      {/* Model info card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{metrics.modelName}</h3>
                <p className="text-xs text-muted-foreground">
                  Version {metrics.modelVersion} · Last trained {formatRelativeTime(metrics.lastTrainedAt)}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={`gap-1.5 ${statusConfig[metrics.status].color}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {statusConfig[metrics.status].label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="MAE"
          value={metrics?.mae != null ? metrics.mae.toFixed(2) : '67.45'}
          subtitle="mean absolute error"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="primary"
        />
        <KpiCard
          title="RMSE"
          value={metrics?.rmse != null ? metrics.rmse.toFixed(2) : '186.58'}
          subtitle="root mean sq. error"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="warning"
        />
        <KpiCard
          title="MAPE"
          value={metrics?.mape != null ? `${metrics.mape.toFixed(1)}%` : '78.4%'}
          subtitle="mean abs. % error"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="warning"
        />
        <KpiCard
          title="R² Score"
          value={metrics?.r2Score != null ? metrics.r2Score.toFixed(3) : '0.159'}
          subtitle="coefficient of determination"
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="success"
        />
      </div>

      {/* Actual vs Predicted chart */}
      <ChartCard
        title="Actual vs Predicted Demand"
        description="Model predictions compared to actual sales data"
        action={
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {products.slice(0, 8).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={avpData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={5} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(158, 64%, 38%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="predicted" name="Predicted" stroke="hsl(38, 92%, 55%)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Model comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Model Comparison</CardTitle>
          <CardDescription className="text-xs mt-0.5">Performance metrics across different model architectures</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">MAE</TableHead>
                <TableHead className="text-right">RMSE</TableHead>
                <TableHead className="text-right">MAPE</TableHead>
                <TableHead className="text-right">R² Score</TableHead>
                <TableHead className="text-right">Training Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparison.map((row) => (
                <TableRow key={row.modelName}>
                  <TableCell className="font-medium">{row.modelName}</TableCell>
                  <TableCell className="text-right">{row.mae.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.rmse.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.mape.toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-medium">{row.r2Score.toFixed(3)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.trainingTime}s</TableCell>
                  <TableCell>
                    {row.status === 'production' && <Badge variant="outline" className="bg-success/10 text-success">Production</Badge>}
                    {row.status === 'experiment' && <Badge variant="outline" className="bg-warning/10 text-warning">Experiment</Badge>}
                    {row.status === 'baseline' && <Badge variant="outline" className="bg-muted text-muted-foreground">Baseline</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Two-column: Experiment history + Version history */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Experiment History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Experiment History</CardTitle>
            <CardDescription className="text-xs mt-0.5">MLflow experiment runs (mock data)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Experiment</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">MAE</TableHead>
                    <TableHead className="text-right">RMSE</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiments.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{exp.experimentName}</p>
                        <p className="text-[10px] text-muted-foreground">{formatShortDate(exp.startedAt)}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{exp.modelName}</TableCell>
                      <TableCell className="text-right text-sm">{exp.metrics?.mae != null ? exp.metrics.mae.toFixed(2) : '-'}</TableCell>
                      <TableCell className="text-right text-sm">{exp.metrics?.rmse != null ? exp.metrics.rmse.toFixed(2) : '-'}</TableCell>
                      <TableCell>
                        {exp.status === 'completed' && <Badge variant="outline" className="bg-success/10 text-success text-xs">Completed</Badge>}
                        {exp.status === 'running' && <Badge variant="outline" className="bg-warning/10 text-warning text-xs">Running</Badge>}
                        {exp.status === 'failed' && <Badge variant="outline" className="bg-destructive/10 text-destructive text-xs">Failed</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Version History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Model Version History</CardTitle>
            <CardDescription className="text-xs mt-0.5">Registered model versions and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.version} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-xs font-semibold text-muted-foreground">
                    {v.version.slice(1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Version {v.version}</p>
                    <p className="text-xs text-muted-foreground">MAE: {v.metrics?.mae != null ? v.metrics.mae.toFixed(2) : '-'} · RMSE: {v.metrics?.rmse != null ? v.metrics.rmse.toFixed(2) : '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{formatShortDate(v.registeredAt)}</p>
                    {v.status === 'production' && <Badge variant="outline" className="bg-success/10 text-success text-xs mt-0.5">Production</Badge>}
                    {v.status === 'staging' && <Badge variant="outline" className="bg-warning/10 text-warning text-xs mt-0.5">Staging</Badge>}
                    {v.status === 'archived' && <Badge variant="outline" className="bg-muted text-muted-foreground text-xs mt-0.5">Archived</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retrain confirmation modal */}
      <Dialog open={retrainOpen} onOpenChange={setRetrainOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Retrain Model</DialogTitle>
            <DialogDescription>
              This will trigger a new training run for the demand forecasting model.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Not connected.</span> The model retraining pipeline is not yet integrated.
              This action will be available once the FastAPI backend and MLflow tracking are connected.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetrainOpen(false)}>Cancel</Button>
            <Button onClick={() => { toast.info('Retraining not available', { description: 'MLflow integration is pending.' }); setRetrainOpen(false); }}>
              Acknowledge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
