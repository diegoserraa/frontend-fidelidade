import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '../services/portal';
import { applyEmpresaTheme } from '../lib/theme';
import { applyEmpresaPwaIdentity } from '../lib/pwa-identity';
import { EMPRESA_ID } from '../lib/config';

/**
 * Pinta a tela de login com a identidade visual configurada no painel
 * (`/empresa/:id/publico`, sem auth) — antes de o cliente entrar, quando ainda
 * não há `GET /cliente/empresas` disponível (esse exige sessão).
 */
export function useEmpresaTemaPublico(enabled: boolean) {
  const query = useQuery({
    queryKey: ['empresa', 'publico', EMPRESA_ID],
    queryFn: () => portalApi.getEmpresaPublica(EMPRESA_ID as string),
    enabled: enabled && Boolean(EMPRESA_ID),
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      applyEmpresaTheme(query.data);
      applyEmpresaPwaIdentity(query.data);
    }
  }, [query.data]);

  return { empresa: query.data, isLoading: Boolean(EMPRESA_ID) && query.isLoading };
}
