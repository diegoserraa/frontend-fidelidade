import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LucideIcon } from 'lucide-react';
import { CreditCard, Gift, TrendingUp, Users } from 'lucide-react';
import { ChartPanel } from '../components/shared/chart-panel';
import { ErrorState } from '../components/shared/error-state';
import { Segmented } from '../components/ui/segmented';
import { Skeleton } from '../components/ui/skeleton';
import { useAuth } from '../context/auth-context';
import { fidelidadeApi } from '../services/fidelidade';
import type { DashboardResponse, Promocao, Recompensa } from '../types/api';

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const brlExact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const num = new Intl.NumberFormat('pt-BR');
const dec = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  fontSize: 12,
  padding: '6px 10px',
  boxShadow: 'var(--shadow-md)',
  color: 'var(--color-fg)',
} as const;

const chartWrap = 'relative min-h-[168px] flex-1 lg:min-h-0';

export function DashboardPage() {
  const { temPermissao } = useAuth();
  const podeVerRecompensas = temPermissao('recompensas');
  const podeVerPromocoes = temPermissao('promocoes');

  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: fidelidadeApi.getDashboard });
  // Atendente sem acesso a esses módulos nem dispara a busca — evita um card
  // eternamente em erro (403) com botão "tentar de novo" que nunca funciona.
  const recompensas = useQuery({
    queryKey: ['recompensas'],
    queryFn: fidelidadeApi.getRecompensas,
    enabled: podeVerRecompensas,
  });
  const promocoes = useQuery({
    queryKey: ['promocoes'],
    queryFn: fidelidadeApi.getPromocoes,
    enabled: podeVerPromocoes,
  });

  if (dashboard.isError) {
    return <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />;
  }
  if (dashboard.isLoading || !dashboard.data) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardContent
      data={dashboard.data}
      recompensas={podeVerRecompensas ? recompensas : undefined}
      promocoes={podeVerPromocoes ? promocoes : undefined}
    />
  );
}

type QueryLike<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
};

