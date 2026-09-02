import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CircleCheck,
  Copy,
  Hash,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  Trash2,
  Users,
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
import { Avatar } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
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
import { PasswordInput } from '../components/ui/password-input';
import { Pagination } from '../components/ui/pagination';
import { SearchInput } from '../components/ui/search-input';
import { Select } from '../components/ui/select';
import { useToast } from '../components/ui/toast';
import { useAuth } from '../context/auth-context';
import { cn } from '../lib/utils';
import { getErrorMessage } from '../lib/errors';
import { fidelidadeApi } from '../services/fidelidade';
import { RECURSOS, type PapelUsuario, type Recurso, type Usuario } from '../types/api';

const pageSize = 10;
const num = new Intl.NumberFormat('pt-BR');
const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR');

const papelLabel: Record<PapelUsuario, string> = { gestor: 'Gestor', atendente: 'Atendente' };

const recursoLabel: Record<Recurso, string> = {
  balcao: 'Balcão',
  clientes: 'Clientes',
  compras: 'Compras',
  recompensas: 'Recompensas',
  programa: 'Programa de pontos',
  promocoes: 'Promoções',
};

const acessoResumo = (usuario: Usuario) =>
  usuario.papel === 'gestor' ? 'Todos os módulos' : `${usuario.permissoes.length}/${RECURSOS.length} módulos`;

type PapelFilter = 'todos' | PapelUsuario;
type StatusFilter = 'todos' | Usuario['status'];

const emptyForm = {
  nome: '',
  email: '',
  senha: '',
  papel: 'atendente' as PapelUsuario,
  permissoes: [] as Recurso[],
};

const statusLabel = (status: Usuario['status']) => (status === 'ativo' ? 'Ativo' : 'Inativo');
const statusTone = (status: Usuario['status']) => (status === 'ativo' ? 'success' : 'neutral');

