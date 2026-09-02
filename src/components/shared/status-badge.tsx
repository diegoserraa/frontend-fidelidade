import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export type StatusTone = 'success' | 'neutral' | 'warning' | 'info';

const dotClass: Record<StatusTone, string> = {
  success: 'bg-success',
  neutral: 'bg-fg-subtle',
  warning: 'bg-warning',
  info: 'bg-info',
};

const badgeVariant: Record<StatusTone, 'success' | 'neutral' | 'warning' | 'info'> = {
  success: 'success',
  neutral: 'neutral',
  warning: 'warning',
  info: 'info',
};

/** Badge de status com bolinha colorida — padrão em todas as listagens. */
export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <Badge variant={badgeVariant[tone]}>
      <span className={cn('size-1.5 rounded-full', dotClass[tone])} />
      {label}
    </Badge>
  );
}
