export type PapelUsuario = 'gestor' | 'atendente';

/** Catálogo fixo de módulos configuráveis por atendente (espelha o backend). */
export const RECURSOS = [
  'balcao',
  'clientes',
  'compras',
  'recompensas',
  'programa',
  'promocoes',
] as const;

export type Recurso = (typeof RECURSOS)[number];

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  empresaId?: string;
  /** Gestor sempre vem com o catálogo inteiro (acesso total implícito). */
  permissoes: Recurso[];
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioAutenticado;
}

export interface DashboardResponse {
  clientes: number;
  compras: number;
  valorMovimentado: number;
  pontosDistribuidos: number;
  pontosResgatados: number;
  recompensasResgatadas: number;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  status: string;
}

export interface EmpresaConfig {
  empresa_id: string;
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  /** Cor do texto/ícones sobre a cor primária (botões, cartão). */
  cor_texto?: string | null;
  /** Cor de fundo das telas do app do cliente. */
  cor_fundo?: string | null;
  exibir_total_gasto: boolean;
}

export interface Cliente {
  id: string;
  clienteId: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpf: string | null;
  saldoPontos: number;
  status: 'ativo' | 'inativo';
  desde: string;
}

/** Resposta de `POST /clientes/identificar` (leitura de QR ou busca por CPF). */
export interface IdentificacaoCliente {
  clienteEmpresaId: string;
  clienteId: string;
  nome: string;
  cpfMascarado: string | null;
  telefone: string | null;
  saldoPontos: number;
  status: 'ativo' | 'inativo';
  /** `true` quando o vínculo com esta empresa foi criado agora, na leitura. */
  novoVinculo: boolean;
}

export type ResgateStatus = 'pendente' | 'confirmado' | 'expirado' | 'cancelado';

export interface Resgate {
  id: string;
  clienteEmpresaId: string;
  recompensaId: string;
  usuarioId: string | null;
  pontosUtilizados: number;
  status: ResgateStatus;
  expiraEm: string | null;
  confirmadoEm: string | null;
  createdAt: string;
}

/** Resposta de `POST /resgates/validar` (leitura do QR de resgate no balcão). */
export interface ResgateValidacao {
  resgateId: string;
  status: ResgateStatus;
  cliente: { nome: string };
  recompensa: { titulo: string; custoPontos: number };
  saldoPontos: number;
  saldoSuficiente: boolean;
  expiraEm: string | null;
}

export interface ClientesResponse {
  data: Cliente[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Compra {
  id: string;
  clienteEmpresaId: string;
  usuarioId: string | null;
  valor: number;
  pontosGerados: number;
  createdAt: string;
}

export interface Recompensa {
  id: string;
  titulo: string;
  descricao: string | null;
  custoPontos: number;
  status: 'ativa' | 'inativa';
  createdAt: string;
}

export interface Promocao {
  id: string;
  titulo: string;
  mensagem: string;
  status: 'rascunho' | 'enviada' | 'inativa';
  enviadaEm: string | null;
  createdAt: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: PapelUsuario;
  status: 'ativo' | 'inativo';
  createdAt: string;
  /** Gestor sempre vem com o catálogo inteiro (acesso total implícito). */
  permissoes: Recurso[];
}

export interface ClienteResumo {
  totalGasto: number;
  quantidadeCompras: number;
  ultimasCompras: Array<{
    id: string;
    valor: string;
    pontos_gerados: number;
    created_at: string;
  }>;
  ultimosResgates: Array<{
    id: string;
    pontos_utilizados: number;
    created_at: string;
    recompensa_titulo: string;
  }>;
}

/* ---------------------------------------------------------------- */
/* App do cliente (portal)                                           */
/* ---------------------------------------------------------------- */

export interface ClienteConta {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
}

export interface ClienteLoginResponse {
  token: string;
  cliente: ClienteConta;
}

export interface EmpresaVinculo {
  empresaId: string;
  nome: string;
  saldoPontos: number;
  status: 'ativo' | 'inativo';
  logoUrl: string | null;
  corPrimaria: string | null;
  corSecundaria: string | null;
  /** Cor do texto/ícones sobre a cor primária (cartão). */
  corTexto: string | null;
  /** Cor de fundo das telas do app do cliente. */
  corFundo: string | null;
  exibirTotalGasto: boolean;
  totalGasto: number;
  /** Pontos ganhos ao longo do tempo (não caem por resgate) — base do nível. */
  pontosAcumulados: number;
  /** Data em que o cliente entrou no programa desta padaria (ISO). */
  desde: string;
  nivel: NivelFidelidade;
  proximoNivel: NivelFidelidade | null;
}

export interface NivelFidelidade {
  nome: string;
  min: number;
}

/** Identidade visual pública de uma empresa (sem autenticação) — usada na tela de login. */
export interface EmpresaPublica {
  nome: string;
  logoUrl: string | null;
  corPrimaria: string | null;
  corSecundaria: string | null;
  corTexto: string | null;
  corFundo: string | null;
}

export interface RecompensaCliente {
  id: string;
  titulo: string;
  descricao: string | null;
  custoPontos: number;
  resgatavel: boolean;
}

export interface CatalogoCliente {
  saldoPontos: number;
  recompensas: RecompensaCliente[];
}

export interface QrIdentidade {
  token: string;
  expiraEm: string;
}

export interface ResgateSolicitado {
  resgateId: string;
  status: ResgateStatus;
  token: string;
  expiraEm: string;
  recompensa: { id: string; titulo: string; custoPontos: number };
  saldoPontos: number;
}

export interface ResgateClienteDetalhe {
  id: string;
  empresaId: string;
  recompensaId: string;
  recompensaTitulo: string;
  pontosUtilizados: number;
  status: ResgateStatus;
  expiraEm: string | null;
  confirmadoEm: string | null;
  createdAt: string;
}

export interface MovimentoExtrato {
  id: string;
  tipo: 'entrada' | 'saida';
  origem: 'compra' | 'resgate' | 'ajuste';
  pontos: number;
  saldoApos: number;
  createdAt: string;
}

export interface ExtratoResponse {
  data: MovimentoExtrato[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProgramaFidelidade {
  empresaId: string;
  /** Valor em R$ que fecha um ciclo de pontuação. */
  valorPorPonto: number;
  /** Pontos concedidos a cada ciclo completo. */
  pontosPorCiclo: number;
  ativo: boolean;
}
