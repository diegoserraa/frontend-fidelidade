import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { Button } from '../../components/ui/button';
import { Screen } from '../components/screen';
import { useEmpresaAtual } from '../hooks/use-empresa';
import { portalApi } from '../services/portal';
import type { MovimentoExtrato } from '../../types/api';

const num = new Intl.NumberFormat('pt-BR');

const origemLabel: Record<MovimentoExtrato['origem'], string> = {
  compra: 'Compra na loja',
  resgate: 'Prêmio resgatado',
  ajuste: 'Ajuste manual',
};

function quandoAmigavel(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay(d, hoje)) return `Hoje, ${hora}`;
  if (sameDay(d, ontem)) return `Ontem, ${hora}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

export function ExtratoPage() {
  const { empresa, isLoading: loadingEmpresa } = useEmpresaAtual();

  const extrato = useQuery({
    queryKey: ['cliente', 'extrato', empresa?.empresaId],
    queryFn: () => portalApi.getExtrato(empresa!.empresaId, 1, 50),
    enabled: Boolean(empresa),
  });

  const loading = loadingEmpresa || extrato.isLoading;
  const linhas = extrato.data?.data ?? [];

  return (
    <Screen title="Extrato" subtitle="Seus pontos que entraram e saíram">
      {loading ? (
        <LoadingSpinner label="Carregando…" />
      ) : extrato.isError ? (
        <div className="mt-14 flex flex-col items-center gap-3 text-center">
          <p className="text-[14px] text-fg-muted">Não foi possível carregar o extrato.</p>
          <Button variant="outline" onClick={() => extrato.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : linhas.length === 0 ? (
        <div className="mt-14 flex flex-col items-center gap-3 text-center">
          <Receipt className="size-9 text-fg-subtle" />
          <p className="text-[14px] text-fg-muted">Nenhuma movimentação ainda.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {linhas.map((m) => {
            const entrada = m.tipo === 'entrada';
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3"
              >
                <span
                  className={
                    entrada
                      ? 'flex size-9 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success-fg'
                      : 'flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-subtle'
                  }
                >
                  {entrada ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-fg">{origemLabel[m.origem]}</p>
                  <p className="text-[12px] text-fg-subtle">{quandoAmigavel(m.createdAt)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={
                      entrada
                        ? 'text-[15px] font-bold tabular-nums text-success-fg'
                        : 'text-[15px] font-bold tabular-nums text-fg'
                    }
                  >
                    {entrada ? '+' : '−'}
                    {num.format(m.pontos)}
                  </p>
                  <p className="text-[11px] text-fg-subtle">saldo {num.format(m.saldoApos)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
