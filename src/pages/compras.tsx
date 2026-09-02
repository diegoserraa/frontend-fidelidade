import { useMemo, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Copy, Hash, MoreHorizontal, Plus, Receipt, TrendingUp, Wallet, X } from 'lucide-react';
import { DataTable, type DataTableColumn } from '../components/shared/data-table';
import { ErrorState } from '../components/shared/error-state';
import { FormModal } from '../components/shared/form-modal';
import { ListCard } from '../components/shared/list-card';
import { PageHeader } from '../components/shared/page-header';
import { StatCard } from '../components/shared/stat-card';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Pagination } from '../components/ui/pagination';
import { SearchInput } from '../components/ui/search-input';
import { Select } from '../components/ui/select';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';
import { getErrorMessage } from '../lib/errors';
import { maskCurrencyBRL, parseCurrencyBRL } from '../lib/masks';
import { fidelidadeApi } from '../services/fidelidade';
import type { Compra } from '../types/api';

const pageSize = 10;
const num = new Intl.NumberFormat('pt-BR');
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type SortKey = 'recentes' | 'valor' | 'pontos';

const emptyForm = { clienteId: '', valor: '' };

function ClientRef({ id }: { id: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-subtle">
        <Receipt className="size-4" />
      </span>
      <span className="font-mono text-[13px] text-fg-muted" title={id}>
        {id.slice(0, 8)}
      </span>
    </div>
  );
}

function PointsPill({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center rounded-md bg-success-subtle px-2 py-0.5 text-[13px] font-semibold tabular-nums text-success-fg">
      +{num.format(value)} pts
    </span>
  );
}

