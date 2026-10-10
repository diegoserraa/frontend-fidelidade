import { clienteRequest } from '../lib/cliente-api';
import { EMPRESA_ID } from '../lib/config';
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

  // empresaId vai junto (quando dá pra identificar, ver config.ts) pra
  // sessão única no backend ser por PADARIA, não global — senão logar no
  // app de uma padaria derrubaria a sessão já aberta no de outra, mesmo
  // sendo o mesmo aparelho/pessoa (ver clienteAuth.service.ts).
  registrar: (input: { nome: string; cpf: string; senha: string; telefone?: string; email?: string }) =>
    clienteRequest<ClienteLoginResponse>('/auth/cliente/registrar', {
      method: 'POST',
      body: JSON.stringify({ ...input, empresaId: EMPRESA_ID }),
    }),

  login: (input: { cpf: string; senha: string }) =>
    clienteRequest<ClienteLoginResponse>('/auth/cliente/login', {
      method: 'POST',
      body: JSON.stringify({ ...input, empresaId: EMPRESA_ID }),
    }),

  me: () => clienteRequest<ClienteConta>('/auth/cliente/me'),

  /** Resposta é sempre a mesma genérica, exista ou não conta com esse CPF. */
  esqueciSenha: (cpf: string) =>
    clienteRequest<{ mensagem: string }>('/auth/cliente/esqueci-senha', {
      method: 'POST',
      body: JSON.stringify({ cpf }),
    }),

  redefinirSenha: (input: { token: string; novaSenha: string }) =>
    clienteRequest<ClienteLoginResponse>('/auth/cliente/redefinir-senha', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** Sai só da padaria `empresaId` — histórico/pontos só dela somem. Se era a
   *  última padaria vinculada, o cadastro global (login) também é apagado
   *  (ver sairDaEmpresa no backend); qualquer outra padaria vinculada não é
   *  afetada. */
  sairDaEmpresa: (empresaId: string) =>
    clienteRequest<void>(`/cliente/${empresaId}`, { method: 'DELETE' }),

  /** Invalida a sessão no servidor (não só localmente) — evita que um token
   *  esquecido logado em outro aparelho continue valendo após o logout. */
  sair: () => clienteRequest<void>('/auth/cliente/sair', { method: 'POST' }),

  getEmpresas: () => clienteRequest<EmpresaVinculo[]>('/cliente/empresas'),

  /** Cliente entra sozinho no programa de uma padaria (deploy single-tenant). */
  entrarNaEmpresa: (empresaId: string) =>
    clienteRequest<EmpresaVinculo | null>(`/cliente/${empresaId}/entrar`, { method: 'POST' }),

  /** O QR carimba `empresaId` — só vale pra pontuar nessa padaria, mesmo o
   *  cliente sendo membro de outras (ver clientes.service.ts no backend). */
  getQr: (empresaId: string) =>
    clienteRequest<QrIdentidade>(`/cliente/${empresaId}/qr`, { method: 'POST' }),

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
