import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portalApi } from '../services/portal';
import { applyEmpresaTheme } from '../lib/theme';
import { applyEmpresaPwaIdentity } from '../lib/pwa-identity';
import { EMPRESA_ID } from '../lib/config';
import type { EmpresaVinculo } from '../../types/api';

/**
 * Padaria "atual" do cliente (o app assume UMA padaria).
 *
 * - `VITE_EMPRESA_ID` definido: garante que o cliente esteja no programa dessa
 *   padaria — entra automaticamente na 1ª vez (`POST /cliente/:id/entrar`).
 * - Senão: usa o primeiro vínculo que existir.
 *
 * Aplica o tema da padaria assim que os dados chegam.
 *
 * `refetchInterval` / `staleTime` (ms): a tela do Cartão passa valores curtos
 * para o saldo parecer "ao vivo" enquanto o cliente está no caixa; as demais
 * telas ficam no padrão (mais econômico).
 */
export function useEmpresaAtual(opts?: { refetchInterval?: number; staleTime?: number }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cliente', 'empresas'],
    queryFn: portalApi.getEmpresas,
    staleTime: opts?.staleTime ?? 10_000,
    // Mantém o saldo vivo sem o cliente recarregar: rebusca ao reabrir o app
    // (atendente pontuou enquanto ele olhava o caixa) e em intervalo curto com
    // a tela visível. Em background o React Query já não dispara.
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: opts?.refetchInterval ?? 25_000,
  });

  const empresas = query.data ?? [];
  const configurada = EMPRESA_ID
    ? empresas.find((e) => e.empresaId === EMPRESA_ID)
    : undefined;
  const empresa: EmpresaVinculo | undefined =
    configurada ?? empresas.find((e) => e.status === 'ativo') ?? empresas[0];

  const tentouEntrar = useRef(false);
  const entrar = useMutation({
    mutationFn: (id: string) => portalApi.entrarNaEmpresa(id),
    onSuccess: (vinculo) => {
      if (vinculo) {
        // Aplica na hora (sem esperar o refetch) para o tema não "piscar".
        queryClient.setQueryData<EmpresaVinculo[]>(['cliente', 'empresas'], (old) => {
          const rest = (old ?? []).filter((e) => e.empresaId !== vinculo.empresaId);
          return [...rest, vinculo];
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['cliente', 'empresas'] });
    },
  });

  useEffect(() => {
    if (
      EMPRESA_ID &&
      query.isSuccess &&
      !configurada &&
      !entrar.isPending &&
      !tentouEntrar.current
    ) {
      tentouEntrar.current = true;
      entrar.mutate(EMPRESA_ID);
    }
  }, [query.isSuccess, configurada, entrar]);

  useEffect(() => {
    if (empresa) {
      applyEmpresaTheme(empresa);
      applyEmpresaPwaIdentity(empresa);
    }
  }, [empresa]);

  // Ainda resolvendo o auto-vínculo com a padaria configurada.
  const entrando =
    EMPRESA_ID != null &&
    !configurada &&
    !entrar.isError &&
    (query.isLoading || entrar.isPending || (query.isSuccess && !entrar.isSuccess));

  return {
    empresa,
    semVinculo: query.isSuccess && !empresa && !entrando,
    isLoading: query.isLoading || entrando,
    isError: (query.isError && !empresa) || entrar.isError,
    error: entrar.error ?? query.error,
    refetch: query.refetch,
  };
}
