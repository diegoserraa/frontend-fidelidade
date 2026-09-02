import { apiRequest } from '../lib/api';
import type {
  Cliente,
  ClienteResumo,
  ClientesResponse,
  Compra,
  DashboardResponse,
  Empresa,
  EmpresaConfig,
  IdentificacaoCliente,
  LoginResponse,
  ProgramaFidelidade,
  Promocao,
  Recompensa,
  Recurso,
  Resgate,
  ResgateStatus,
  ResgateValidacao,
  Usuario,
  UsuarioAutenticado,
} from '../types/api';

/** Chave de idempotência por tentativa — evita cobrança dupla em toque duplo. */
function novaIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export const fidelidadeApi = {
  login: (input: { cnpj: string; email: string; senha: string }) =>
    apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  me: () => apiRequest<UsuarioAutenticado>('/auth/me'),

  getDashboard: () => apiRequest<DashboardResponse>('/dashboard'),

  getEmpresa: () => apiRequest<Empresa>('/empresa'),
  updateEmpresa: (data: Partial<Pick<Empresa, 'nome' | 'email' | 'telefone'>>) =>
    apiRequest<Empresa>('/empresa', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getEmpresaConfig: () => apiRequest<EmpresaConfig>('/empresa/config'),
  updateEmpresaConfig: (data: Partial<EmpresaConfig>) =>
    apiRequest<EmpresaConfig>('/empresa/config', {
      method: 'PUT',
      body: JSON.stringify({
        logoUrl: data.logo_url,
        corPrimaria: data.cor_primaria,
        corSecundaria: data.cor_secundaria,
        corTexto: data.cor_texto,
        corFundo: data.cor_fundo,
        exibirTotalGasto: data.exibir_total_gasto,
      }),
    }),

  getClientes: (page = 1, pageSize = 10) =>
    apiRequest<ClientesResponse>(`/clientes?page=${page}&pageSize=${pageSize}`),
  /** Cadastro pelo balcão: cliente é PF, identificado por CPF. */
  createCliente: (payload: { nome: string; cpf: string; telefone?: string | null }) =>
    apiRequest<Cliente>('/clientes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  /** Identifica o cliente no balcão pelo QR (token) ou pelo CPF digitado. */
  identificarCliente: (payload: { token?: string; cpf?: string }) =>
    apiRequest<IdentificacaoCliente>('/clientes/identificar', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getClienteById: (id: string) => apiRequest<Cliente>(`/clientes/${id}`),
  getClienteResumo: (id: string) => apiRequest<ClienteResumo>(`/clientes/${id}/resumo`),
  updateCliente: (
    id: string,
    payload: { nome?: string; telefone?: string | null; cpf?: string },
  ) =>
    apiRequest<Cliente>(`/clientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCliente: (id: string) => apiRequest<void>(`/clientes/${id}`, { method: 'DELETE' }),
  updateClienteStatus: (id: string, status: 'ativo' | 'inativo') =>
    apiRequest<Cliente>(`/clientes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getCompras: (page = 1, pageSize = 10) =>
    apiRequest<{ data: Compra[]; page: number; pageSize: number; total: number }>(`/compras?page=${page}&pageSize=${pageSize}`),
  createCompra: (payload: { clienteId: string; valor: number }) =>
    apiRequest<Compra>('/compras', {
      method: 'POST',
      headers: { 'Idempotency-Key': novaIdempotencyKey() },
      body: JSON.stringify(payload),
    }),

  getResgates: (params: { status?: ResgateStatus; page?: number; pageSize?: number } = {}) => {
    const q = new URLSearchParams({
      page: String(params.page ?? 1),
      pageSize: String(params.pageSize ?? 20),
    });
    if (params.status) q.set('status', params.status);
    return apiRequest<{ data: Resgate[]; page: number; pageSize: number; total: number }>(
      `/resgates?${q.toString()}`,
    );
  },
  /** Balcão: lê o QR do resgate pendente e devolve o que conferir. */
  validarResgate: (payload: { token: string }) =>
    apiRequest<ResgateValidacao>('/resgates/validar', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  /** Balcão: confirma a baixa — só aqui os pontos são debitados. */
  confirmarResgate: (id: string) =>
    apiRequest<{ resgate: Resgate; novoSaldo: number }>(`/resgates/${id}/confirmar`, {
      method: 'POST',
    }),
  recusarResgate: (id: string) =>
    apiRequest<{ resgateId: string; status: 'cancelado' }>(`/resgates/${id}/recusar`, {
      method: 'POST',
    }),

  getRecompensas: () => apiRequest<Recompensa[]>('/recompensas'),
  createRecompensa: (payload: { titulo: string; descricao?: string; custoPontos: number }) =>
    apiRequest<Recompensa>('/recompensas', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateRecompensa: (id: string, payload: { titulo?: string; descricao?: string; custoPontos?: number }) =>
    apiRequest<Recompensa>(`/recompensas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  toggleRecompensa: (id: string, status: 'ativa' | 'inativa') =>
    apiRequest<Recompensa>(`/recompensas/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteRecompensa: (id: string) => apiRequest<void>(`/recompensas/${id}`, { method: 'DELETE' }),

  getPromocoes: () => apiRequest<Promocao[]>('/promocoes'),
  createPromocao: (payload: { titulo: string; mensagem: string }) =>
    apiRequest<Promocao>('/promocoes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePromocao: (id: string, payload: { titulo?: string; mensagem?: string }) =>
    apiRequest<Promocao>(`/promocoes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deletePromocao: (id: string) => apiRequest<void>(`/promocoes/${id}`, { method: 'DELETE' }),
  enviarPromocao: (id: string) => apiRequest<Promocao>(`/promocoes/${id}/enviar`, { method: 'POST' }),

  getProgramaFidelidade: () => apiRequest<ProgramaFidelidade>('/programa-fidelidade'),
  updateProgramaFidelidade: (payload: {
    valorPorPonto?: number;
    pontosPorCiclo?: number;
    ativo?: boolean;
  }) =>
    apiRequest<ProgramaFidelidade>('/programa-fidelidade', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getUsuarios: () => apiRequest<Usuario[]>('/usuarios'),
  createUsuario: (payload: {
    nome: string;
    email: string;
    senha: string;
    papel: 'gestor' | 'atendente';
    /** Só considerado para papel 'atendente' — gestor tem acesso total. */
    permissoes?: Recurso[];
  }) =>
    apiRequest<Usuario>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUsuario: (id: string, payload: { nome?: string; email?: string; papel?: 'gestor' | 'atendente' }) =>
    apiRequest<Usuario>(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateUsuarioPermissoes: (id: string, permissoes: Recurso[]) =>
    apiRequest<Usuario>(`/usuarios/${id}/permissoes`, {
      method: 'PUT',
      body: JSON.stringify({ permissoes }),
    }),
  toggleUsuarioStatus: (id: string, status: 'ativo' | 'inativo') =>
    apiRequest<Usuario>(`/usuarios/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteUsuario: (id: string) => apiRequest<void>(`/usuarios/${id}`, { method: 'DELETE' }),
};
