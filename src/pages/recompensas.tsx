import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CircleCheck,
  Coins,
  Copy,
  Gift,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../components/shared/confirm-dialog';
import { DataTable, type DataTableColumn } from '../components/shared/data-table';
import { ErrorState } from '../components/shared/error-state';
import { FormModal } from '../components/shared/form-modal';
import { ListCard } from '../components/shared/list-card';
import { PageHeader } from '../components/shared/page-header';
import { StatCard } from '../components/shared/stat-card';
import { StatusBadge } from '../components/shared/status-badge';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Pagination } from '../components/ui/pagination';
import { SearchInput } from '../components/ui/search-input';
import { Select } from '../components/ui/select';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';
import { getErrorMessage } from '../lib/errors';
import { maskInteger, parseInteger } from '../lib/masks';
import { fidelidadeApi } from '../services/fidelidade';
import type { Recompensa } from '../types/api';

const pageSize = 10;
const num = new Intl.NumberFormat('pt-BR');
const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR');

type StatusFilter = 'todas' | 'ativa' | 'inativa';

const emptyForm = { titulo: '', descricao: '', custoPontos: '100' };

function IconChip({ icon: Icon, size = 8 }: { icon: typeof Gift; size?: 8 | 10 }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-subtle',
        size === 10 ? 'size-10' : 'size-8',
      )}
    >
      <Icon className={size === 10 ? 'size-5' : 'size-4'} />
    </span>
  );
}

function CostPill({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center rounded-md bg-primary-subtle px-2 py-0.5 text-[13px] font-semibold tabular-nums text-primary-subtle-fg">
      {num.format(value)} pts
    </span>
  );
}

const statusTone = (status: Recompensa['status']) => (status === 'ativa' ? 'success' : 'neutral');
const statusLabel = (status: Recompensa['status']) => (status === 'ativa' ? 'Ativa' : 'Inativa');

const columns: DataTableColumn<Recompensa>[] = [
  {
    key: 'titulo',
    header: 'Recompensa',
    render: (row) => (
      <div className="flex items-center gap-3">
        <IconChip icon={Gift} />
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{row.titulo}</p>
          <p className="truncate text-xs text-fg-subtle">{row.descricao || 'Sem descrição'}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'custoPontos',
    header: 'Custo',
    align: 'right',
    render: (row) => <CostPill value={row.custoPontos} />,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge label={statusLabel(row.status)} tone={statusTone(row.status)} />,
  },
  {
    key: 'createdAt',
    header: 'Criada em',
    render: (row) => <span className="text-fg-muted">{formatDate(row.createdAt)}</span>,
  },
];

export function RecompensasPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recompensa | null>(null);
  const [deleting, setDeleting] = useState<Recompensa | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['recompensas'],
    queryFn: fidelidadeApi.getRecompensas,
  });

  const list = useMemo(() => data ?? [], [data]);
  const ativas = list.filter((item) => item.status === 'ativa').length;
  const custoTotal = list.reduce((sum, item) => sum + item.custoPontos, 0);
  const custoMedio = list.length ? Math.round(custoTotal / list.length) : 0;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((item) => {
      if (statusFilter !== 'todas' && item.status !== statusFilter) return false;
      if (!term) return true;
      return (
        item.titulo.toLowerCase().includes(term) ||
        (item.descricao ?? '').toLowerCase().includes(term)
      );
    });
  }, [list, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const filtering = search.trim() !== '' || statusFilter !== 'todas';

  const resetPage = () => setPage(1);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (recompensa: Recompensa) => {
    setEditing(recompensa);
    setForm({
      titulo: recompensa.titulo,
      descricao: recompensa.descricao ?? '',
      custoPontos: String(recompensa.custoPontos),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const saveRecompensa = useMutation({
    mutationFn: () => {
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || undefined,
        custoPontos: parseInteger(form.custoPontos),
      };
      return editing
        ? fidelidadeApi.updateRecompensa(editing.id, payload)
        : fidelidadeApi.createRecompensa(payload);
    },
    onSuccess: () => {
      const titulo = form.titulo.trim();
      const editou = Boolean(editing);
      setForm(emptyForm);
      setFormError(null);
      setModalOpen(false);
      setEditing(null);
      if (!editou) setPage(1);
      void queryClient.invalidateQueries({ queryKey: ['recompensas'] });
      toast.success(
        editou ? 'Recompensa atualizada' : 'Recompensa criada',
        editou ? `${titulo} foi atualizada.` : `${titulo} entrou no catálogo.`,
      );
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Não foi possível salvar a recompensa.')),
  });

  const deleteRecompensa = useMutation({
    mutationFn: (id: string) => fidelidadeApi.deleteRecompensa(id),
    onSuccess: () => {
      const titulo = deleting?.titulo;
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['recompensas'] });
      toast.success('Recompensa excluída', titulo ? `${titulo} saiu do catálogo.` : undefined);
    },
    onError: (err) => toast.error('Não foi possível excluir', getErrorMessage(err)),
  });

  const handleSubmit = () => {
    if (!form.titulo.trim()) return setFormError('Informe o título da recompensa.');
    if (parseInteger(form.custoPontos) <= 0) {
      return setFormError('O custo em pontos deve ser maior que zero.');
    }
    setFormError(null);
    saveRecompensa.mutate();
  };

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <PageHeader
        title="Recompensas"
        description="Itens que os clientes podem resgatar com pontos."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nova recompensa
          </Button>
        }
      />

      <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          size="sm"
          accent="emerald"
          icon={Gift}
          label="Recompensas"
          value={num.format(list.length)}
          hint="no catálogo"
        />
        <StatCard
          size="sm"
          accent="sky"
          icon={CircleCheck}
          label="Ativas"
          value={num.format(ativas)}
          hint={`de ${list.length}`}
        />
        <StatCard
          size="sm"
          accent="violet"
          icon={Coins}
          label="Custo médio"
          value={`${num.format(custoMedio)} pts`}
          hint="por item"
        />
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          fill
          className={cn(isFetching && !isLoading && 'opacity-70 transition-opacity')}
          columns={columns}
          data={pageRows}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          toolbar={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput
                className="w-full min-w-0 sm:flex-1"
                inputClassName="border-transparent bg-surface-muted/60 focus-visible:border-primary focus-visible:bg-surface"
                aria-label="Buscar recompensas"
                placeholder="Buscar por título ou descrição…"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  resetPage();
                }}
              />
              <div className="flex items-center gap-2">
                <Select
                  className="flex-1 sm:w-44 sm:flex-none"
                  aria-label="Filtrar por status"
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as StatusFilter);
                    resetPage();
                  }}
                  options={[
                    { value: 'todas', label: 'Todas' },
                    { value: 'ativa', label: 'Ativas' },
                    { value: 'inativa', label: 'Inativas' },
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
                      setStatusFilter('todas');
                      resetPage();
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          }
          renderActions={(row) => (
            <RecompensaRowActions
              recompensa={row}
              onEdit={() => openEdit(row)}
              onDelete={() => setDeleting(row)}
            />
          )}
          renderCard={(row) => (
            <RecompensaCard
              recompensa={row}
              onEdit={() => openEdit(row)}
              onDelete={() => setDeleting(row)}
            />
          )}
          footer={
            filtered.length > 0 ? (
              <Pagination
                page={safePage}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
              />
            ) : undefined
          }
          emptyTitle={filtering ? 'Nenhuma recompensa encontrada' : 'Nenhuma recompensa cadastrada'}
          emptyDescription={
            filtering
              ? 'Ajuste a busca ou o filtro.'
              : 'Crie a primeira recompensa do catálogo.'
          }
          emptyAction={
            !filtering ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" />
                Nova recompensa
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
            setEditing(null);
          }
        }}
        title={editing ? 'Editar recompensa' : 'Nova recompensa'}
        description={
          editing
            ? 'Atualize os dados desta recompensa do catálogo.'
            : 'Cadastre um item do catálogo de recompensas.'
        }
        submitLabel={saveRecompensa.isPending ? 'Salvando…' : 'Salvar recompensa'}
        onSubmit={handleSubmit}
        disabled={saveRecompensa.isPending}
        error={formError}
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="Título"
            value={form.titulo}
            onChange={(event) => setForm((c) => ({ ...c, titulo: event.target.value }))}
            placeholder="Ex.: Café grátis"
          />
          <Input
            label="Custo em pontos"
            hint="Em pontos"
            inputMode="numeric"
            value={form.custoPontos}
            onChange={(event) => setForm((c) => ({ ...c, custoPontos: maskInteger(event.target.value) }))}
            placeholder="100"
          />
          <div className="sm:col-span-2">
            <Input
              label="Descrição"
              hint="Opcional"
              value={form.descricao}
              onChange={(event) => setForm((c) => ({ ...c, descricao: event.target.value }))}
              placeholder="Detalhe a recompensa"
            />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Excluir recompensa"
        description={
          deleting ? (
            <>
              A recompensa <strong className="text-fg">{deleting.titulo}</strong> será removida do
              catálogo. Recompensas já resgatadas por clientes não podem ser excluídas — nesse caso,
              inative-a.
            </>
          ) : undefined
        }
        confirmLabel="Excluir"
        loading={deleteRecompensa.isPending}
        onConfirm={() => deleting && deleteRecompensa.mutate(deleting.id)}
      />
    </div>
  );
}

