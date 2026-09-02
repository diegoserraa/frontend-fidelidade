import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export type StatAccent = 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'teal';

const ACCENT_VAR: Record<StatAccent, string> = {
  emerald: 'var(--color-chart-1)',
  sky: 'var(--color-chart-2)',
  violet: 'var(--color-chart-3)',
  amber: 'var(--color-chart-4)',
  rose: 'var(--color-chart-5)',
  teal: 'var(--color-chart-6)',
};

type StatCardProps = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  delta?: { value: string; direction: 'up' | 'down' };
  /** `sm` para faixas de métricas em telas de listagem; `md` (padrão) para o dashboard. */
  size?: 'sm' | 'md';
  /** Cor de destaque — ativa gradiente, brilho e chip do ícone tonalizados. */
  accent?: StatAccent;
  className?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  delta,
  size = 'md',
  accent,
  className,
}: StatCardProps) {
  const sm = size === 'sm';
  const c = accent ? ACCENT_VAR[accent] : null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border transition-shadow',
        c ? 'border-transparent' : 'border-border bg-surface shadow-xs',
        sm ? 'p-3 sm:p-3.5' : 'p-4',
        className,
      )}
      style={
        c
          ? {
              backgroundImage: `linear-gradient(150deg, var(--color-surface), color-mix(in srgb, ${c} 9%, var(--color-surface)))`,
              boxShadow: `0 1px 2px rgb(24 24 27 / 0.04), 0 14px 28px -16px color-mix(in srgb, ${c} 55%, transparent)`,
              outline: `1px solid color-mix(in srgb, ${c} 20%, transparent)`,
              outlineOffset: '-1px',
            }
          : undefined
      }
    >
      {c ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full blur-2xl"
          style={{ backgroundColor: `color-mix(in srgb, ${c} 32%, transparent)`, opacity: 0.55 }}
        />
      ) : null}

      <div className="relative flex flex-col gap-1">
        <div className="flex items-center justify-between gap-1.5">
          <span
            className={cn(
              'min-w-0 truncate font-medium text-fg-muted',
              sm ? 'text-[11px] sm:text-xs' : 'text-[13px]',
            )}
          >
            {label}
          </span>
          {Icon ? (
            <span
              className={cn(
                'flex shrink-0 items-center justify-center rounded-lg',
                sm ? 'size-5 sm:size-6' : 'size-7',
                !c && 'text-fg-subtle',
              )}
              style={
                c
                  ? {
                      backgroundColor: `color-mix(in srgb, ${c} 20%, var(--color-surface))`,
                      color: `color-mix(in srgb, ${c} 72%, #000)`,
                    }
                  : undefined
              }
            >
              <Icon className={sm ? 'size-3 sm:size-3.5' : 'size-4'} aria-hidden="true" />
            </span>
          ) : null}
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'truncate font-semibold tracking-tight text-fg tabular-nums',
              sm ? 'text-[17px] sm:text-xl' : 'text-2xl',
            )}
          >
            {value}
          </span>
          {delta ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium',
                delta.direction === 'up' ? 'text-success-fg' : 'text-danger-fg',
              )}
            >
              {delta.direction === 'up' ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {delta.value}
            </span>
          ) : null}
        </div>

        {hint ? (
          <p className={cn('truncate text-fg-subtle', sm ? 'text-[10px] sm:text-[11px]' : 'text-xs')}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
