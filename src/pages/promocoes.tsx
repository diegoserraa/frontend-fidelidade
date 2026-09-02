import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, FileText, Megaphone, MoreHorizontal, Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../components/shared/confirm-dialog';
import { DataTable, type DataTableColumn } from '../components/shared/data-table';
import { ErrorState } from '../components/shared/error-state';
import { FormModal } from '../components/shared/form-modal';
import { ListCard } from '../components/shared/list-card';
import { PageHeader } from '../components/shared/page-header';
import { StatCard } from '../components/shared/stat-card';
import { StatusBadge, type StatusTone } from '../components/shared/status-badge';
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
import { fidelidadeApi } from '../services/fidelidade';
import type { Promocao } from '../types/api';

const pageSize = 10;
const num = new Intl.NumberFormat('pt-BR');

type StatusFilter = 'todas' | Promocao['status'];

const statusMeta: Record<Promocao['status'], { label: string; tone: StatusTone }> = {
  enviada: { label: 'Enviada', tone: 'success' },
  rascunho: { label: 'Rascunho', tone: 'warning' },
  inativa: { label: 'Inativa', tone: 'neutral' },
};

const emptyForm = { titulo: '', mensagem: '' };

const envio = (row: Promocao) =>
  row.enviadaEm ? new Date(row.enviadaEm).toLocaleString('pt-BR') : 'Não enviada';

function IconChip({ size = 8 }: { size?: 8 | 10 }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-subtle',
        size === 10 ? 'size-10' : 'size-8',
      )}
    >
      <Megaphone className={size === 10 ? 'size-5' : 'size-4'} />
    </span>
  );
}

const columns: DataTableColumn<Promocao>[] = [
  {
    key: 'titulo',
    header: 'Campanha',
    render: (row) => (
      <div className="flex items-center gap-3">
        <IconChip />
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{row.titulo}</p>
          <p className="truncate text-xs text-fg-subtle">{row.mensagem}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <StatusBadge label={statusMeta[row.status].label} tone={statusMeta[row.status].tone} />
    ),
  },
  {
    key: 'enviadaEm',
    header: 'Envio',
    render: (row) => <span className="whitespace-nowrap text-fg-muted">{envio(row)}</span>,
  },
];

