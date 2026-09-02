import { adminRequest } from '../lib/admin-api';
import type { AdminAutenticado, AdminLoginResponse, CriarEmpresaInput, EmpresaAdmin } from '../types';

export const adminApi = {
  login: (input: { email: string; senha: string }) =>
    adminRequest<AdminLoginResponse>('/admin/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  me: () => adminRequest<AdminAutenticado>('/admin/me'),

  getEmpresas: () => adminRequest<EmpresaAdmin[]>('/admin/empresas'),

  criarEmpresa: (input: CriarEmpresaInput) =>
    adminRequest<{ empresaId: string }>('/admin/empresas', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  atualizarStatusEmpresa: (id: string, status: 'ativa' | 'inativa') =>
    adminRequest<EmpresaAdmin>(`/admin/empresas/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