function DashboardContent({
  data,
  recompensas,
  promocoes,
}: {
  data: DashboardResponse;
  /** `undefined` = usuário sem permissão pro módulo — painel nem aparece. */
  recompensas: QueryLike<Recompensa[]> | undefined;
  promocoes: QueryLike<Promocao[]> | undefined;
}) {
  const ticketMedio = data.compras > 0 ? data.valorMovimentado / data.compras : 0;
  const comprasPorCliente = data.clientes > 0 ? data.compras / data.clientes : 0;
  const pontosPorCliente = data.clientes > 0 ? data.pontosDistribuidos / data.clientes : 0;
  const emCirculacao = Math.max(0, data.pontosDistribuidos - data.pontosResgatados);
  const taxaResgate =
    data.pontosDistribuidos > 0
      ? Math.round((data.pontosResgatados / data.pontosDistribuidos) * 100)
      : 0;

  const kpis: { label: string; value: string; helper: string; icon: LucideIcon; tint: string }[] = [
    {
      label: 'Clientes',
      value: num.format(data.clientes),
      helper: `${num.format(Math.round(pontosPorCliente))} pts/cliente`,
      icon: Users,
      tint: 'var(--color-chart-2)',
    },
    {
      label: 'Compras',
      value: num.format(data.compras),
      helper: `${dec.format(comprasPorCliente)} por cliente`,
      icon: CreditCard,
      tint: 'var(--color-chart-1)',
    },
    {
      label: 'Movimentado',
      value: brl.format(data.valorMovimentado),
      helper: `ticket médio ${brlExact.format(ticketMedio)}`,
      icon: TrendingUp,
      tint: 'var(--color-chart-3)',
    },
    {
      label: 'Resgates',
      value: num.format(data.recompensasResgatadas),
      helper: `${taxaResgate}% dos pontos`,
      icon: Gift,
      tint: 'var(--color-chart-4)',
    },
  ];

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-fg">Visão geral</h1>
          <p className="hidden text-[12px] text-fg-muted sm:block">
            Saúde do programa de fidelidade e próximos passos.
          </p>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className="flex flex-col justify-between gap-1 rounded-xl border border-border p-3 shadow-xs"
            style={{
              backgroundImage: `linear-gradient(155deg, var(--color-surface), color-mix(in srgb, ${kpi.tint} 9%, var(--color-surface)))`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-fg-muted">{kpi.label}</span>
              <span
                className="flex size-6 items-center justify-center rounded-md text-fg"
                style={{
                  backgroundColor: `color-mix(in srgb, ${kpi.tint} 24%, var(--color-surface))`,
                }}
              >
                <kpi.icon className="size-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="text-lg font-semibold tracking-tight text-fg tabular-nums sm:text-xl lg:text-[22px]">
              {kpi.value}
            </div>
            <p className="truncate text-[10px] text-fg-subtle sm:text-[11px]">{kpi.helper}</p>
          </article>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2">
        <PointsPanel
          resgatados={data.pontosResgatados}
          emCirculacao={emCirculacao}
          distribuidos={data.pontosDistribuidos}
          className="sm:col-span-2 lg:col-span-6 lg:row-span-2"
        />
        <RedemptionGauge taxa={taxaResgate} className="lg:col-span-3 lg:row-span-2" />
        {promocoes ? <CampaignsPanel query={promocoes} className="lg:col-span-3" /> : null}
        {recompensas ? <RewardsPanel query={recompensas} className="lg:col-span-3" /> : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Economia de pontos — rosca / barras, valores / %                          */
/* -------------------------------------------------------------------------- */

function PointsPanel({
  resgatados,
  emCirculacao,
  distribuidos,
  className,
}: {
  resgatados: number;
  emCirculacao: number;
  distribuidos: number;
  className?: string;
}) {
  const [chart, setChart] = useState<'rosca' | 'barras'>('rosca');
  const [unit, setUnit] = useState<'valores' | 'percentual'>('valores');

  const pct = (value: number) => (distribuidos > 0 ? Math.round((value / distribuidos) * 100) : 0);
  const rows = [
    { name: 'Resgatados', value: resgatados, color: 'var(--color-chart-1)' },
    { name: 'Em circulação', value: emCirculacao, color: 'var(--color-chart-2)' },
  ];
  const format = (value: number) => (unit === 'valores' ? num.format(value) : `${pct(value)}%`);
  const circulacaoAlta = distribuidos > 0 && emCirculacao / distribuidos >= 0.6;

  return (
    <ChartPanel
      title="Economia de pontos"
      description={`${num.format(distribuidos)} pontos distribuídos`}
      className={className}
      toolbar={
        <div className="flex flex-wrap gap-1.5">
          <Segmented
            aria-label="Tipo de gráfico"
            size="sm"
            value={chart}
            onChange={setChart}
            options={[
              { value: 'rosca', label: 'Rosca' },
              { value: 'barras', label: 'Barras' },
            ]}
          />
          <Segmented
            aria-label="Unidade"
            size="sm"
            value={unit}
            onChange={setUnit}
            options={[
              { value: 'valores', label: 'Nº' },
              { value: 'percentual', label: '%' },
            ]}
          />
        </div>
      }
      insight={{
        tone: circulacaoAlta ? 'attention' : 'positive',
        text: circulacaoAlta
          ? `${pct(emCirculacao)}% dos pontos ainda sem resgate — considere uma campanha.`
          : `${pct(resgatados)}% dos pontos já viraram recompensa.`,
      }}
    >
      <div className={chartWrap}>
        <ResponsiveContainer width="100%" height="100%">
          {chart === 'rosca' ? (
            <PieChart>
              <defs>
                <linearGradient id="grad-resgatados" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="grad-circulacao" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius="60%"
                outerRadius="92%"
                paddingAngle={2}
                stroke="var(--color-surface)"
                strokeWidth={2}
              >
                <Cell fill="url(#grad-resgatados)" />
                <Cell fill="url(#grad-circulacao)" />
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [format(Number(value ?? 0)), String(name ?? '')]}
              />
            </PieChart>
          ) : (
            <BarChart
              layout="vertical"
              data={rows}
              margin={{ top: 4, right: 40, left: 4, bottom: 4 }}
              barSize={24}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={92}
                tick={{ fontSize: 11, fill: 'var(--color-fg-subtle)' }}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-surface-muted)' }}
                contentStyle={tooltipStyle}
                formatter={(value, name) => [format(Number(value ?? 0)), String(name ?? '')]}
              />
              <Bar dataKey="value" radius={6}>
                {rows.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(value) => format(Number(value ?? 0))}
                  className="fill-fg text-[11px]"
                />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>

        {chart === 'rosca' ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-semibold tabular-nums text-fg">
              {unit === 'valores' ? num.format(distribuidos) : '100%'}
            </span>
            <span className="text-[10px] text-fg-subtle">distribuídos</span>
          </div>
        ) : null}
      </div>

      {chart === 'rosca' ? (
        <ul className="mt-2 flex shrink-0 flex-wrap gap-x-4 gap-y-1">
          {rows.map((row) => (
            <li key={row.name} className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: row.color }}
                aria-hidden="true"
              />
              {row.name}
              <span className="font-medium text-fg">{format(row.value)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </ChartPanel>
  );
}

/* -------------------------------------------------------------------------- */
/* Taxa de resgate — medidor radial                                          */
/* -------------------------------------------------------------------------- */

function RedemptionGauge({ taxa, className }: { taxa: number; className?: string }) {
  const tone = taxa < 25 ? 'attention' : taxa > 60 ? 'positive' : 'neutral';
  const insight =
    taxa < 25
      ? 'Resgate baixo: muitos pontos parados.'
      : taxa > 60
        ? 'Resgate alto: clientes usam bem os pontos.'
        : 'Resgate em ritmo saudável.';

  return (
    <ChartPanel
      title="Taxa de resgate"
      description="Resgatados sobre distribuídos"
      className={className}
      insight={{ tone, text: insight }}
    >
      <div className="relative min-h-[190px] flex-1 lg:min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="62%"
            outerRadius="92%"
            data={[{ value: taxa }]}
            startAngle={220}
            endAngle={-40}
          >
            <defs>
              <linearGradient id="grad-gauge" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--color-chart-2)" />
                <stop offset="100%" stopColor="var(--color-chart-1)" />
              </linearGradient>
            </defs>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={12}
              fill="url(#grad-gauge)"
              background={{ fill: 'var(--color-surface-muted)' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-fg sm:text-[28px]">{taxa}%</span>
          <span className="text-[10px] text-fg-subtle">resgatado</span>
        </div>
      </div>
    </ChartPanel>
  );
}

/* -------------------------------------------------------------------------- */
/* Campanhas por status                                                      */
/* -------------------------------------------------------------------------- */

function CampaignsPanel({ query, className }: { query: QueryLike<Promocao[]>; className?: string }) {
  const list = query.data ?? [];
  const countBy = (status: Promocao['status']) => list.filter((p) => p.status === status).length;
  const rows = [
    { name: 'Rascunho', value: countBy('rascunho'), color: 'var(--color-chart-4)' },
    { name: 'Enviadas', value: countBy('enviada'), color: 'var(--color-chart-1)' },
    { name: 'Inativas', value: countBy('inativa'), color: 'var(--color-chart-3)' },
  ];
  const rascunhos = rows[0].value;

  return (
    <ChartPanel
      title="Campanhas"
      description={`${list.length} no total`}
      className={className}
      insight={
        query.isError || query.isLoading
          ? undefined
          : {
              tone: rascunhos > 0 ? 'attention' : 'neutral',
              text:
                rascunhos > 0
                  ? `${rascunhos} campanha(s) em rascunho sem envio.`
                  : 'Nenhuma campanha parada em rascunho.',
            }
      }
    >
      <PanelBody query={query}>
        <div className={chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={rows}
              margin={{ top: 2, right: 28, left: 2, bottom: 2 }}
              barSize={16}
            >
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={64}
                tick={{ fontSize: 11, fill: 'var(--color-fg-subtle)' }}
              />
              <Tooltip cursor={{ fill: 'var(--color-surface-muted)' }} contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={5}>
                {rows.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
                <LabelList dataKey="value" position="right" className="fill-fg text-[11px]" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </PanelBody>
    </ChartPanel>
  );
}

/* -------------------------------------------------------------------------- */
/* Catálogo de recompensas                                                   */
/* -------------------------------------------------------------------------- */

function RewardsPanel({ query, className }: { query: QueryLike<Recompensa[]>; className?: string }) {
  const list = query.data ?? [];
  const ativas = list.filter((r) => r.status === 'ativa').length;
  const inativas = list.length - ativas;
  const custoMedio = list.length
    ? Math.round(list.reduce((sum, r) => sum + r.custoPontos, 0) / list.length)
    : 0;
  const rows = [
    { name: 'Ativas', value: ativas, color: 'var(--color-chart-1)' },
    { name: 'Inativas', value: inativas, color: 'var(--color-chart-5)' },
  ];
  const ratioInativas = list.length ? inativas / list.length : 0;
  const tone = list.length === 0 || ratioInativas > 0.4 ? 'attention' : 'positive';
  const text =
    list.length === 0
      ? 'Sem recompensas — clientes não têm onde usar pontos.'
      : ratioInativas > 0.4
        ? `${inativas} de ${list.length} recompensas inativas.`
        : `${ativas} recompensa(s) ativa(s).`;

  return (
    <ChartPanel
      title="Recompensas"
      description={list.length ? `custo médio ${num.format(custoMedio)} pts` : 'sem itens'}
      className={className}
      insight={query.isError || query.isLoading ? undefined : { tone, text }}
    >
      <PanelBody query={query}>
        <div className={chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius="60%"
                outerRadius="92%"
                paddingAngle={2}
                stroke="var(--color-surface)"
                strokeWidth={2}
              >
                {rows.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-semibold tabular-nums text-fg">{list.length}</span>
            <span className="text-[10px] text-fg-subtle">itens</span>
          </div>
        </div>
        <ul className="mt-2 flex shrink-0 flex-wrap gap-x-4 gap-y-1">
          {rows.map((row) => (
            <li key={row.name} className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: row.color }}
                aria-hidden="true"
              />
              {row.name}
              <span className="font-medium text-fg">{row.value}</span>
            </li>
          ))}
        </ul>
      </PanelBody>
    </ChartPanel>
  );
}

/* -------------------------------------------------------------------------- */

function PanelBody<T>({ query, children }: { query: QueryLike<T>; children: ReactNode }) {
  if (query.isError) {
    return <ErrorState error={query.error} variant="inline" onRetry={() => query.refetch()} />;
  }
  if (query.isLoading) {
    return <Skeleton className="min-h-[168px] flex-1 lg:min-h-0" />;
  }
  return <>{children}</>;
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <Skeleton className="h-7 w-40" />
      <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px]" />
        ))}
      </div>
      <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:grid-rows-2">
        <Skeleton className="min-h-[220px] sm:col-span-2 lg:col-span-6 lg:row-span-2" />
        <Skeleton className="min-h-[220px] lg:col-span-3 lg:row-span-2" />
        <Skeleton className="min-h-[160px] lg:col-span-3" />
        <Skeleton className="min-h-[160px] lg:col-span-3" />
      </div>
    </div>
  );
}