function DateCell({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <span className="whitespace-nowrap">
      <span className="text-fg">{d.toLocaleDateString('pt-BR')}</span>{' '}
      <span className="text-fg-subtle">
        {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </span>
  );
}

const columns: DataTableColumn<Compra>[] = [
  {
    key: 'clienteEmpresaId',
    header: 'Cliente',
    render: (row) => <ClientRef id={row.clienteEmpresaId} />,
  },
  {
    key: 'valor',
    header: 'Valor',
    align: 'right',
    render: (row) => (
      <span className="tabular-nums font-semibold text-fg">{brl.format(Number(row.valor))}</span>
    ),
  },
  {
    key: 'pontosGerados',
    header: 'Pontos',
    align: 'right',
    render: (row) => <PointsPill value={row.pontosGerados} />,
  },
  {
    key: 'createdAt',
    header: 'Data',
    render: (row) => <DateCell iso={row.createdAt} />,
  },
];

export function ComprasPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recentes');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['compras', page],
    queryFn: () => fidelidadeApi.getCompras(page, pageSize),
    placeholderData: keepPreviousData,
  });

  const allRows = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;

  // Busca e ordenação atuam sobre a página carregada (a API pagina no servidor).
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? allRows.filter((compra) => compra.clienteEmpresaId.toLowerCase().includes(term))
      : allRows;

    const sorted = [...filtered];
    if (sort === 'valor') sorted.sort((a, b) => Number(b.valor) - Number(a.valor));
    else if (sort === 'pontos') sorted.sort((a, b) => b.pontosGerados - a.pontosGerados);
    else sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return sorted;
  }, [allRows, search, sort]);

  const valorPagina = allRows.reduce((sum, compra) => sum + Number(compra.valor), 0);
  const ticketMedio = allRows.length ? valorPagina / allRows.length : 0;
  const filtering = search.trim() !== '' || sort !== 'recentes';

  const createCompra = useMutation({
    mutationFn: () =>
      fidelidadeApi.createCompra({
        clienteId: form.clienteId.trim(),
        valor: parseCurrencyBRL(form.valor),
      }),
    onSuccess: (compra) => {
      setForm(emptyForm);
      setFormError(null);
      setModalOpen(false);
      setPage(1);
      void queryClient.invalidateQueries({ queryKey: ['compras'] });
      toast.success(
        'Compra registrada',
        `${brl.format(Number(compra.valor))} · +${num.format(compra.pontosGerados)} pts`,
      );
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Não foi possível registrar a compra.')),
  });

  const handleSubmit = () => {
    if (!form.clienteId.trim()) return setFormError('Informe o ID do cliente.');
    if (parseCurrencyBRL(form.valor) <= 0) return setFormError('Informe um valor maior que zero.');
    setFormError(null);
    createCompra.mutate();
  };

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <PageHeader
        title="Compras"
        description="Compras registradas e os pontos gerados para cada cliente."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="size-4" />
            Nova compra
          </Button>
        }
      />

      <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          size="sm"
          accent="emerald"
          icon={Receipt}
          label="Compras"
          value={num.format(total)}
          hint="no total"
        />
        <StatCard
          size="sm"
          accent="sky"
          icon={Wallet}
          label="Valor"
          value={brl.format(valorPagina)}
          hint="nesta página"
        />
        <StatCard
          size="sm"
          accent="violet"
          icon={TrendingUp}
          label="Ticket médio"
          value={brl.format(ticketMedio)}
          hint="por compra"
        />
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          fill
          className={cn(isFetching && !isLoading && 'opacity-70 transition-opacity')}
          columns={columns}
          data={rows}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          toolbar={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                className="w-full min-w-0 sm:flex-1"
                inputClassName="border-transparent bg-surface-muted/60 focus-visible:border-primary focus-visible:bg-surface"
                aria-label="Filtrar compras por ID do cliente"
                placeholder="Filtrar por ID do cliente…"
                value={search}
                onChange={setSearch}
              />
              <div className="flex items-center gap-2">
                <Select
                  className="flex-1 sm:w-48 sm:flex-none"
                  aria-label="Ordenar compras"
                  value={sort}
                  onValueChange={(value) => setSort(value as SortKey)}
                  options={[
                    { value: 'recentes', label: 'Mais recentes' },
                    { value: 'valor', label: 'Maior valor' },
                    { value: 'pontos', label: 'Mais pontos' },
                  ]}
                />
                {filtering ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label="Limpar filtros"
                    onClick={() => {
                      setSearch('');
                      setSort('recentes');
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          }
          renderActions={(row) => <CompraRowActions compra={row} />}
          renderCard={(row) => <CompraCard compra={row} />}
          footer={
            total > 0 ? (
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            ) : undefined
          }
          emptyTitle={
            search.trim() ? 'Nenhuma compra para esse cliente nesta página' : 'Nenhuma compra registrada'
          }
          emptyDescription={
            search.trim()
              ? 'Ajuste o filtro ou navegue para outra página.'
              : 'Registre a primeira compra para começar.'
          }
          emptyAction={
            !search.trim() ? (
              <Button size="sm" onClick={() => setModalOpen(true)}>
                <Plus className="size-4" />
                Nova compra
              </Button>
            ) : undefined
          }
        />
      )}

      <FormModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setForm(emptyForm);
            setFormError(null);
          }
        }}
        title="Nova compra"
        description="Registre uma compra usando o identificador do cliente."
        submitLabel={createCompra.isPending ? 'Registrando…' : 'Registrar compra'}
        onSubmit={handleSubmit}
        disabled={createCompra.isPending}
        error={formError}
      >
        <div className="grid gap-3.5">
          <Input
            label="ID do cliente"
            value={form.clienteId}
            onChange={(event) => setForm((current) => ({ ...current, clienteId: event.target.value }))}
            placeholder="Identificador do cliente"
            autoComplete="off"
            spellCheck={false}
          />
          <Input
            label="Valor"
            hint="Em reais"
            leftSlot="R$"
            value={form.valor}
            onChange={(event) =>
              setForm((current) => ({ ...current, valor: maskCurrencyBRL(event.target.value) }))
            }
            placeholder="0,00"
            inputMode="numeric"
          />
        </div>
      </FormModal>
    </div>
  );
}

function CompraRowActions({ compra }: { compra: Compra }) {
  const toast = useToast();

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.info(`${label} copiado`);
    } catch {
      toast.error(`Não foi possível copiar o ${label.toLowerCase()}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Ações da compra">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Compra</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void copy('ID da compra', compra.id)}>
          <Hash />
          Copiar ID da compra
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy('ID do cliente', compra.clienteEmpresaId)}>
          <Copy />
          Copiar ID do cliente
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CompraCard({ compra }: { compra: Compra }) {
  const d = new Date(compra.createdAt);
  return (
    <ListCard
      media={
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-subtle">
          <Receipt className="size-5" />
        </span>
      }
      title={<span className="tabular-nums">{brl.format(Number(compra.valor))}</span>}
      subtitle={
        <span className="font-mono">cliente {compra.clienteEmpresaId.slice(0, 12)}</span>
      }
      actions={<CompraRowActions compra={compra} />}
      badges={<PointsPill value={compra.pontosGerados} />}
      meta={[
        { label: 'Data', value: d.toLocaleDateString('pt-BR') },
        {
          label: 'Hora',
          value: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]}
    />
  );
}
