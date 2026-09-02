export interface AdminAutenticado {
  id: string;
  nome: string;
  email: string;
}

export interface AdminLoginResponse {
  token: string;
  admin: AdminAutenticado;
}

export interface EmpresaAdmin {
  id: string;
  nome: string;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  status: 'ativa' | 'inativa';
  createdAt: string;
  usuarios: number;
  clientes: number;
}

export interface CriarEmpresaInput {
  nome: string;
  cnpj: string;
  email?: string;
  telefone?: string;
  gestor: { nome: string; email: string; senha: string };
}
