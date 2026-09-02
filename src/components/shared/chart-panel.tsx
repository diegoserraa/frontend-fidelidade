import type { ReactNode } from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';

type InsightTone = 'neutral' | 'positive' | 'attention';

interface ChartPanelProps {
  title: string;
  description?: string;
  toolbar?: ReactNode;
  insight?: { tone: InsightTone; text: string };
  className?: string;
  children: ReactNode;
}

const toneStyles: Record<InsightTone, string> = {
  neutral: 'bg-surface-muted text-fg-muted',
  positive: 'bg-success-subtle text-success-fg',
  attention: 'bg-warning-subtle text-warning-fg',
};

export function ChartPanel({
  title,
  description,
  toolbar,
  insight,
  className,
  children,
}: ChartPanelProps) {
  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border shadow-xs',
        'bg-[linear-gradient(180deg,var(--color-surface),color-mix(in_srgb,var(--brand)_3%,var(--color-surface)))]',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-semibold text-fg">{title}</h3>
          {description ? (
            <p className="truncate text-[11px] text-fg-muted">{description}</p>
          ) : null}
        </div>
        {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-3.5 py-3">{children}</div>

      {insight ? (
        <footer className="px-3.5 pb-3">
          <p
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] leading-tight',
              toneStyles[insight.tone],
            )}
          >
            <Lightbulb className="size-3 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">{insight.text}</span>
          </p>
        </footer>
      ) : null}
    </section>
  );
}