export function PromocoesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promocao | null>(null);
  const [deleting, setDeleting] = useState<Promocao | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['promocoes'],
    queryFn: fidelidadeApi.getPromocoes,
  });

  const list = useMemo(() => data ?? [], [data]);
  const enviadas = list.filter((item) => item.status === 'enviada').length;
  const rascunhos = list.filter((item) => item.status === 'rascunho').length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((item) => {
      if (statusFilter !== 'todas' && item.status !== statusFilter) return false;
      if (!term) return true;
      return (
        item.titulo.toLowerCase().includes(term) || item.mensagem.toLowerCase().includes(term)
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

  const openEdit = (promocao: Promocao) => {
    setEditing(promocao);
    setForm({ titulo: promocao.titulo, mensagem: promocao.mensagem });
    setFormError(null);
    setModalOpen(true);
  };

  const savePromocao = useMutation({
    mutationFn: () => {
      const payload = { titulo: form.titulo.trim(), mensagem: form.mensagem.trim() };
      return editing
        ? fidelidadeApi.updatePromocao(editing.id, payload)
        : fidelidadeApi.createPromocao(payload);
    },
    onSuccess: () => {
      const titulo = form.titulo.trim();
      const editou = Boolean(editing);
      setForm(emptyForm);
      setFormError(null);
      setModalOpen(false);
      setEditing(null);
      if (!editou) setPage(1);
      void queryClient.invalidateQueries({ queryKey: ['promocoes'] });
      toast.success(
        editou ? 'Campanha atualizada' : 'Campanha criada',
        editou ? `${titulo} foi atualizada.` : `${titulo} foi salva como rascunho.`,
      );
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Não foi possível salvar a campanha.')),
  });

  const deletePromocao = useMutation({
    mutationFn: (id: string) => fidelidadeApi.deletePromocao(id),
    onSuccess: () => {
      const titulo = deleting?.titulo;
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['promocoes'] });
      toast.success('Campanha arquivada', titulo ? `${titulo} foi marcada como inativa.` : undefined);
    },
    onError: (err) => toast.error('Não foi possível arquivar', getErrorMessage(err)),
  });

  const enviarPromocao = useMutation({
    mutationFn: (id: string) => fidelidadeApi.enviarPromocao(id),
    onMutate: (id) => setSendingId(id),
    onSuccess: () => {
      toast.success('Campanha enviada');
      void queryClient.invalidateQueries({ queryKey: ['promocoes'] });
    },
    onError: (err) => toast.error('Não foi possível enviar a campanha', getErrorMessage(err)),
    onSettled: () => setSendingId(null),
  });

  const handleSubmit = () => {
    if (!form.titulo.trim()) return setFormError('Informe o título da campanha.');
    if (!form.mensagem.trim()) return setFormError('Escreva a mensagem da campanha.');
    setFormError(null);
    savePromocao.mutate();
  };

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <PageHeader
        title="Campanhas"
        description="Comunicações enviadas aos clientes do programa."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Nova promoção
          </Button>
        }
      />

      <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          size="sm"
          accent="emerald"
          icon={Megaphone}
          label="Campanhas"
          value={num.format(list.length)}
          hint="no total"
        />
        <StatCard
          size="sm"
          accent="sky"
          icon={Send}
          label="Enviadas"
          value={num.format(enviadas)}
          hint="concluídas"
        />
        <StatCard
          size="sm"
          accent="violet"
          icon={FileText}
          label="Rascunhos"
          value={num.format(rascunhos)}
          hint="em preparo"
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
                aria-label="Buscar campanhas"
                placeholder="Buscar por título ou mensagem…"
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
                    { value: 'rascunho', label: 'Rascunho' },
                    { value: 'enviada', label: 'Enviadas' },
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
            <PromocaoRowActions
              promocao={row}
              sending={sendingId === row.id}
              onSend={() => enviarPromocao.mutate(row.id)}
              onEdit={() => openEdit(row)}
              onDelete={() => setDeleting(row)}
            />
          )}
          renderCard={(row) => (
            <PromocaoCard
              promocao={row}
              sending={sendingId === row.id}
              onSend={() => enviarPromocao.mutate(row.id)}
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
          emptyTitle={filtering ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha cadastrada'}
          emptyDescription={
            filtering
              ? 'Ajuste a busca ou o filtro.'
              : 'Crie a primeira campanha para se comunicar com os clientes.'
          }
          emptyAction={
            !filtering ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" />
                Nova promoção
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
        title={editing ? 'Editar campanha' : 'Nova promoção'}
        description={
          editing
            ? 'Ajuste o texto do rascunho antes de enviar.'
            : 'A campanha é criada como rascunho e pode ser enviada depois.'
        }
        submitLabel={savePromocao.isPending ? 'Salvando…' : 'Salvar campanha'}
        onSubmit={handleSubmit}
        disabled={savePromocao.isPending}
        error={formError}
      >
        <div className="grid gap-3.5">
          <Input
            label="Título"
            value={form.titulo}
            onChange={(event) => setForm((c) => ({ ...c, titulo: event.target.value }))}
            placeholder="Título da campanha"
          />
          <Input
            label="Mensagem"
            value={form.mensagem}
            onChange={(event) => setForm((c) => ({ ...c, mensagem: event.target.value }))}
            placeholder="Mensagem enviada aos clientes"
          />
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Arquivar campanha"
        description={
          deleting ? (
            <>
              <strong className="text-fg">{deleting.titulo}</strong> será marcada como{' '}
              <strong className="text-fg">inativa</strong> e sai das listas ativas. O histórico é
              mantido para métricas.
            </>
          ) : undefined
        }
        confirmLabel="Arquivar"
        loading={deletePromocao.isPending}
        onConfirm={() => deleting && deletePromocao.mutate(deleting.id)}
      />
    </div>
  );
}

function PromocaoRowActions({
  promocao,
  sending,
  onSend,
  onEdit,
  onDelete,
}: {
  promocao: Promocao;
  sending: boolean;
  onSend: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const toast = useToast();
  const isRascunho = promocao.status === 'rascunho';

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(promocao.id);
      toast.info('ID copiado');
    } catch {
      toast.error('Não foi possível copiar o id');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${promocao.titulo}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{promocao.titulo}</DropdownMenuLabel>
        <DropdownMenuItem
          disabled={!isRascunho}
          onSelect={(event) => {
            event.preventDefault();
            if (isRascunho) onEdit();
          }}
        >
          <Pencil />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!isRascunho || sending}
          onSelect={(event) => {
            event.preventDefault();
            onSend();
          }}
        >
          <Send />
          {sending ? 'Enviando…' : 'Enviar campanha'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copyId()}>
          <Copy />
          Copiar ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="danger"
          disabled={promocao.status === 'inativa'}
          onSelect={(event) => {
            event.preventDefault();
            onDelete();
          }}
        >
          <Trash2 />
          Arquivar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PromocaoCard({
  promocao,
  sending,
  onSend,
  onEdit,
  onDelete,
}: {
  promocao: Promocao;
  sending: boolean;
  onSend: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <ListCard
      media={<IconChip size={10} />}
      title={promocao.titulo}
      subtitle={promocao.mensagem}
      actions={
        <PromocaoRowActions
          promocao={promocao}
          sending={sending}
          onSend={onSend}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      }
      badges={
        <StatusBadge label={statusMeta[promocao.status].label} tone={statusMeta[promocao.status].tone} />
      }
      meta={[{ label: 'Envio', value: envio(promocao) }]}
    />
  );
}
