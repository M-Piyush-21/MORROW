import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StockStatus, Priority } from '@/types';
import { getStockStatusColor, getPriorityColor } from '@/utils/format';

export function StockStatusBadge({ status }: { status: StockStatus }) {
  const color = getStockStatusColor(status);
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', color.bg, color.text, color.border)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', color.text.replace('text-', 'bg-'))} />
      {color.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const color = getPriorityColor(priority);
  return (
    <Badge variant="outline" className={cn('font-medium', color.bg, color.text)}>
      {color.label}
    </Badge>
  );
}
