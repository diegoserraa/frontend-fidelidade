import { useMutation, useQuery } from '@tanstack/react-query';
import { Gift, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast';
import { getErrorMessage } from '../../lib/errors';
import { cn } from '../../lib/utils';
import { Screen } from '../components/screen';
import { useEmpresaAtual } from '../hooks/use-empresa';
import { portalApi } from '../services/portal';
import { setPendingResgate } from '../lib/pending-resgate';
import type { RecompensaCliente } from '../../types/api';

const num = new Intl.NumberFormat('pt-BR');

export function RecompensasPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { empresa, isLoading: loadingEmpresa } = useEmpresaAtual();

  const catalogo = useQuery({
    queryKey: ['cliente', 'catalogo', empresa?.empresaId],
    queryFn: () => portalApi.getCatalogo(empresa!.empresaId),
    enabled: Boolean(empresa),
  });

  const solicitar = useMutation({
    mutationFn: (recompensa: RecompensaCliente) =>
      portalApi.solicitarResgate(empresa!.empresaId, recompensa.id),
    onSuccess: (res) => {
      setPendingResgate({
        resgateId: res.resgateId,
        token: res.token,
        recompensaTitulo: res.recompensa.titulo,
        custoPontos: res.recompensa.custoPontos,
        expiraEm: res.expiraEm,
      });
      navigate(`/app/resgate/${res.resgateId}`);
    },
    onError: (err) => toast.error('Não foi possível resgatar', getErrorMessage(err)),
  });

  const loading = loadingEmpresa || catalogo.isLoading;
  const saldo = catalogo.data?.saldoPontos ?? 0;
  const lista = catalogo.data?.recompensas ?? [];

  return (
    <Screen title="Prêmios" subtitle={`Você tem ${num.format(saldo)} pontos`}>
      {loading ? (
        <LoadingSpinner label="Carregando…" />
      ) : catalogo.isError ? (
        <div className="mt-14 flex flex-col items-center gap-3 text-center">
          <p className="text-[14px] text-fg-muted">Não foi possível carregar os prêmios.</p>
          <Button variant="outline" onClick={() => catalogo.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : lista.length === 0 ? (
        <div className="mt-14 flex flex-col items-center gap-3 text-center">
          <Gift className="size-9 text-fg-subtle" />
          <p className="text-[14px] text-fg-muted">Nenhum prêmio disponível ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((r) => {
            const falta = Math.max(0, r.custoPontos - saldo);
            const progresso = Math.min(100, Math.round((saldo / r.custoPontos) * 100));
            return (
              <div
                key={r.id}
                className={cn(
                  'rounded-xl border bg-surface p-4',
                  r.resgatavel ? 'border-primary-border' : 'border-border',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl',
                      r.resgatavel
                        ? 'bg-primary-subtle text-primary-subtle-fg'
                        : 'bg-surface-muted text-fg-subtle',
                    )}
                  >
                    {r.resgatavel ? <Gift className="size-5" /> : <Lock className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold leading-snug text-fg">{r.titulo}</p>
                    {r.descricao ? (
                      <p className="mt-0.5 text-[13px] text-fg-muted">{r.descricao}</p>
                    ) : null}
                    <p className="mt-0.5 text-[13px] font-semibold text-fg-muted">
                      {num.format(r.custoPontos)} pontos
                    </p>
                  </div>
                </div>

                {r.resgatavel ? (
                  <Button
                    className="mt-3 h-11 w-full text-[14px] font-bold"
                    disabled={solicitar.isPending}
                    onClick={() => solicitar.mutate(r)}
                  >
                    {solicitar.isPending ? 'Aguarde…' : 'Resgatar agora'}
                  </Button>
                ) : (
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[12px] font-medium text-fg-muted">
                      Faltam <strong className="text-fg">{num.format(falta)}</strong> pontos
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
