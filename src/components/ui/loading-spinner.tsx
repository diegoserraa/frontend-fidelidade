import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
  fullScreen?: boolean;
}

const sizeMap = { sm: 'size-4', md: 'size-6', lg: 'size-8' } as const;

export function LoadingSpinner({
  size = 'md',
  label = 'Carregando…',
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <span
        className={cn(
          'motion-safe:animate-spin rounded-full border-2 border-border border-t-primary',
          sizeMap[size],
        )}
      />
      <span className="text-[13px] text-fg-muted">{label}</span>
    </div>
  );

  return (
    <div
      className={cn(
        fullScreen ? 'flex min-h-dvh items-center justify-center' : 'flex justify-center py-10',
        className,
      )}
    >
      {content}
    </div>
  );
}
