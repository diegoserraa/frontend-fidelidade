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

  registrar: (input: { nome: string; cpf: string; senha: string; telefone?: string }) =>
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
};
