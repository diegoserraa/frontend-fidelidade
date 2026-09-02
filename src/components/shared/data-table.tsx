import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { EmptyState } from './empty-state';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => ReactNode;
  accessor?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** Compat: título curto do estado vazio. */
  emptyText?: string;
  className?: string;
  renderActions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  /**
   * Modo "app": o card ocupa a altura disponível (`flex-1`), a área de linhas
   * rola internamente com o cabeçalho fixo e o `footer` fica ancorado embaixo.
   */
  fill?: boolean;
  /** Barra fixa no topo do card (busca, filtros). Fica acima do cabeçalho. */
  toolbar?: ReactNode;
  /** Conteúdo ancorado no rodapé do card (ex.: <Pagination />). */
  footer?: ReactNode;
  /** Número de linhas do skeleton de carregamento. */
  loadingRows?: number;
  /**
   * Abaixo de `md` cada registro vira um card com este conteúdo (a tabela some).
   * `md+` mostra a tabela normalmente.
   */
  renderCard?: (row: T) => ReactNode;
};

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const;

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  isLoading,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyText,
  className,
  renderActions,
  onRowClick,
  fill = false,
  toolbar,
  footer,
  loadingRows = 8,
  renderCard,
}: DataTableProps<T>) {
  const showEmpty = !isLoading && data.length === 0;

  const headCell = cn(
    'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle',
    'bg-[linear-gradient(180deg,var(--color-surface-muted),color-mix(in_srgb,var(--color-surface-muted)_60%,var(--color-surface)))]',
  );

  const empty = showEmpty ? (
    <EmptyState
      className="border-0 shadow-none"
      title={emptyTitle ?? emptyText ?? 'Nenhum registro encontrado'}
      description={emptyDescription}
      action={emptyAction}
    />
  ) : null;

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm',
        fill && 'min-h-0',
        className,
      )}
    >
      {toolbar ? (
        <div className="shrink-0 border-b border-border bg-[linear-gradient(180deg,color-mix(in_srgb,var(--brand)_2.5%,var(--color-surface)),var(--color-surface))] px-3 py-2.5">
          {toolbar}
        </div>
      ) : null}

      {/* Cards — abaixo de md */}
      {renderCard && !showEmpty ? (
        <div
          className={cn(
            'flex flex-col gap-2.5 bg-surface-muted/30 p-3 md:hidden',
            fill && 'min-h-0 overflow-y-auto',
          )}
        >
          {isLoading
            ? Array.from({ length: Math.min(loadingRows, 4) }).map((_, index) => (
                <div
                  key={index}
                  className="h-[132px] motion-safe:animate-pulse rounded-2xl border border-border bg-surface"
                />
              ))
            : data.map((row) => <div key={getRowKey(row)}>{renderCard(row)}</div>)}
        </div>
      ) : null}

      {/* Tabela — md+ (ou sempre, se não houver renderCard) */}
      <div
        className={cn(
          'overflow-x-auto',
          fill && 'min-h-0 overflow-y-auto',
          renderCard && 'hidden md:block',
        )}
      >
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className={cn(fill && 'sticky top-0 z-10')}>
            <tr className="border-b border-border shadow-[0_1px_0_var(--color-border)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(headCell, alignClass[column.align ?? 'left'], column.className)}
                >
                  {column.header}
                </th>
              ))}
              {renderActions ? (
                <th scope="col" className={cn(headCell, 'text-right')}>
                  Ações
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: loadingRows }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border last:border-0">
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3">
                        <div className="h-3.5 w-24 max-w-full motion-safe:animate-pulse rounded bg-surface-muted" />
                      </td>
                    ))}
                    {renderActions ? (
                      <td className="px-4 py-3">
                        <div className="ml-auto h-8 w-16 motion-safe:animate-pulse rounded bg-surface-muted" />
                      </td>
                    ) : null}
                  </tr>
                ))
              : data.map((row) => (
                  <tr
                    key={getRowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-border last:border-0 transition-colors hover:bg-primary-subtle/40',
                      onRowClick && 'cursor-pointer',
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'px-4 py-3 align-middle text-fg-muted',
                          alignClass[column.align ?? 'left'],
                          column.className,
                        )}
                      >
                        {column.render
                          ? column.render(row)
                          : column.accessor
                            ? column.accessor(row)
                            : null}
                      </td>
                    ))}
                    {renderActions ? (
                      <td className="px-4 py-3 text-right align-middle">{renderActions(row)}</td>
                    ) : null}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {empty}

      {footer ? (
        <div className="shrink-0 border-t border-border bg-surface px-4 py-2.5">{footer}</div>
      ) : null}
    </div>
  );
}