function RecompensaRowActions({
  recompensa,
  onEdit,
  onDelete,
}: {
  recompensa: Recompensa;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const next = recompensa.status === 'ativa' ? 'inativa' : 'ativa';

  const toggle = useMutation({
    mutationFn: () => fidelidadeApi.toggleRecompensa(recompensa.id, next),
    onSuccess: (updated) => {
      toast.success(updated.status === 'ativa' ? 'Recompensa ativada' : 'Recompensa inativada');
      void queryClient.invalidateQueries({ queryKey: ['recompensas'] });
    },
    onError: (err) => toast.error('Não foi possível atualizar', getErrorMessage(err)),
  });

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(recompensa.id);
      toast.info('ID copiado');
    } catch {
      toast.error('Não foi possível copiar o id');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${recompensa.titulo}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{recompensa.titulo}</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onEdit();
          }}
        >
          <Pencil />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={toggle.isPending}
          onSelect={(event) => {
            event.preventDefault();
            toggle.mutate();
          }}
        >
          <Power />
          {recompensa.status === 'ativa' ? 'Inativar' : 'Ativar'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copyId()}>
          <Copy />
          Copiar ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="danger"
          onSelect={(event) => {
            event.preventDefault();
            onDelete();
          }}
        >
          <Trash2 />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecompensaCard({
  recompensa,
  onEdit,
  onDelete,
}: {
  recompensa: Recompensa;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <ListCard
      media={<IconChip icon={Gift} size={10} />}
      title={recompensa.titulo}
      subtitle={recompensa.descricao || 'Sem descrição'}
      actions={<RecompensaRowActions recompensa={recompensa} onEdit={onEdit} onDelete={onDelete} />}
      badges={
        <>
          <CostPill value={recompensa.custoPontos} />
          <StatusBadge label={statusLabel(recompensa.status)} tone={statusTone(recompensa.status)} />
        </>
      }
      meta={[{ label: 'Criada em', value: formatDate(recompensa.createdAt) }]}
    />
  );
}
