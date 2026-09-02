import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, XCircle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { useToast } from '../../components/ui/toast';
import { getErrorMessage } from '../../lib/errors';
import { portalApi } from '../services/portal';
import { BigCode } from '../components/big-code';
import { getPendingResgate, setPendingResgate } from '../lib/pending-resgate';

const num = new Intl.NumberFormat('pt-BR');

function mmss(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ResgatePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const pendente = getPendingResgate();
  const token = pendente?.resgateId === id ? pendente.token : null;

  const resgate = useQuery({
    queryKey: ['cliente', 'resgate', id],
    queryFn: () => portalApi.getResgate(id),
    refetchInterval: (q) => (q.state.data?.status === 'pendente' ? 2500 : false),
  });

  const status = resgate.data?.status;
  const expiraEm = resgate.data?.expiraEm ?? pendente?.expiraEm ?? null;
  const alvo = useMemo(() => (expiraEm ? new Date(expiraEm).getTime() : 0), [expiraEm]);
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!alvo || status !== 'pendente') return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [alvo, status]);
  const restante = alvo ? (alvo - agora) / 1000 : 0;

  useEffect(() => {
    if (status && status !== 'pendente' && pendente?.resgateId === id) {
      setPendingResgate(null);
      void queryClient.invalidateQueries({ queryKey: ['cliente', 'empresas'] });
      void queryClient.invalidateQueries({ queryKey: ['cliente', 'catalogo'] });
      void queryClient.invalidateQueries({ queryKey: ['cliente', 'extrato'] });
    }
  }, [status, id, pendente?.resgateId, queryClient]);

  const cancelar = useMutation({
    mutationFn: () => portalApi.cancelarResgate(id),
    onSuccess: () => {
      setPendingResgate(null);
      navigate('/app/recompensas', { replace: true });
    },
    onError: (err) => toast.error('Não foi possível cancelar', getErrorMessage(err)),
  });

  const titulo = resgate.data?.recompensaTitulo ?? pendente?.recompensaTitulo ?? 'Recompensa';
  const custo = resgate.data?.pontosUtilizados ?? pendente?.custoPontos ?? 0;

  if (resgate.isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <LoadingSpinner label="Carregando…" />
      </div>
    );
  }

  if (status === 'confirmado') {
    return (
      <ResultView
        tone="ok"
        icon={<CircleCheck className="size-10" />}
        titulo="Prêmio liberado!"
        linha={`${titulo}  ·  −${num.format(custo)} pontos`}
        onVoltar={() => navigate('/app', { replace: true })}
      />
    );
  }

  if (status === 'expirado' || status === 'cancelado') {
    return (
      <ResultView
        tone="warn"
        icon={<XCircle className="size-10" />}
        titulo={status === 'expirado' ? 'O código expirou' : 'Resgate cancelado'}
        linha="Sem problema — você pode pedir de novo na tela de prêmios."
        onVoltar={() => navigate('/app/recompensas', { replace: true })}
      />
    );
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-canvas px-5"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center">
        <BigCode
          value={token}
          title="Mostre no caixa"
          hint={`${titulo} · ${num.format(custo)} pontos`}
          footer={
            <p className="text-center text-[13px] font-medium tabular-nums text-[#6b7280]">
              {restante > 0 ? `Válido por mais ${mmss(restante)}` : 'Expirando…'}
            </p>
          }
        />

        {!token ? (
          <p className="mt-5 max-w-[300px] text-center text-[13px] text-fg-muted">
            Abra pelo mesmo celular onde você pediu o resgate para ver o código.
          </p>
        ) : (
          <p className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-fg-muted">
            <span className="size-2.5 rounded-full bg-primary motion-safe:animate-[soft-pulse_1.4s_ease-in-out_infinite]" />
            Aguardando o caixa confirmar…
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => cancelar.mutate()}
        disabled={cancelar.isPending}
        className="h-12 w-full rounded-xl border border-border-strong bg-surface text-[14px] font-semibold text-fg disabled:opacity-50"
      >
        {cancelar.isPending ? 'Cancelando…' : 'Cancelar'}
      </button>
    </div>
  );
}

function ResultView({
  icon,
  tone,
  titulo,
  linha,
  onVoltar,
}: {
  icon: ReactNode;
  tone: 'ok' | 'warn';
  titulo: string;
  linha: string;
  onVoltar: () => void;
}) {
  return (
    <div
      className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-canvas px-8 text-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <span
        className={
          tone === 'ok'
            ? 'flex size-16 items-center justify-center rounded-full bg-success-subtle text-success-fg'
            : 'flex size-16 items-center justify-center rounded-full bg-warning-subtle text-warning-fg'
        }
      >
        {icon}
      </span>
      <div>
        <p className="text-[19px] font-bold text-fg">{titulo}</p>
        <p className="mt-1 text-[14px] text-fg-muted">{linha}</p>
      </div>
      <button
        type="button"
        onClick={onVoltar}
        className="mt-2 h-12 w-full max-w-xs rounded-xl bg-primary text-[15px] font-bold text-fg-onprimary"
      >
        Voltar ao cartão
      </button>
    </div>
  );
}
