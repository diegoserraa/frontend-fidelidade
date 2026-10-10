import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portalApi } from '../services/portal';
import { applyEmpresaTheme } from '../lib/theme';
import { applyEmpresaPwaIdentity } from '../lib/pwa-identity';
import { EMPRESA_ID, EMPRESA_ID_STORAGE_KEY } from '../lib/config';
import type { EmpresaVinculo } from '../../types/api';

/**
 * Padaria "atual" do cliente (o app assume UMA padaria).
 *
 * - `EMPRESA_ID` definido (vem do endereço /app/<id>/..., próprio de CADA
 *   padaria — ver config.ts) e o cliente ainda não tem vínculo: entra
 *   automaticamente (`precisaConfirmarEntrada`/`entrar` abaixo), sem pedir
 *   toque de confirmação. Antes exigia confirmação explícita porque uma URL
 *   compartilhada (`?empresa=`) podia ser aberta sem intenção; agora, como
 *   cada padaria tem endereço/ícone PRÓPRIO (só se chega até ele escaneando
 *   o QR específico dela), estar nesse endereço já é a intenção.
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

  const precisaConfirmarEntrada = Boolean(EMPRESA_ID) && query.isSuccess && !configurada;

  const entrar = useMutation({
    mutationFn: () => portalApi.entrarNaEmpresa(EMPRESA_ID as string),
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

  // Entra sozinho assim que percebe que falta vínculo com a padaria deste
  // endereço — ver comentário no topo do arquivo sobre por que não precisa
  // mais de confirmação. `isPending`/`isError` na guarda evitam chamar de
  // novo enquanto já está em andamento ou depois de falhar (cartao.tsx
  // mostra um botão de tentar de novo nesse caso).
  useEffect(() => {
    if (precisaConfirmarEntrada && !entrar.isPending && !entrar.isError) {
      entrar.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precisaConfirmarEntrada, entrar.isPending, entrar.isError]);

  useEffect(() => {
    if (empresa) {
      applyEmpresaTheme(empresa);
      applyEmpresaPwaIdentity(empresa);
    }
  }, [empresa]);

  return {
    empresa,
    /** Todos os vínculos do cliente — pra listar/trocar de padaria (perfil.tsx). */
    empresas,
    semVinculo: query.isSuccess && !empresa && !precisaConfirmarEntrada,
    isLoading: query.isLoading,
    isError: query.isError && !empresa,
    error: query.error,
    refetch: query.refetch,

    precisaConfirmarEntrada,
    tentarEntrarDeNovo: () => entrar.mutate(),
    entrando: entrar.isPending,
    erroAoEntrar: entrar.isError,
  };
}

/**
 * Torna `empresa` a padaria "atual" (mesmo mecanismo do QR — grava no
 * localStorage, ver config.ts) e recarrega. Recarregar em vez de tentar
 * trocar em runtime é de propósito: `EMPRESA_ID` é lido uma vez na carga do
 * módulo e várias partes do app (índice de tema, splash) dependem dele ser
 * estável durante a sessão — trocar de padaria é raro o bastante pra um
 * recarregamento ser um custo aceitável em troca de não arriscar os dois
 * ficarem dessincronizados.
 *
 * Pré-carrega o tema/logo da escolhida ANTES de recarregar (carimbado já com
 * o id DELA, não o `EMPRESA_ID` atual — só vai virar o atual depois do
 * reload) — sem isso, a splash abriria com a marca genérica por um instante
 * até o React montar e buscar os dados de novo.
 */
export function selecionarEmpresa(empresa: EmpresaVinculo): void {
  try {
    localStorage.setItem(EMPRESA_ID_STORAGE_KEY, empresa.empresaId);
  } catch {
    /* localStorage indisponível — a troca não persiste, mas não trava a UI */
  }
  applyEmpresaTheme(empresa, empresa.empresaId);
  // Caminho da NOVA empresa, não appPath() (que reflete a EMPRESA_ID atual,
  // antes do reload) — precisa ser o endereço próprio dela, senão o
  // Android continua achando que é a mesma instalação de antes.
  window.location.assign(`/app/${empresa.empresaId}`);
}
