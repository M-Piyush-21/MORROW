import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: string; positive: boolean };
  accent?: 'primary' | 'warning' | 'destructive' | 'success';
  sparkline?: ReactNode;
}

export function KpiCard({ title, value, subtitle, icon, trend, accent = 'primary', sparkline }: KpiCardProps) {
  const accentColors = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    success: 'bg-success/10 text-success',
  };

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accentColors[accent])}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {trend && (
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                trend.positive ? 'text-success' : 'text-destructive',
              )}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
        {sparkline && <div className="mt-3 h-10">{sparkline}</div>}
      </CardContent>
    </Card>
  );
}
