import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, PartyPopper, QrCode, Store, Ticket, Trophy, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { Button } from '../../components/ui/button';
import { Screen } from '../components/screen';
import { CodeSheet } from '../components/code-sheet';
import { InstallPrompt } from '../components/install-prompt';
import { ProgressRing } from '../components/progress-ring';
import { useClienteAuth } from '../context/cliente-auth';
import { useEmpresaAtual } from '../hooks/use-empresa';
import { portalApi } from '../services/portal';
import { getPendingResgate } from '../lib/pending-resgate';
import type { EmpresaVinculo } from '../../types/api';

const num = new Intl.NumberFormat('pt-BR');
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const UM_ANO = 365 * 24 * 60 * 60 * 1000;

function CodeButton({ onClick }: { onClick: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-semibold text-fg-onprimary shadow-sm transition-colors hover:bg-primary-hover active:bg-primary-active"
      >
        <QrCode className="size-5" />
        Mostrar meu código
      </button>
      <p className="mt-1.5 text-center text-[12px] text-fg-muted">
        Mostre no caixa para ganhar pontos
      </p>
    </div>
  );
}

/**
 * "+N pontos!" quando o saldo subiu desde a última vez que o cliente abriu o
 * app. Compara com o valor guardado em localStorage e o atualiza.
 */
function useCelebracao(empresaId: string | undefined, saldo: number | undefined) {
  const [ganho, setGanho] = useState<number | null>(null);
  const conferido = useRef<string | null>(null);

  useEffect(() => {
    if (!empresaId || saldo == null) return;
    const marca = `${empresaId}:${saldo}`;
    if (conferido.current === marca) return;
    conferido.current = marca;

    const key = `fidelidade_cliente_saldo_${empresaId}`;
    try {
      const anterior = Number(localStorage.getItem(key));
      // oxlint-disable-next-line react/set-state-in-effect
      setGanho(Number.isFinite(anterior) && saldo > anterior ? saldo - anterior : null);
      localStorage.setItem(key, String(saldo));
    } catch {
      /* storage indisponível */
    }
  }, [empresaId, saldo]);

  return { ganho, limpar: () => setGanho(null) };
}

function selos(empresa: EmpresaVinculo): string[] {
  const out: string[] = [];
  if (empresa.pontosAcumulados > 0) out.push('Primeira compra ✓');
  if (empresa.nivel.min > 0) out.push(`Nível ${empresa.nivel.nome}`);
  if (Date.now() - new Date(empresa.desde).getTime() > UM_ANO) out.push('1 ano de casa 🎂');
  return out.slice(0, 3);
}

