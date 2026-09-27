import { useState } from 'react';
import {
  Building2,
  Coins,
  Clock,
  BellRing,
  TrendingUp,
  Palette,
  Server,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { API_BASE_URL, checkBackendHealth } from '@/services/api';
import { defaultSettings } from '@/data/mockData';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function SettingsPage() {
  const { settings, updateSettings, theme, toggleTheme } = useApp();

  const [form, setForm] = useState({
    businessName: settings.businessName,
    businessEmail: settings.businessEmail,
    currency: settings.currency,
    timezone: settings.timezone,
    dateFormat: settings.dateFormat,
    lowStockAlerts: settings.lowStockAlerts,
    stockoutAlerts: settings.stockoutAlerts,
    restockAlerts: settings.restockAlerts,
    defaultForecastHorizon: settings.defaultForecastHorizon,
    theme: settings.theme,
    apiEndpoint: API_BASE_URL,
  });

  const [testingApi, setTestingApi] = useState(false);
  const [apiStatusMessage, setApiStatusMessage] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackendHealth().then(({ isOnline }) => {
      setIsBackendConnected(isOnline);
    });
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      businessName: form.businessName,
      businessEmail: form.businessEmail,
      currency: form.currency,
      timezone: form.timezone,
      dateFormat: form.dateFormat,
      lowStockAlerts: form.lowStockAlerts,
      stockoutAlerts: form.stockoutAlerts,
      restockAlerts: form.restockAlerts,
      defaultForecastHorizon: Number(form.defaultForecastHorizon),
      theme: form.theme as 'light' | 'dark',
    });
    toast.success('Settings saved', {
      description: 'Your workspace preferences have been updated for this session.',
    });
  };

  const handleReset = () => {
    setForm({
      ...defaultSettings,
      apiEndpoint: API_BASE_URL,
    });
    updateSettings(defaultSettings);
    toast.info('Settings reset', {
      description: 'Restored default configuration settings.',
    });
  };

  const handleTestApi = async () => {
    setTestingApi(true);
    setApiStatusMessage(null);
    const { isOnline, details } = await checkBackendHealth();
    setTestingApi(false);
    setIsBackendConnected(isOnline);

    if (isOnline) {
      setApiStatusMessage(
        `FastAPI service is connected and healthy (${details?.version || 'v1.0.0'}). ML model: ${details?.modelLoaded ? 'Loaded' : 'Pending'}, Dataset: ${details?.datasetLoaded ? 'Loaded' : 'Pending'}.`,
      );
      toast.success('Backend Connected', {
        description: `FastAPI server is live at ${form.apiEndpoint}. Real model inferences active.`,
      });
    } else {
      setApiStatusMessage(
        'FastAPI service is not reachable at this address. Running in standalone Mock Data Mode with simulated network latencies.',
      );
      toast.info('API Status: Mock Mode Active', {
        description: 'Frontend is running independently with deterministic mock data.',
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings & Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Configure business identity, localization, forecasting defaults, and backend integration.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Business Profile</CardTitle>
                <CardDescription>
                  Store identity and primary administrative contact details.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="businessName">Store / Business Name</Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="e.g. Kirana Mart"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessEmail">Contact Email</Label>
              <Input
                id="businessEmail"
                type="email"
                value={form.businessEmail}
                onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
                placeholder="owner@store.in"
              />
            </div>
          </CardContent>
        </Card>

        {/* Localization & Currency */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Currency & Format</CardTitle>
                  <CardDescription>
                    Monetary units for valuations, prices, and revenue charts.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currency">Display Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm({ ...form, currency: v })}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹) — Indian Rupee (Default)</SelectItem>
                    <SelectItem value="USD">USD ($) — US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR (€) — Euro</SelectItem>
                    <SelectItem value="GBP">GBP (£) — British Pound</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Default: Indian Rupee (₹) with Lakhs & Crores formatting standard.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dateFormat">Date Display Format</Label>
                <Select
                  value={form.dateFormat}
                  onValueChange={(v) => setForm({ ...form, dateFormat: v })}
                >
                  <SelectTrigger id="dateFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (Indian / Commonwealth Standard)</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US Standard)</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">Timezone & Forecasting Horizon</CardTitle>
                  <CardDescription>
                    Time alignment and default prediction timeframe.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="timezone">Operating Timezone</Label>
                <Select
                  value={form.timezone}
                  onValueChange={(v) => setForm({ ...form, timezone: v })}
                >
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata (IST)">Asia/Kolkata (IST, UTC+5:30)</SelectItem>
                    <SelectItem value="America/New_York (EST)">America/New_York (EST, UTC-5:00)</SelectItem>
                    <SelectItem value="Europe/London (GMT)">Europe/London (GMT, UTC+0:00)</SelectItem>
                    <SelectItem value="Asia/Singapore (SGT)">Asia/Singapore (SGT, UTC+8:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="horizon">Default Forecast Horizon</Label>
                <Select
                  value={String(form.defaultForecastHorizon)}
                  onValueChange={(v) => setForm({ ...form, defaultForecastHorizon: Number(v) })}
                >
                  <SelectTrigger id="horizon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days (Short-term operational)</SelectItem>
                    <SelectItem value="14">14 Days (Bi-weekly restock cycle)</SelectItem>
                    <SelectItem value="30">30 Days (Monthly inventory planning)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts & Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Inventory Alert Preferences</CardTitle>
                <CardDescription>
                  Configure automated warning notifications and threshold events.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Low Stock Alerts</div>
                <div className="text-xs text-muted-foreground">
                  Trigger notification whenever a SKU falls below its calculated reorder point.
                </div>
              </div>
              <Switch
                checked={form.lowStockAlerts}
                onCheckedChange={(checked) => setForm({ ...form, lowStockAlerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Critical Stockout Warnings</div>
                <div className="text-xs text-muted-foreground">
                  High-priority alerts when inventory is depleted or has less than 48 hours of run-rate remaining.
                </div>
              </div>
              <Switch
                checked={form.stockoutAlerts}
                onCheckedChange={(checked) => setForm({ ...form, stockoutAlerts: checked })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Automated Restock Recommendations</div>
                <div className="text-xs text-muted-foreground">
                  Generate daily purchase order suggestions taking supplier lead time and safety stocks into account.
                </div>
              </div>
              <Switch
                checked={form.restockAlerts}
                onCheckedChange={(checked) => setForm({ ...form, restockAlerts: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Theme Preference */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Interface Appearance</CardTitle>
                <CardDescription>
                  Customize dashboard aesthetic styling and contrast.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, theme: 'light' });
                  if (theme !== 'light') toggleTheme();
                }}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
                  form.theme === 'light'
                    ? 'border-primary bg-primary/5 text-foreground font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40'
                }`}
              >
                <div className="h-8 w-14 rounded border border-border bg-white shadow-sm flex items-center justify-center">
                  <div className="h-2 w-8 rounded-full bg-emerald-700" />
                </div>
                <span className="text-xs">Light (Default)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, theme: 'dark' });
                  if (theme !== 'dark') toggleTheme();
                }}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
                  form.theme === 'dark'
                    ? 'border-primary bg-primary/10 text-foreground font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40'
                }`}
              >
                <div className="h-8 w-14 rounded border border-zinc-700 bg-zinc-900 shadow-sm flex items-center justify-center">
                  <div className="h-2 w-8 rounded-full bg-emerald-500" />
                </div>
                <span className="text-xs">Dark Mode</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Future FastAPI & MLOps Integration Status */}
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">MLOps & Backend Integration</CardTitle>
                  <CardDescription>
                    Architecture readiness for FastAPI, MLflow, and DVC model serving.
                  </CardDescription>
                </div>
              </div>
              {isBackendConnected ? (
                <Badge variant="outline" className="gap-1.5 border-success/30 bg-success/10 text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  FastAPI Live
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5 border-warning/30 bg-warning/10 text-warning">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                  Mock Mode (Offline)
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Target API Service Layer
                </span>
                <span className="text-xs font-mono text-muted-foreground">src/services/api.ts</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                All pages route asynchronous requests through the typed service layer. When you connect your live FastAPI backend, set <code className="rounded bg-muted px-1.5 py-0.5 text-foreground font-mono">VITE_API_BASE_URL</code> in your environment file.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiEndpoint">Configured Backend Endpoint</Label>
              <div className="flex gap-2">
                <Input
                  id="apiEndpoint"
                  value={form.apiEndpoint}
                  onChange={(e) => setForm({ ...form, apiEndpoint: e.target.value })}
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestApi}
                  disabled={testingApi}
                  className="gap-1.5 shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${testingApi ? 'animate-spin' : ''}`} />
                  Test Endpoint
                </Button>
              </div>
              {apiStatusMessage && (
                <div className="flex items-start gap-2 rounded-md border border-border bg-secondary/50 p-2.5 text-xs text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  <span>{apiStatusMessage}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">Model Tracking</div>
                <div className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" /> MLflow Ready
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Parameters & Run IDs</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">Data Versioning</div>
                <div className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" /> DVC Pipeline
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Historical feature store</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">Runtime Container</div>
                <div className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Docker / CI/CD
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Production packaging</div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Current Mode: <span className="font-semibold text-foreground">Standalone Prototype (Mock Engine)</span>
            </p>
            <Button type="submit" size="sm" className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save Preferences
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
