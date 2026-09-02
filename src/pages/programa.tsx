import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Info, Power, RotateCcw, Sparkles, Wallet } from 'lucide-react';
import { ChartPanel } from '../components/shared/chart-panel';
import { ErrorState } from '../components/shared/error-state';
import { PageHeader } from '../components/shared/page-header';
import { StatCard } from '../components/shared/stat-card';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { useToast } from '../components/ui/toast';
import { useAuth } from '../context/auth-context';
import { cn } from '../lib/utils';
import { getErrorMessage } from '../lib/errors';
import {
  maskCurrencyBRL,
  maskInteger,
  parseCurrencyBRL,
  parseInteger,
} from '../lib/masks';
import { fidelidadeApi } from '../services/fidelidade';
import type { ProgramaFidelidade } from '../types/api';

const num = new Intl.NumberFormat('pt-BR');
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const DEFAULTS = { valorPorPonto: 1, pontosPorCiclo: 1, ativo: true };
const SIMULACOES = [20, 50, 100, 200];

/** Pontos gerados por uma compra — mesma regra do backend (piso por ciclo). */
function calcularPontos(
  valorCompra: number,
  valorCiclo: number,
  pontosCiclo: number,
  ativo: boolean,
): number {
  if (!ativo || valorCiclo <= 0 || pontosCiclo <= 0 || valorCompra <= 0) return 0;
  return Math.floor(valorCompra / valorCiclo) * pontosCiclo;
}

export function ProgramaPage() {
  const programa = useQuery({
    queryKey: ['programa-fidelidade'],
    queryFn: fidelidadeApi.getProgramaFidelidade,
  });

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <PageHeader
        title="Programa de pontos"
        description="Defina quanto o cliente precisa gastar para ganhar pontos. Vale para toda compra registrada nesta empresa."
      />

      {programa.isError ? (
        <ErrorState error={programa.error} onRetry={() => programa.refetch()} />
      ) : programa.isLoading || !programa.data ? (
        <ProgramaSkeleton />
      ) : (
        <ProgramaStudio key={programa.data.empresaId} programa={programa.data} />
      )}
    </div>
  );
}

