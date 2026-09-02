import type { ReactNode } from 'react';

interface MetaItem {
  label: string;
  value: ReactNode;
}

interface ListCardProps {
  /** Avatar ou chip de ícone à esquerda do cabeçalho. */
  media?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Menu de ações (⋯) no canto do cabeçalho. */
  actions?: ReactNode;
  /** Linha de pills (status, pontos, etc.). */
  badges?: ReactNode;
  /** Grade inferior de metadados. */
  meta?: MetaItem[];
}

/**
 * Card usado no lugar da tabela abaixo de `md` (via `DataTable renderCard`).
 * Mesmo layout em todas as telas de listagem.
 */
export function ListCard({ media, title, subtitle, actions, badges, meta }: ListCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex items-start gap-3 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--brand)_4%,var(--color-surface)),var(--color-surface))] p-3.5">
        {media ? <div className="shrink-0">{media}</div> : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-fg">{title}</p>
            {actions ? <div className="-mr-1 ml-auto shrink-0">{actions}</div> : null}
          </div>
          {subtitle ? <p className="truncate text-xs text-fg-subtle">{subtitle}</p> : null}
        </div>
      </div>

      {badges ? (
        <div className="flex flex-wrap items-center gap-2 px-3.5 pb-2">{badges}</div>
      ) : null}

      {meta && meta.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border px-3.5 py-2.5 text-[13px]">
          {meta.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wide text-fg-subtle">{item.label}</dt>
              <dd className="truncate text-fg-muted">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}
