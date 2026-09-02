import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import type { Recurso } from '../../types/api';

/**
 * Defesa em profundidade: o backend já bloqueia (403) quem não tem o
 * recurso, mas sem isso um atendente digitando a URL direto ainda veria a
 * página piscar antes do primeiro fetch falhar. Redireciona pro Dashboard
 * assim que sabemos que falta a permissão.
 */
export function RequirePermission({ recurso, children }: { recurso: Recurso; children: ReactNode }) {
  const { temPermissao } = useAuth();
  if (!temPermissao(recurso)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Mesma ideia, mas para páginas restritas ao gestor (Usuários, Configuração). */
export function RequireGestor({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.papel !== 'gestor') return <Navigate to="/" replace />;
  return <>{children}</>;
}
