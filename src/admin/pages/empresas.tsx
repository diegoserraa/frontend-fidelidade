import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, MoreHorizontal, Plus, Power, Printer, Users } from 'lucide-react';
import { ConfirmDialog } from '../../components/shared/confirm-dialog';
import { DataTable, type DataTableColumn } from '../../components/shared/data-table';
import { ErrorState } from '../../components/shared/error-state';
import { FormModal } from '../../components/shared/form-modal';
import { ListCard } from '../../components/shared/list-card';
import { PageHeader } from '../../components/shared/page-header';
import { StatCard } from '../../components/shared/stat-card';
import { StatusBadge } from '../../components/shared/status-badge';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/password-input';
import { useToast } from '../../components/ui/toast';
import { useAdminAuth } from '../context/admin-auth';
import { getErrorMessage } from '../../lib/errors';
import { maskCNPJ, onlyDigits } from '../../lib/masks';
import { buildAppQrUrl, printQrWindow, qrDataUri } from '../../lib/qr';
import { adminApi } from '../services/admin';
import type { EmpresaAdmin } from '../types';

const num = new Intl.NumberFormat('pt-BR');
const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR');
const formatCnpj = (value: string) => maskCNPJ(value);

const emptyForm = {
  nome: '',
  cnpj: '',
  email: '',
  telefone: '',
  gestorNome: '',
  gestorEmail: '',
  gestorSenha: '',
};

const columns: DataTableColumn<EmpresaAdmin>[] = [
  {
    key: 'nome',
    header: 'Empresa',
    render: (row) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-fg">{row.nome}</p>
        <p className="truncate text-xs text-fg-subtle">{formatCnpj(row.cnpj)}</p>
      </div>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <StatusBadge
        label={row.status === 'ativa' ? 'Ativa' : 'Inativa'}
        tone={row.status === 'ativa' ? 'success' : 'neutral'}
      />
    ),
  },
  {
    key: 'usuarios',
    header: 'Usuários',
    render: (row) => <span className="text-fg-muted">{num.format(row.usuarios)}</span>,
  },
  {
    key: 'clientes',
    header: 'Clientes',
    render: (row) => <span className="text-fg-muted">{num.format(row.clientes)}</span>,
  },
  {
    key: 'createdAt',
    header: 'Criada em',
    render: (row) => <span className="text-fg-muted">{formatDate(row.createdAt)}</span>,
  },
];

