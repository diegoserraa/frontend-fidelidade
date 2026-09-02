import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg sm:text-[22px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] text-fg-muted">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none [&>button]:h-10 sm:[&>button]:h-9">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
