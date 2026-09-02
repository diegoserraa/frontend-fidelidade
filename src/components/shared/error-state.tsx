import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { getErrorMessage } from '../../lib/errors';

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
  /** `inline` para usar dentro de um card; `block` (padrão) como bloco isolado. */
  variant?: 'block' | 'inline';
}

export function ErrorState({
  error,
  title = 'Não foi possível carregar',
  onRetry,
  className,
  variant = 'block',
}: ErrorStateProps) {
  const message = getErrorMessage(error);

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-subtle px-4 py-3.5 text-[13px]',
        variant === 'block' && 'flex-col items-center py-10 text-center',
        className,
      )}
    >
      <AlertTriangle
        className={cn('size-4 shrink-0 text-danger-fg', variant === 'block' && 'size-5')}
        aria-hidden="true"
      />
      <div className={cn('flex flex-col gap-0.5', variant === 'block' && 'items-center')}>
        <p className="font-medium text-fg">{title}</p>
        <p className="text-fg-muted">{message}</p>
      </div>
      {onRetry ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className={cn(variant === 'inline' && 'ml-auto', variant === 'block' && 'mt-2')}
        >
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
