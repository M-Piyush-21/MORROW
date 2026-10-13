import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  Sun,
  Moon,
  ChevronDown,
  Calendar,
  CheckCheck,
  Cpu,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/format';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { getModelInfo } from '@/services/api';
import type { DateRangePreset, ModelInfoResponse } from '@/types';

const pageTitles: Record<string, { title: string; breadcrumb: string }> = {
  '/': { title: 'Dashboard', breadcrumb: 'Overview' },
  '/inventory': { title: 'Inventory', breadcrumb: 'Inventory' },
  '/forecast': { title: 'Demand Forecast', breadcrumb: 'Forecast' },
  '/restock': { title: 'Restock Recommendations', breadcrumb: 'Restock' },
  '/analytics': { title: 'Analytics', breadcrumb: 'Analytics' },
  '/model': { title: 'Model Performance', breadcrumb: 'Model' },
  '/settings': { title: 'Settings', breadcrumb: 'Settings' },
};

interface TopNavProps {
  onMenuClick: () => void;
  dateRange: DateRangePreset;
  onDateRangeChange: (range: DateRangePreset) => void;
}

export function TopNav({ onMenuClick, dateRange, onDateRangeChange }: TopNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme, notifications, markNotificationRead, markAllNotificationsRead, unreadCount, settings } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const currentPath = location.pathname;
  const pageKey = Object.keys(pageTitles).find((key) =>
    key === '/' ? currentPath === '/' : currentPath.startsWith(key),
  ) || '/';
  const { title, breadcrumb } = pageTitles[pageKey];

  const [modelInfo, setModelInfo] = useState<ModelInfoResponse | null>(null);

  useEffect(() => {
    getModelInfo().then(setModelInfo).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const notifIcon = (type: string) => {
    switch (type) {
      case 'error': return 'bg-destructive/10 text-destructive';
      case 'warning': return 'bg-warning/10 text-warning';
      case 'success': return 'bg-success/10 text-success';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-muted-foreground hover:bg-secondary lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Title & breadcrumb */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Morrow</span>
          <span>/</span>
          <span className="text-foreground font-medium">{breadcrumb}</span>
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      </div>

      {/* Search */}
      <div className="relative ml-auto hidden max-w-xs flex-1 md:block lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              navigate(`/inventory?search=${encodeURIComponent(searchQuery.trim())}`);
            }
          }}
          placeholder="Search products, SKUs... (Enter to go)"
          className="h-9 pl-9 pr-12 bg-secondary/50"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* Date range */}
      <div className="hidden sm:block">
        <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRangePreset)}>
          <SelectTrigger className="h-9 w-[130px] gap-2 bg-secondary/50">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="14d">Last 14 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Model Version & Freshness Popover Pill */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="hidden lg:flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-primary/10 transition-colors"
            title="Inspect Model Version & Data Freshness"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-semibold text-primary">{modelInfo?.modelVersion || 'v1.6'}</span>
            <span className="text-muted-foreground font-mono text-[11px]">(@production)</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-[11px] text-muted-foreground">
              {modelInfo?.dataFreshness?.last_recorded_invoice_date || '2011-12-09'}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 text-xs space-y-3" align="end">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Cpu className="h-4 w-4 text-primary" />
              <span>{modelInfo?.modelName || 'Random Forest Regressor'}</span>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
              {modelInfo?.status || 'PRODUCTION'}
            </Badge>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>Model Version:</span>
              <span className="font-mono font-bold text-foreground">{modelInfo?.modelVersion || 'v1.6'}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Last Trained:</span>
              <span className="font-medium text-foreground">
                {modelInfo?.lastSuccessfulTrainingTime
                  ? new Date(modelInfo.lastSuccessfulTrainingTime).toLocaleString()
                  : 'Oct 13, 2026, 03:05 UTC'}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Primary Metric (WAPE):</span>
              <span className="font-bold text-primary">
                {modelInfo?.evaluationSummary?.wape ? `${modelInfo.evaluationSummary.wape.toFixed(1)}%` : '83.2%'}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Interval Coverage:</span>
              <span className="font-medium text-foreground">
                {modelInfo?.evaluationSummary?.interval_coverage_pct ? `${modelInfo.evaluationSummary.interval_coverage_pct.toFixed(1)}% (80% target)` : '76.7%'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-border space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Database className="h-3.5 w-3.5 text-primary" />
              <span>Data Freshness & Lineage</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Dataset:</span>
              <span className="font-medium text-foreground">{modelInfo?.dataFreshness?.dataset || 'UCI Online Retail'}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Latest Invoiced Date:</span>
              <span className="font-mono font-medium text-foreground">{modelInfo?.dataFreshness?.last_recorded_invoice_date || '2011-12-09'}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Featured Rows:</span>
              <span className="font-medium text-foreground">{modelInfo?.dataFreshness?.total_featured_rows?.toLocaleString() || '17,300'}</span>
            </div>
          </div>

          <div className="rounded bg-secondary/50 p-2 text-[10px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-warning shrink-0" />
            <span>Synthetic Inventory Mode: On-hand stocks are scenario inputs for policy testing.</span>
          </div>
        </PopoverContent>
      </Popover>

      {/* Notifications */}
      <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
        <DropdownMenuTrigger asChild>
          <button className="relative rounded-md p-2 text-muted-foreground hover:bg-secondary">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            <button
              onClick={markAllNotificationsRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={cn(
                  'flex gap-3 border-b px-3 py-2.5 cursor-pointer hover:bg-secondary/50 transition-colors',
                  !n.read && 'bg-primary/5',
                )}
              >
                <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs', notifIcon(n.type))}>
                  <Bell className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{formatRelativeTime(n.timestamp)}</p>
                </div>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="rounded-md p-2 text-muted-foreground hover:bg-secondary"
      >
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>

      {/* User profile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-md p-1 hover:bg-secondary">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                RS
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left lg:block">
              <p className="text-xs font-medium text-foreground">Rahul Sharma</p>
              <p className="text-[10px] text-muted-foreground">Operations Manager</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-muted-foreground lg:block" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {settings.businessName}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
            Profile Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/model')} className="cursor-pointer">
            Model Status
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => toast.info('Demo Mode', { description: 'Sign out simulated for prototype' })}
            className="text-destructive cursor-pointer"
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
