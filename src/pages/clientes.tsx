import { useMemo, useState } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Copy, Hash, MoreHorizontal, Pencil, Power, Trash2, UserPlus, X } from 'lucide-react';
import { ConfirmDialog } from '../components/shared/confirm-dialog';
import { DataTable, type DataTableColumn } from '../components/shared/data-table';
import { ErrorState } from '../components/shared/error-state';
import { FormModal } from '../components/shared/form-modal';
import { ListCard } from '../components/shared/list-card';
import { PageHeader } from '../components/shared/page-header';
import { StatCard } from '../components/shared/stat-card';
import { StatusBadge } from '../components/shared/status-badge';
import { Avatar } from '../components/ui/avatar';
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
import { isValidCPF, maskCPF, maskPhoneBR, onlyDigits } from '../lib/masks';
import { fidelidadeApi } from '../services/fidelidade';
import type { Cliente } from '../types/api';

const pageSize = 10;
const num = new Intl.NumberFormat('pt-BR');
const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR');

type StatusFilter = 'todos' | 'ativo' | 'inativo';

const statusLabel = (status: Cliente['status']) => (status === 'ativo' ? 'Ativo' : 'Inativo');
const statusTone = (status: Cliente['status']) => (status === 'ativo' ? 'success' : 'neutral');

const emptyForm = { nome: '', cpf: '', telefone: '' };

const formatCpf = (cpf: string | null) => (cpf ? maskCPF(cpf) : null);

const columns: DataTableColumn<Cliente>[] = [
  {
    key: 'nome',
    header: 'Cliente',
    render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.nome} />
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{row.nome}</p>
          <p className="truncate text-xs text-fg-subtle">
            {formatCpf(row.cpf) ?? row.email ?? '—'}
          </p>
        </div>
      </div>
    ),
  },
  {
    key: 'telefone',
    header: 'Telefone',
    render: (row) => <span className="text-fg-muted">{row.telefone || '—'}</span>,
  },
  {
    key: 'saldoPontos',
    header: 'Pontos',
    align: 'right',
    render: (row) => <PointsPill value={row.saldoPontos} />,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge label={statusLabel(row.status)} tone={statusTone(row.status)} />,
  },
  {
    key: 'desde',
    header: 'Cliente desde',
    render: (row) => <span className="text-fg-muted">{formatDate(row.desde)}</span>,
  },
];