const columns: DataTableColumn<Usuario>[] = [
  {
    key: 'nome',
    header: 'Usuário',
    render: (row) => (
      <div className="flex items-center gap-3">
        <Avatar name={row.nome} />
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{row.nome}</p>
          <p className="truncate text-xs text-fg-subtle">{row.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'papel',
    header: 'Papel',
    render: (row) => <Badge variant="outline">{papelLabel[row.papel]}</Badge>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge label={statusLabel(row.status)} tone={statusTone(row.status)} />,
  },
  {
    key: 'permissoes',
    header: 'Acesso',
    render: (row) => <span className="text-xs text-fg-subtle">{acessoResumo(row)}</span>,
  },
  {
    key: 'createdAt',
    header: 'Criado em',
    render: (row) => <span className="text-fg-muted">{formatDate(row.createdAt)}</span>,
  },
];

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [papelFilter, setPapelFilter] = useState<PapelFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState<Usuario | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['usuarios'],
    queryFn: fidelidadeApi.getUsuarios,
  });

  const list = useMemo(() => data ?? [], [data]);
  const ativos = list.filter((item) => item.status === 'ativo').length;
  const gestores = list.filter((item) => item.papel === 'gestor').length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((item) => {
      if (papelFilter !== 'todos' && item.papel !== papelFilter) return false;
      if (statusFilter !== 'todos' && item.status !== statusFilter) return false;
      if (!term) return true;
      return item.nome.toLowerCase().includes(term) || item.email.toLowerCase().includes(term);
    });
  }, [list, search, papelFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const filtering =
    search.trim() !== '' || papelFilter !== 'todos' || statusFilter !== 'todos';
  const resetPage = () => setPage(1);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (usuario: Usuario) => {
    setEditing(usuario);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      papel: usuario.papel,
      permissoes: usuario.papel === 'atendente' ? usuario.permissoes : [],
    });
    setFormError(null);
    setModalOpen(true);
  };

  const saveUsuario = useMutation({
    mutationFn: async () => {
      if (editing) {
        const usuario = await fidelidadeApi.updateUsuario(editing.id, {
          nome: form.nome.trim(),
          email: form.email.trim(),
          papel: form.papel,
        });
        // Permissões são um endpoint à parte — só faz sentido pra quem
        // continua (ou passou a ser) atendente; gestor vira acesso total.
        if (form.papel === 'atendente') {
          return fidelidadeApi.updateUsuarioPermissoes(editing.id, form.permissoes);
        }
        return usuario;
      }
      return fidelidadeApi.createUsuario({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha,
        papel: form.papel,
        permissoes: form.papel === 'atendente' ? form.permissoes : undefined,
      });
    },
    onSuccess: () => {
      const nome = form.nome.trim();
      const editou = Boolean(editing);
      setForm(emptyForm);
      setFormError(null);
      setModalOpen(false);
      setEditing(null);
      if (!editou) setPage(1);
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success(
        editou ? 'Usuário atualizado' : 'Usuário criado',
        editou ? `${nome} foi atualizado.` : `${nome} agora tem acesso ao painel.`,
      );
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Não foi possível salvar o usuário.')),
  });

  const deleteUsuario = useMutation({
    mutationFn: (id: string) => fidelidadeApi.deleteUsuario(id),
    onSuccess: () => {
      const nome = deleting?.nome;
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário excluído', nome ? `${nome} não tem mais acesso.` : undefined);
    },
    onError: (err) => toast.error('Não foi possível excluir', getErrorMessage(err)),
  });

  const handleSubmit = () => {
    if (!form.nome.trim()) return setFormError('Informe o nome do usuário.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return setFormError('Informe um e-mail válido.');
    }
    if (!editing && form.senha.length < 8) {
      return setFormError('A senha deve ter ao menos 8 caracteres.');
    }
    setFormError(null);
    saveUsuario.mutate();
  };

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <PageHeader
        title="Usuários"
        description="Pessoas com acesso ao painel e seus papéis."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Novo usuário
          </Button>
        }
      />

      <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          size="sm"
          accent="emerald"
          icon={Users}
          label="Usuários"
          value={num.format(list.length)}
          hint="cadastrados"
        />
        <StatCard
          size="sm"
          accent="sky"
          icon={CircleCheck}
          label="Ativos"
          value={num.format(ativos)}
          hint="com acesso"
        />
        <StatCard
          size="sm"
          accent="violet"
          icon={ShieldCheck}
          label="Gestores"
          value={num.format(gestores)}
          hint="administração"
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
                aria-label="Buscar usuários"
                placeholder="Buscar por nome ou e-mail…"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  resetPage();
                }}
              />
              <div className="flex items-center gap-2">
                <Select
                  className="flex-1 sm:w-36 sm:flex-none"
                  aria-label="Filtrar por papel"
                  value={papelFilter}
                  onValueChange={(value) => {
                    setPapelFilter(value as PapelFilter);
                    resetPage();
                  }}
                  options={[
                    { value: 'todos', label: 'Papel: todos' },
                    { value: 'gestor', label: 'Gestores' },
                    { value: 'atendente', label: 'Atendentes' },
                  ]}
                />
                <Select
                  className="flex-1 sm:w-36 sm:flex-none"
                  aria-label="Filtrar por status"
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as StatusFilter);
                    resetPage();
                  }}
                  options={[
                    { value: 'todos', label: 'Status: todos' },
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
                      setPapelFilter('todos');
                      setStatusFilter('todos');
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
            <UsuarioRowActions
              usuario={row}
              isSelf={row.id === user?.id}
              onEdit={() => openEdit(row)}
              onDelete={() => setDeleting(row)}
            />
          )}
          renderCard={(row) => (
            <UsuarioCard
              usuario={row}
              isSelf={row.id === user?.id}
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
          emptyTitle={filtering ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
          emptyDescription={
            filtering ? 'Ajuste a busca ou os filtros.' : 'Crie o primeiro acesso ao painel.'
          }
          emptyAction={
            !filtering ? (
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" />
                Novo usuário
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
        title={editing ? 'Editar usuário' : 'Novo usuário'}
        description={
          editing
            ? 'Atualize o nome, o e-mail ou o papel. A senha não muda aqui.'
            : 'Defina os dados de acesso e o papel da pessoa.'
        }
        submitLabel={saveUsuario.isPending ? 'Salvando…' : 'Salvar usuário'}
        onSubmit={handleSubmit}
        disabled={saveUsuario.isPending}
        error={formError}
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="Nome"
            value={form.nome}
            onChange={(event) => setForm((c) => ({ ...c, nome: event.target.value }))}
            placeholder="Nome completo"
            autoComplete="name"
            autoCapitalize="words"
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((c) => ({ ...c, email: event.target.value.replace(/\s/g, '') }))
            }
            placeholder="email@empresa.com"
            autoComplete="email"
          />
          {editing ? null : (
            <PasswordInput
              label="Senha"
              value={form.senha}
              onChange={(event) => setForm((c) => ({ ...c, senha: event.target.value }))}
              placeholder="Mínimo de 8 caracteres"
              hint="Mínimo de 8 caracteres."
            />
          )}
          <Select
            label="Papel"
            value={form.papel}
            onValueChange={(value) => setForm((c) => ({ ...c, papel: value as PapelUsuario }))}
            options={[
              { value: 'atendente', label: 'Atendente' },
              { value: 'gestor', label: 'Gestor' },
            ]}
          />
          {form.papel === 'atendente' ? (
            <PermissoesField
              value={form.permissoes}
              onChange={(permissoes) => setForm((c) => ({ ...c, permissoes }))}
            />
          ) : (
            <p className="text-xs text-fg-subtle sm:col-span-2">
              Gestores têm acesso a todos os módulos automaticamente.
            </p>
          )}
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Excluir usuário"
        description={
          deleting ? (
            <>
              <strong className="text-fg">{deleting.nome}</strong> perde o acesso ao painel. Se essa
              pessoa já registrou compras ou resgates, prefira “Inativar acesso” para manter o
              histórico.
            </>
          ) : undefined
        }
        confirmLabel="Excluir"
        loading={deleteUsuario.isPending}
        onConfirm={() => deleting && deleteUsuario.mutate(deleting.id)}
      />
    </div>
  );
}

function PermissoesField({
  value,
  onChange,
}: {
  value: Recurso[];
  onChange: (value: Recurso[]) => void;
}) {
  const toggle = (recurso: Recurso) => {
    onChange(value.includes(recurso) ? value.filter((r) => r !== recurso) : [...value, recurso]);
  };

  return (
    <div className="sm:col-span-2">
      <span className="mb-1.5 block text-sm font-medium text-fg">Acesso aos módulos</span>
      <div className="flex flex-wrap gap-1.5">
        {RECURSOS.map((recurso) => {
          const active = value.includes(recurso);
          return (
            <button
              key={recurso}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(recurso)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-primary-border bg-primary-subtle text-primary-subtle-fg'
                  : 'border-border bg-surface text-fg-muted hover:bg-surface-muted',
              )}
            >
              {recursoLabel[recurso]}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-fg-subtle">
        Sem nenhum módulo marcado, a pessoa só vê o Dashboard depois de entrar.
      </p>
    </div>
  );
}

function UsuarioRowActions({
  usuario,
  isSelf,
  onEdit,
  onDelete,
}: {
  usuario: Usuario;
  isSelf: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const next = usuario.status === 'ativo' ? 'inativo' : 'ativo';

  const toggle = useMutation({
    mutationFn: () => fidelidadeApi.toggleUsuarioStatus(usuario.id, next),
    onSuccess: (updated) => {
      toast.success(updated.status === 'ativo' ? 'Usuário ativado' : 'Usuário inativado');
      void queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
    onError: (err) => toast.error('Não foi possível atualizar', getErrorMessage(err)),
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
        <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${usuario.nome}`}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{usuario.nome}</DropdownMenuLabel>
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
          disabled={toggle.isPending || isSelf}
          onSelect={(event) => {
            event.preventDefault();
            if (!isSelf) toggle.mutate();
          }}
        >
          <Power />
          {usuario.status === 'ativo' ? 'Inativar acesso' : 'Ativar acesso'}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy('E-mail', usuario.email)}>
          <Copy />
          Copiar e-mail
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void copy('ID', usuario.id)}>
          <Hash />
          Copiar ID
        </DropdownMenuItem>
        {!isSelf ? (
          <>
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
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UsuarioCard({
  usuario,
  isSelf,
  onEdit,
  onDelete,
}: {
  usuario: Usuario;
  isSelf: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <ListCard
      media={<Avatar name={usuario.nome} className="size-10" />}
      title={usuario.nome}
      subtitle={usuario.email}
      actions={
        <UsuarioRowActions usuario={usuario} isSelf={isSelf} onEdit={onEdit} onDelete={onDelete} />
      }
      badges={
        <>
          <Badge variant="outline">{papelLabel[usuario.papel]}</Badge>
          <StatusBadge label={statusLabel(usuario.status)} tone={statusTone(usuario.status)} />
        </>
      }
      meta={[
        { label: 'Acesso', value: acessoResumo(usuario) },
        { label: 'Criado em', value: formatDate(usuario.createdAt) },
      ]}
    />
  );
}
