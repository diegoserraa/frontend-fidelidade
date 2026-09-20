import { clienteRequest } from '../lib/cliente-api';
import type {
  CatalogoCliente,
  ClienteConta,
  ClienteLoginResponse,
  EmpresaPublica,
  EmpresaVinculo,
  ExtratoResponse,
  QrIdentidade,
  ResgateClienteDetalhe,
  ResgateSolicitado,
} from '../../types/api';

export const portalApi = {
  /** Identidade visual da empresa sem precisar de sessão — para a tela de login. */
  getEmpresaPublica: (empresaId: string) =>
    clienteRequest<EmpresaPublica>(`/empresa/${empresaId}/publico`),

  registrar: (input: { nome: string; cpf: string; senha: string; telefone?: string; email?: string }) =>
    clienteRequest<ClienteLoginResponse>('/auth/cliente/registrar', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  login: (input: { cpf: string; senha: string }) =>
    clienteRequest<ClienteLoginResponse>('/auth/cliente/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  me: () => clienteRequest<ClienteConta>('/auth/cliente/me'),

  excluirConta: () => clienteRequest<void>('/auth/cliente/me', { method: 'DELETE' }),

  /** Invalida a sessão no servidor (não só localmente) — evita que um token
   *  esquecido logado em outro aparelho continue valendo após o logout. */
  sair: () => clienteRequest<void>('/auth/cliente/sair', { method: 'POST' }),

  getEmpresas: () => clienteRequest<EmpresaVinculo[]>('/cliente/empresas'),

  /** Cliente entra sozinho no programa de uma padaria (deploy single-tenant). */
  entrarNaEmpresa: (empresaId: string) =>
    clienteRequest<EmpresaVinculo | null>(`/cliente/${empresaId}/entrar`, { method: 'POST' }),

  getQr: () => clienteRequest<QrIdentidade>('/cliente/qr', { method: 'POST' }),

  getCatalogo: (empresaId: string) =>
    clienteRequest<CatalogoCliente>(`/cliente/${empresaId}/recompensas`),

  getExtrato: (empresaId: string, page = 1, pageSize = 20) =>
    clienteRequest<ExtratoResponse>(
      `/cliente/${empresaId}/extrato?page=${page}&pageSize=${pageSize}`,
    ),

  solicitarResgate: (empresaId: string, recompensaId: string) =>
    clienteRequest<ResgateSolicitado>(`/cliente/${empresaId}/resgates`, {
      method: 'POST',
      body: JSON.stringify({ recompensaId }),
    }),

  getResgate: (id: string) => clienteRequest<ResgateClienteDetalhe>(`/cliente/resgates/${id}`),

  cancelarResgate: (id: string) =>
    clienteRequest<{ resgateId: string; status: 'cancelado' }>(`/cliente/resgates/${id}`, {
      method: 'DELETE',
    }),

  subscribePush: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
    clienteRequest<void>('/cliente/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
    }),

  /** Liga/desliga notificação só para `empresaId` — não mexe na assinatura de
   *  push do aparelho, que é única e compartilhada entre todas as padarias. */
  atualizarNotificacoes: (empresaId: string, ativas: boolean) =>
    clienteRequest<void>(`/cliente/${empresaId}/notificacoes`, {
      method: 'PUT',
      body: JSON.stringify({ ativas }),
    }),
};