export function ClientesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [deleting, setDeleting] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['clientes', page],
    queryFn: () => fidelidadeApi.getClientes(page, pageSize),
    placeholderData: keepPreviousData,
  });

  const allRows = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;

  // Busca e filtro atuam sobre a página carregada (a API pagina no servidor).
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const termDigits = onlyDigits(term);
    return allRows.filter((cliente) => {
      if (statusFilter !== 'todos' && cliente.status !== statusFilter) return false;
      if (!term) return true;
      return (
        cliente.nome.toLowerCase().includes(term) ||
        (cliente.email ?? '').toLowerCase().includes(term) ||
        (termDigits !== '' && (cliente.cpf ?? '').includes(termDigits)) ||
        (termDigits !== '' && (cliente.telefone ?? '').includes(termDigits))
      );
    });
  }, [allRows, search, statusFilter]);

  const ativos = allRows.filter((cliente) => cliente.status === 'ativo').length;
  const pontosPagina = allRows.reduce((sum, cliente) => sum + cliente.saldoPontos, 0);
  const mediaPontos = allRows.length ? Math.round(pontosPagina / allRows.length) : 0;
  const filtering = search.trim() !== '' || statusFilter !== 'todos';

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (cliente: Cliente) => {
    setEditing(cliente);
    setForm({
      nome: cliente.nome,
      cpf: cliente.cpf ? maskCPF(cliente.cpf) : '',
      telefone: cliente.telefone ? maskPhoneBR(cliente.telefone) : '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const saveCliente = useMutation({
    mutationFn: () => {
      const base = {
        nome: form.nome.trim(),
        cpf: onlyDigits(form.cpf),
        telefone: onlyDigits(form.telefone) || null,
      };
      return editing
        ? fidelidadeApi.updateCliente(editing.id, base)
        : fidelidadeApi.createCliente(base);
    },
    onSuccess: () => {
      const nome = form.nome.trim();
      const editou = Boolean(editing);
      setForm(emptyForm);
      setFormError(null);
      setModalOpen(false);
      setEditing(null);
      if (!editou) setPage(1);
      void queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success(
        editou ? 'Cliente atualizado' : 'Cliente cadastrado',
        editou ? `${nome} foi atualizado.` : `${nome} foi adicionado à base.`,
      );
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Não foi possível salvar o cliente.')),
  });

  const deleteCliente = useMutation({
    mutationFn: (id: string) => fidelidadeApi.deleteCliente(id),
    onSuccess: () => {
      const nome = deleting?.nome;
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente removido', nome ? `${nome} saiu da sua base.` : undefined);
    },
    onError: (err) => toast.error('Não foi possível remover', getErrorMessage(err)),
  });

  const handleSubmit = () => {
    if (!form.nome.trim()) return setFormError('Informe o nome do cliente.');
    if (!isValidCPF(form.cpf)) return setFormError('Informe um CPF válido.');
    const tel = onlyDigits(form.telefone);
    if (tel && (tel.length < 10 || tel.length > 11)) {
      return setFormError('Telefone incompleto — use DDD + número.');
    }
    setFormError(null);
    saveCliente.mutate();
  };

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <PageHeader
        title="Clientes"
        description="Base de clientes do programa e seus saldos de pontos."
        actions={
          <Button onClick={openCreate}>
            <UserPlus className="size-4" />
            Novo cliente
          </Button>
        }
      />

      <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          size="sm"
          accent="emerald"
          icon={UserPlus}
          label="Clientes"
          value={num.format(total)}
          hint="na base"
        />
        <StatCard
          size="sm"
          accent="sky"
          icon={Power}
          label="Ativos"
          value={num.format(ativos)}
          hint={`de ${allRows.length} na página`}
        />
        <StatCard
          size="sm"
          accent="violet"
          icon={Hash}
          label="Média de pts"
          value={num.format(mediaPontos)}
          hint="por cliente"
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
                aria-label="Buscar clientes nesta página"
                placeholder="Buscar cliente…"
                value={search}
                onChange={setSearch}
              />
              <div className="flex items-center gap-2">
                <Select
                  className="flex-1 sm:w-40 sm:flex-none"
                  aria-label="Filtrar por status"
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                  options={[
                    { value: 'todos', label: 'Todos' },
                    { value: 'ativo', label: 'Ativos' },
                    { value: 'inativo', label: 'Inativos' },
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
                      setStatusFilter('todos');
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          }
          renderActions={(row) => (
            <ClienteRowActions
              cliente={row}
              onEdit={() => openEdit(row)}
              onDelete={() => setDeleting(row)}
            />
          )}
          renderCard={(row) => (
            <ClienteCard cliente={row} onEdit={() => openEdit(row)} onDelete={() => setDeleting(row)} />
          )}
          footer={
            total > 0 ? (
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            ) : undefined
          }
          emptyTitle={filtering ? 'Nenhum cliente nesta página' : 'Nenhum cliente cadastrado'}
          emptyDescription={
            filtering
              ? 'Ajuste a busca ou o filtro, ou navegue para outra página.'
              : 'Cadastre o primeiro cliente para começar.'
          }
          emptyAction={
            !filtering ? (
              <Button size="sm" onClick={openCreate}>
                <UserPlus className="size-4" />
                Novo cliente
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
        title={editing ? 'Editar cliente' : 'Novo cliente'}
        description={
          editing
            ? 'Atualize os dados cadastrais deste cliente.'
            : 'O cliente é identificado por CPF.'
        }
        submitLabel={saveCliente.isPending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar cliente'}
        onSubmit={handleSubmit}
        disabled={saveCliente.isPending}
        error={formError}
      >
        <div className="grid gap-3.5">
          <Input
            label="Nome"
            value={form.nome}
            onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
            placeholder="Nome completo"
            autoComplete="name"
            autoCapitalize="words"
          />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input
              label="CPF"
              value={form.cpf}
              onChange={(event) =>
                setForm((current) => ({ ...current, cpf: maskCPF(event.target.value) }))
              }
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
            />
            <Input
              label="Telefone"
              hint="Opcional"
              value={form.telefone}
              onChange={(event) =>
                setForm((current) => ({ ...current, telefone: maskPhoneBR(event.target.value) }))
              }
              placeholder="(11) 99999-9999"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={15}
            />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Remover cliente da base"
        description={
          deleting ? (
            <>
              <strong className="text-fg">{deleting.nome}</strong> e todo o histórico de compras e
              resgates dele <strong className="text-fg">nesta empresa</strong> serão apagados. O saldo
              de {num.format(deleting.saldoPontos)} pts será perdido. Para só pausar, use “Inativar”.
            </>
          ) : undefined
        }
        confirmLabel="Remover"
        loading={deleteCliente.isPending}
        onConfirm={() => deleting && deleteCliente.mutate(deleting.id)}
      />
    </div>
  );
}

function ClienteRowActions({
  cliente,
  onEdit,
  onDelete,
}: {
  cliente: Cliente;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const nextStatus = cliente.status === 'ativo' ? 'inativo' : 'ativo';

  const toggleStatus = useMutation({
    mutationFn: () => fidelidadeApi.updateClienteStatus(cliente.id, nextStatus),
    onSuccess: (updated) => {
      toast.success(updated.status === 'ativo' ? 'Cliente ativado' : 'Cliente inativado');
      void queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (err) => toast.error('Não foi possível atualizar o status', getErrorMessage(err)),
  });

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
        <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${cliente.nome}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{cliente.nome}</DropdownMenuLabel>
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
          disabled={toggleStatus.isPending}
          onSelect={(event) => {
            event.preventDefault();
            toggleStatus.mutate();
          }}
        >
          <Power />
          {cliente.status === 'ativo' ? 'Inativar cliente' : 'Ativar cliente'}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            void copy(cliente.cpf ? 'CPF' : 'E-mail', cliente.cpf ?? cliente.email ?? '')
          }
          disabled={!cliente.cpf && !cliente.email}
        >
          <Copy />
          {cliente.cpf ? 'Copiar CPF' : 'Copiar e-mail'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy('ID', cliente.id)}>
          <Hash />
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

function PointsPill({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center rounded-md bg-primary-subtle px-2 py-0.5 text-[13px] font-semibold tabular-nums text-primary-subtle-fg">
      {num.format(value)} pts
    </span>
  );
}

function ClienteCard({
  cliente,
  onEdit,
  onDelete,
}: {
  cliente: Cliente;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <ListCard
      media={<Avatar name={cliente.nome} className="size-10" />}
      title={cliente.nome}
      subtitle={formatCpf(cliente.cpf) ?? cliente.email ?? '—'}
      actions={<ClienteRowActions cliente={cliente} onEdit={onEdit} onDelete={onDelete} />}
      badges={
        <>
          <PointsPill value={cliente.saldoPontos} />
          <StatusBadge label={statusLabel(cliente.status)} tone={statusTone(cliente.status)} />
        </>
      }
      meta={[
        { label: 'Telefone', value: cliente.telefone || '—' },
        { label: 'Cliente desde', value: formatDate(cliente.desde) },
      ]}
    />
  );
}