export function AdminEmpresasPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { admin, sair } = useAdminAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [inativando, setInativando] = useState<EmpresaAdmin | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'empresas'],
    queryFn: adminApi.getEmpresas,
  });

  const list = useMemo(() => data ?? [], [data]);
  const ativas = list.filter((e) => e.status === 'ativa').length;
  const totalClientes = list.reduce((sum, e) => sum + e.clientes, 0);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const criarEmpresa = useMutation({
    mutationFn: () =>
      adminApi.criarEmpresa({
        nome: form.nome.trim(),
        cnpj: onlyDigits(form.cnpj),
        email: form.email.trim() || undefined,
        telefone: onlyDigits(form.telefone) || undefined,
        gestor: {
          nome: form.gestorNome.trim(),
          email: form.gestorEmail.trim(),
          senha: form.gestorSenha,
        },
      }),
    onSuccess: () => {
      const nome = form.nome.trim();
      setForm(emptyForm);
      setFormError(null);
      setModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'empresas'] });
      toast.success('Empresa cadastrada', `${nome} já pode entrar no painel com o gestor criado.`);
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Não foi possível cadastrar a empresa.')),
  });

  const alternarStatus = useMutation({
    mutationFn: (empresa: EmpresaAdmin) =>
      adminApi.atualizarStatusEmpresa(empresa.id, empresa.status === 'ativa' ? 'inativa' : 'ativa'),
    onSuccess: (updated) => {
      setInativando(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'empresas'] });
      toast.success(updated.status === 'ativa' ? 'Empresa ativada' : 'Empresa inativada');
    },
    onError: (err) => toast.error('Não foi possível atualizar', getErrorMessage(err)),
  });

  const imprimirQr = (empresa: EmpresaAdmin) => {
    const url = buildAppQrUrl(empresa.id);
    const abriu = printQrWindow(qrDataUri(url), empresa.nome, 'Escaneie para entrar no programa de fidelidade');
    if (!abriu) {
      toast.error('Não foi possível abrir a janela de impressão', 'Seu navegador pode ter bloqueado o pop-up.');
    }
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) return setFormError('Informe o nome da empresa.');
    if (onlyDigits(form.cnpj).length !== 14) return setFormError('CNPJ inválido — precisa ter 14 dígitos.');
    if (!form.gestorNome.trim()) return setFormError('Informe o nome do gestor.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.gestorEmail.trim())) {
      return setFormError('Informe um e-mail válido para o gestor.');
    }
    if (form.gestorSenha.length < 8) return setFormError('A senha do gestor deve ter ao menos 8 caracteres.');
    setFormError(null);
    criarEmpresa.mutate();
  };

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <PageHeader
        title="Empresas"
        description={admin ? `Logado como ${admin.nome}` : 'Cadastre e acompanhe as empresas clientes.'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={sair}>
              Sair
            </Button>
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Nova empresa
            </Button>
          </div>
        }
      />

      <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
        <StatCard size="sm" accent="emerald" icon={Building2} label="Empresas" value={num.format(list.length)} hint="cadastradas" />
        <StatCard size="sm" accent="sky" icon={Power} label="Ativas" value={num.format(ativas)} hint="com acesso" />
        <StatCard size="sm" accent="violet" icon={Users} label="Clientes" value={num.format(totalClientes)} hint="no total" />
      </div>

      {isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <DataTable
          fill
          columns={columns}
          data={list}
          getRowKey={(row) => row.id}
          isLoading={isLoading}
          renderActions={(row) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${row.nome}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{row.nome}</DropdownMenuLabel>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    imprimirQr(row);
                  }}
                >
                  <Printer />
                  Imprimir QR do balcão
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    if (row.status === 'ativa') setInativando(row);
                    else alternarStatus.mutate(row);
                  }}
                >
                  <Power />
                  {row.status === 'ativa' ? 'Inativar empresa' : 'Ativar empresa'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          renderCard={(row) => (
            <ListCard
              title={row.nome}
              subtitle={formatCnpj(row.cnpj)}
              badges={
                <StatusBadge
                  label={row.status === 'ativa' ? 'Ativa' : 'Inativa'}
                  tone={row.status === 'ativa' ? 'success' : 'neutral'}
                />
              }
              meta={[
                { label: 'Usuários', value: String(row.usuarios) },
                { label: 'Clientes', value: String(row.clientes) },
                { label: 'Criada em', value: formatDate(row.createdAt) },
              ]}
              actions={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => imprimirQr(row)}>
                    <Printer className="size-3.5" />
                    QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (row.status === 'ativa') setInativando(row);
                      else alternarStatus.mutate(row);
                    }}
                  >
                    {row.status === 'ativa' ? 'Inativar' : 'Ativar'}
                  </Button>
                </div>
              }
            />
          )}
          emptyTitle="Nenhuma empresa cadastrada"
          emptyDescription="Cadastre a primeira padaria cliente."
          emptyAction={
            <Button size="sm" onClick={openCreate}>
              <Plus className="size-4" />
              Nova empresa
            </Button>
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
        title="Nova empresa"
        description="Cadastra a padaria e já cria o primeiro acesso (gestor) dela."
        submitLabel={criarEmpresa.isPending ? 'Cadastrando…' : 'Cadastrar empresa'}
        onSubmit={handleSubmit}
        disabled={criarEmpresa.isPending}
        error={formError}
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="Nome da empresa"
            value={form.nome}
            onChange={(event) => setForm((c) => ({ ...c, nome: event.target.value }))}
            placeholder="Padaria do João"
            autoFocus
          />
          <Input
            label="CNPJ"
            value={form.cnpj}
            onChange={(event) => setForm((c) => ({ ...c, cnpj: maskCNPJ(event.target.value) }))}
            placeholder="00.000.000/0001-00"
            inputMode="numeric"
            maxLength={18}
          />
          <Input
            label="E-mail da empresa"
            hint="Opcional"
            type="email"
            value={form.email}
            onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))}
            placeholder="contato@padaria.com"
          />
          <Input
            label="Telefone"
            hint="Opcional"
            value={form.telefone}
            onChange={(event) => setForm((c) => ({ ...c, telefone: event.target.value }))}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-3 text-sm font-medium text-fg">Acesso do gestor</p>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Input
              label="Nome do gestor"
              value={form.gestorNome}
              onChange={(event) => setForm((c) => ({ ...c, gestorNome: event.target.value }))}
              placeholder="Nome completo"
              autoComplete="name"
            />
            <Input
              label="E-mail do gestor"
              type="email"
              value={form.gestorEmail}
              onChange={(event) => setForm((c) => ({ ...c, gestorEmail: event.target.value }))}
              placeholder="gestor@padaria.com"
              autoComplete="email"
            />
            <PasswordInput
              label="Senha do gestor"
              value={form.gestorSenha}
              onChange={(event) => setForm((c) => ({ ...c, gestorSenha: event.target.value }))}
              placeholder="Mínimo de 8 caracteres"
              hint="Passe essa senha pro cliente — ele troca depois."
            />
          </div>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(inativando)}
        onOpenChange={(open) => {
          if (!open) setInativando(null);
        }}
        title="Inativar empresa"
        description={
          inativando ? (
            <>
              <strong className="text-fg">{inativando.nome}</strong> e seus usuários perdem o acesso ao
              painel até a empresa ser reativada. Nenhum dado é apagado.
            </>
          ) : undefined
        }
        confirmLabel="Inativar"
        loading={alternarStatus.isPending}
        onConfirm={() => inativando && alternarStatus.mutate(inativando)}
      />
    </div>
  );
}