function ProgramaStudio({ programa }: { programa: ProgramaFidelidade }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const podeEditar = user?.papel === 'gestor';

  const initial = useMemo(
    () => ({
      valor: maskCurrencyBRL(String(Math.round(programa.valorPorPonto * 100))),
      pontos: maskInteger(String(programa.pontosPorCiclo)),
      ativo: programa.ativo,
    }),
    [programa],
  );

  const [form, setForm] = useState(initial);
  const [sim, setSim] = useState('50,00');

  const patch = (next: Partial<typeof form>) => setForm((c) => ({ ...c, ...next }));

  const valorNum = parseCurrencyBRL(form.valor);
  const pontosNum = parseInteger(form.pontos);
  const simNum = parseCurrencyBRL(sim);

  const valorOk = valorNum > 0;
  const pontosOk = pontosNum > 0;
  const allValid = valorOk && pontosOk;

  const dirty =
    valorNum !== programa.valorPorPonto ||
    pontosNum !== programa.pontosPorCiclo ||
    form.ativo !== programa.ativo;

  const isDefault =
    valorNum === DEFAULTS.valorPorPonto &&
    pontosNum === DEFAULTS.pontosPorCiclo &&
    form.ativo === DEFAULTS.ativo;

  const save = useMutation({
    mutationFn: () =>
      fidelidadeApi.updateProgramaFidelidade({
        valorPorPonto: valorNum,
        pontosPorCiclo: pontosNum,
        ativo: form.ativo,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['programa-fidelidade'], updated);
      toast.success('Programa salvo', 'A nova regra já vale para as próximas compras.');
    },
    onError: (err) => toast.error('Não foi possível salvar', getErrorMessage(err)),
  });

  const simInsight: { tone: 'neutral' | 'positive' | 'attention'; text: string } = !allValid
    ? { tone: 'attention', text: 'Preencha a regra para simular a pontuação.' }
    : !form.ativo
      ? { tone: 'attention', text: 'Programa pausado — nenhuma compra gera pontos.' }
      : {
          tone: 'positive',
          text: `Uma compra de ${brl.format(50)} gera ${num.format(
            calcularPontos(50, valorNum, pontosNum, true),
          )} pontos.`,
        };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (podeEditar && allValid && dirty) save.mutate();
      }}
      noValidate
    >
      {/* Resumo — mesmo padrão de faixa das listagens */}
      <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
        <StatCard
          size="sm"
          accent="emerald"
          icon={Wallet}
          label="A cada"
          value={brl.format(valorNum)}
          hint="em compras"
        />
        <StatCard
          size="sm"
          accent="sky"
          icon={Sparkles}
          label="Cliente ganha"
          value={`${num.format(pontosNum)} pts`}
          hint="por ciclo completo"
        />
        <StatCard
          size="sm"
          accent={form.ativo ? 'violet' : 'rose'}
          icon={Power}
          label="Status"
          value={form.ativo ? 'Ativo' : 'Pausado'}
          hint="do programa"
        />
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,400px)_1fr]">
        {/* Editor */}
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
            {!podeEditar ? (
              <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted/50 px-3 py-2.5 text-[13px] text-fg-muted">
                <Info className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
                Somente gestores podem alterar o programa. Você está vendo a regra atual.
              </div>
            ) : null}

            <Section
              title="Regra de pontuação"
              hint="Valor gasto para completar um ciclo e quantos pontos cada ciclo vale."
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-3 text-[15px] leading-none text-fg">
                <span>A cada</span>
                <div className="w-32">
                  <Input
                    aria-label="Valor em reais para completar um ciclo"
                    inputMode="numeric"
                    leftSlot="R$"
                    disabled={!podeEditar}
                    error={!valorOk}
                    value={form.valor}
                    onChange={(event) => patch({ valor: maskCurrencyBRL(event.target.value) })}
                    placeholder="10,00"
                  />
                </div>
                <span>em compras, o cliente ganha</span>
                <div className="w-20">
                  <Input
                    aria-label="Pontos concedidos por ciclo"
                    inputMode="numeric"
                    disabled={!podeEditar}
                    error={!pontosOk}
                    value={form.pontos}
                    onChange={(event) => patch({ pontos: maskInteger(event.target.value) })}
                    placeholder="1"
                  />
                </div>
                <span>{pontosNum === 1 ? 'ponto.' : 'pontos.'}</span>
              </div>

              <p
                className={cn(
                  'mt-2.5 text-xs',
                  allValid ? 'text-fg-subtle' : 'text-danger-fg',
                )}
              >
                {allValid
                  ? 'O troco de um ciclo incompleto não acumula para a próxima compra.'
                  : 'Informe um valor e uma quantidade de pontos maiores que zero.'}
              </p>
            </Section>

            <Section title="Programa ativo" hint="Pausado, nenhuma compra gera pontos.">
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span className="text-[13px] text-fg-muted">
                  {form.ativo
                    ? 'Toda compra registrada pontua automaticamente.'
                    : 'Compras seguem sendo registradas, mas sem pontos.'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.ativo}
                  aria-label="Programa ativo"
                  disabled={!podeEditar}
                  onClick={() => patch({ ativo: !form.ativo })}
                  className={cn(
                    'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    form.ativo ? 'bg-primary' : 'bg-border-strong',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block size-5 rounded-full bg-white shadow transition-transform',
                      form.ativo ? 'translate-x-[22px]' : 'translate-x-0.5',
                    )}
                  />
                </button>
              </label>
            </Section>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
            <Button type="submit" disabled={!podeEditar || save.isPending || !allValid || !dirty}>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!podeEditar || isDefault}
              onClick={() =>
                setForm({
                  valor: maskCurrencyBRL(String(DEFAULTS.valorPorPonto * 100)),
                  pontos: maskInteger(String(DEFAULTS.pontosPorCiclo)),
                  ativo: DEFAULTS.ativo,
                })
              }
            >
              <RotateCcw className="size-4" />
              Padrão
            </Button>
            <span className="ml-auto text-[13px]">
              {dirty ? (
                <span className="text-fg-subtle">Não salvo</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-success-fg">
                  <Check className="size-3.5" />
                  Salvo
                </span>
              )}
            </span>
          </div>
        </Card>

        {/* Simulador */}
        <ChartPanel
          title="Simulador"
          description="Pontos que cada compra geraria com a regra ao lado"
          insight={simInsight}
        >
          <div className="grid flex-1 grid-cols-2 gap-2.5 sm:gap-3">
            {SIMULACOES.map((valor) => {
              const pts = calcularPontos(valor, valorNum, pontosNum, form.ativo);
              return (
                <div
                  key={valor}
                  className="flex flex-col justify-center rounded-lg border border-border bg-surface-muted/40 p-3"
                >
                  <p className="text-[11px] font-medium text-fg-subtle">
                    Compra de {brl.format(valor)}
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-fg">
                    {num.format(pts)}{' '}
                    <span className="text-xs font-medium text-fg-muted">pts</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex shrink-0 items-end gap-3 border-t border-border pt-3">
            <div className="w-40">
              <Input
                label="Testar um valor"
                inputMode="numeric"
                leftSlot="R$"
                value={sim}
                onChange={(event) => setSim(maskCurrencyBRL(event.target.value))}
                placeholder="0,00"
              />
            </div>
            <p className="flex items-baseline gap-1.5 pb-2 text-[13px] text-fg-muted">
              gera
              <span className="text-base font-semibold tabular-nums text-fg">
                {num.format(calcularPontos(simNum, valorNum, pontosNum, form.ativo))}
              </span>
              pts
            </p>
          </div>
        </ChartPanel>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="text-[13px] font-semibold text-fg">{title}</h3>
        {hint ? <p className="text-[11px] leading-snug text-fg-subtle">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ProgramaSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px]" />
        ))}
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,400px)_1fr]">
        <Skeleton className="min-h-[320px]" />
        <Skeleton className="min-h-[320px]" />
      </div>
    </div>
  );
}