export function CartaoPage() {
  const { cliente } = useClienteAuth();
  const [codeOpen, setCodeOpen] = useState(false);
  // Com o QR aberto no caixa, os pontos estão prestes a cair — busca mais
  // rápido para o "+N pontos!" surgir quase junto com a confirmação do balcão.
  const { empresa, semVinculo, isLoading, isError, refetch } = useEmpresaAtual({
    refetchInterval: codeOpen ? 4_000 : undefined,
  });
  const pendente = getPendingResgate();
  const primeiroNome = cliente?.nome?.split(' ')[0];
  const { ganho, limpar } = useCelebracao(empresa?.empresaId, empresa?.saldoPontos);

  const catalogo = useQuery({
    queryKey: ['cliente', 'catalogo', empresa?.empresaId],
    queryFn: () => portalApi.getCatalogo(empresa!.empresaId),
    enabled: Boolean(empresa),
    refetchOnWindowFocus: true,
    refetchInterval: codeOpen ? 4_000 : 25_000,
  });

  // Prêmio mais próximo que ele ainda não alcança (o "quase lá").
  const proximoPremio = useMemo<
    | { tipo: 'quase'; titulo: string; falta: number; pct: number }
    | { tipo: 'liberado'; resgataveis: number }
    | null
  >(() => {
    const recs = catalogo.data?.recompensas ?? [];
    const saldo = catalogo.data?.saldoPontos ?? empresa?.saldoPontos ?? 0;
    const faltando = recs
      .filter((r) => r.custoPontos > saldo)
      .sort((a, b) => a.custoPontos - b.custoPontos);
    const alvo = faltando[0];
    if (alvo) {
      return {
        tipo: 'quase',
        titulo: alvo.titulo,
        falta: alvo.custoPontos - saldo,
        pct: saldo / alvo.custoPontos,
      };
    }
    const resgataveis = recs.filter((r) => r.resgatavel).length;
    return resgataveis > 0 ? { tipo: 'liberado', resgataveis } : null;
  }, [catalogo.data, empresa?.saldoPontos]);

  let body: ReactNode;

  if (isLoading) {
    body = (
      <Screen>
        <div className="mt-20">
          <LoadingSpinner label="Carregando…" />
        </div>
      </Screen>
    );
  } else if (isError && !empresa) {
    body = (
      <Screen title="Cartão">
        <div className="mt-14 flex flex-col items-center gap-3 text-center">
          <p className="text-[15px] text-fg-muted">Não foi possível carregar seus dados.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar de novo
          </Button>
        </div>
      </Screen>
    );
  } else if (semVinculo || !empresa) {
    body = (
      <Screen title={primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-6 text-center">
            <Store className="size-9 text-fg-subtle" />
            <p className="text-[14px] leading-relaxed text-fg-muted">
              Sua conta está pronta! Na próxima compra, mostre seu código no caixa — a padaria te
              adiciona ao programa e seus pontos começam a contar.
            </p>
          </div>
          <CodeButton onClick={() => setCodeOpen(true)} />
        </div>
      </Screen>
    );
  } else {
    const conquistas = selos(empresa);
    const faltaNivel = empresa.proximoNivel
      ? Math.max(0, empresa.proximoNivel.min - empresa.pontosAcumulados)
      : 0;
    const pctNivel = empresa.proximoNivel
      ? (empresa.pontosAcumulados - empresa.nivel.min) /
        (empresa.proximoNivel.min - empresa.nivel.min)
      : 1;

    body = (
      <Screen title={primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}>
        <div className="flex flex-col gap-4">
          {ganho != null ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-success/40 bg-success-subtle px-3.5 py-2.5 motion-safe:animate-[pop-in_260ms_ease-out]">
              <PartyPopper className="size-5 shrink-0 text-success-fg" />
              <p className="flex-1 text-[14px] font-semibold text-success-fg">
                Você ganhou +{num.format(ganho)} pontos!
              </p>
              <button type="button" onClick={limpar} aria-label="Fechar" className="text-success-fg/70">
                <X className="size-4" />
              </button>
            </div>
          ) : null}

          {/* Cartão da marca */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 shadow-md"
            style={{
              color: 'var(--color-brand-contrast)',
              backgroundImage:
                'linear-gradient(145deg, var(--brand), color-mix(in srgb, var(--color-brand-2) 70%, var(--brand)))',
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-12 size-36 rounded-full"
              style={{ background: 'color-mix(in srgb, #fff 20%, transparent)' }}
            />
            <div className="relative flex items-center gap-2.5">
              {empresa.logoUrl ? (
                <img
                  src={empresa.logoUrl}
                  alt=""
                  className="size-9 rounded-lg bg-white/20 object-contain p-0.5"
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/20">
                  <Store className="size-5" />
                </span>
              )}
              <p className="min-w-0 flex-1 truncate text-[14px] font-semibold opacity-95">
                {empresa.nome}
              </p>
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
                <Trophy className="size-3" />
                {empresa.nivel.nome}
              </span>
            </div>

            <div className="relative mt-4">
              <p className="text-[11px] uppercase tracking-wide opacity-75">Seus pontos</p>
              <p className="text-[36px] font-bold leading-none tabular-nums">
                {num.format(empresa.saldoPontos)}
              </p>
            </div>

            {empresa.exibirTotalGasto ? (
              <p className="relative mt-2 text-[12px] opacity-80">
                Total em compras: {brl.format(empresa.totalGasto)}
              </p>
            ) : null}
          </div>

          <CodeButton onClick={() => setCodeOpen(true)} />

          {/* Progresso de nível */}
          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold text-fg">{empresa.nivel.nome}</span>
              <span className="text-fg-muted">
                {empresa.proximoNivel ? `Faltam ${num.format(faltaNivel)} pts` : 'Nível máximo 🏆'}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${Math.round(Math.max(0.04, Math.min(1, pctNivel)) * 100)}%` }}
              />
            </div>
            {empresa.proximoNivel ? (
              <p className="mt-1.5 text-[11px] text-fg-subtle">Próximo: {empresa.proximoNivel.nome}</p>
            ) : null}
          </div>

          {/* Próximo prêmio */}
          {proximoPremio ? (
            <Link
              to="/app/recompensas"
              className="flex items-center gap-3.5 rounded-xl border border-border bg-surface px-4 py-3"
            >
              {proximoPremio.tipo === 'quase' ? (
                <>
                  <ProgressRing value={proximoPremio.pct} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-fg">Quase lá!</p>
                    <p className="truncate text-[12px] text-fg-muted">
                      Faltam {num.format(proximoPremio.falta)} pts pro {proximoPremio.titulo}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-subtle-fg">
                    <Ticket className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-fg">
                      {proximoPremio.resgataveis} prêmio(s) liberado(s)!
                    </p>
                    <p className="text-[12px] text-fg-muted">Toque para resgatar</p>
                  </div>
                </>
              )}
              <ChevronRight className="size-4 shrink-0 text-fg-subtle" />
            </Link>
          ) : null}

          {/* Conquistas */}
          {conquistas.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {conquistas.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-fg-muted"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : null}

          {pendente ? (
            <Link
              to={`/app/resgate/${pendente.resgateId}`}
              className="flex items-center gap-3 rounded-xl border border-warning/50 bg-warning-subtle px-4 py-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning-fg">
                <Ticket className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold text-warning-fg">Resgate esperando</p>
                <p className="truncate text-[12px] text-warning-fg/80">
                  {pendente.recompensaTitulo} — toque para ver o código
                </p>
              </div>
              <ChevronRight className="size-4 text-warning-fg" />
            </Link>
          ) : null}

          <InstallPrompt />
        </div>
      </Screen>
    );
  }

  return (
    <>
      {body}
      <CodeSheet open={codeOpen} onClose={() => setCodeOpen(false)} nome={cliente?.nome} />
    </>
  );
}
