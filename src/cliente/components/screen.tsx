import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * Container padrão de uma tela do app do cliente. Tipografia e espaçamento
 * generosos (fácil de ler para qualquer idade). O respiro inferior reserva a
 * altura da TabBar + safe-area.
 */
export function Screen({
  title,
  subtitle,
  right,
  children,
  contentClassName,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {title ? (
        <header
          className="sticky top-0 z-10 flex items-end justify-between gap-3 border-b border-border bg-canvas/85 px-5 pb-2.5 backdrop-blur"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.8rem)' }}
        >
          <div className="min-w-0">
            <h1 className="truncate text-[19px] font-bold tracking-tight text-fg">{title}</h1>
            {subtitle ? <p className="mt-0.5 text-[12px] text-fg-muted">{subtitle}</p> : null}
          </div>
          {right}
        </header>
      ) : null}
      <div
        className={cn(
          'flex-1 overflow-y-auto px-5 pt-4',
          'pb-[calc(env(safe-area-inset-bottom)+5.5rem)]',
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
