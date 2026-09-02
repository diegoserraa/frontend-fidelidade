import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Download, Gift, Printer, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { ErrorState } from '../components/shared/error-state';
import { PageHeader } from '../components/shared/page-header';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Segmented } from '../components/ui/segmented';
import { Skeleton } from '../components/ui/skeleton';
import { useToast } from '../components/ui/toast';
import { useBrandTheme } from '../hooks/use-theme';
import { cn } from '../lib/utils';
import { contrastRatio, normalizeHex, readableTextColor } from '../lib/color';
import { getErrorMessage } from '../lib/errors';
import { buildAppQrUrl, printQrWindow, qrDataUri, qrPngDataUri } from '../lib/qr';
import { fidelidadeApi } from '../services/fidelidade';
import type { Empresa, EmpresaConfig } from '../types/api';

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const LOGO_MAX = 600;

const DEFAULTS = {
  corPrimaria: '#059669',
  corSecundaria: '#f59e0b',
  corTexto: '#ffffff',
  corFundo: '#ffffff',
  logoUrl: '',
  exibirTotalGasto: true,
};

type BrandForm = typeof DEFAULTS;
type ScreenKey = 'cartao' | 'recompensas' | 'login';

function formFromConfig(config: EmpresaConfig): BrandForm {
  const primaria = config.cor_primaria || DEFAULTS.corPrimaria;
  return {
    corPrimaria: primaria,
    corSecundaria: config.cor_secundaria || DEFAULTS.corSecundaria,
    corTexto:
      config.cor_texto || readableTextColor(normalizeHex(primaria) ?? DEFAULTS.corPrimaria),
    corFundo: config.cor_fundo || DEFAULTS.corFundo,
    logoUrl: config.logo_url ?? '',
    exibirTotalGasto: config.exibir_total_gasto,
  };
}

function sameForm(a: BrandForm, b: BrandForm): boolean {
  return (
    a.corPrimaria === b.corPrimaria &&
    a.corSecundaria === b.corSecundaria &&
    a.corTexto === b.corTexto &&
    a.corFundo === b.corFundo &&
    a.logoUrl === b.logoUrl &&
    a.exibirTotalGasto === b.exibirTotalGasto
  );
}

export function ConfiguracoesPage() {
  const config = useQuery({
    queryKey: ['empresa-config'],
    queryFn: fidelidadeApi.getEmpresaConfig,
  });
  const empresa = useQuery({ queryKey: ['empresa'], queryFn: fidelidadeApi.getEmpresa });

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <PageHeader
        title="Personalização do app"
        description="Ajuste logo e cores e veja na hora como o programa aparece no celular do cliente."
      />

      {config.isError ? (
        <ErrorState error={config.error} onRetry={() => config.refetch()} />
      ) : config.isLoading || !config.data ? (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
          <Skeleton className="h-full" />
          <Skeleton className="mx-auto h-full w-[280px] rounded-[2.4rem]" />
        </div>
      ) : (
        <BrandingStudio
          key={config.data.empresa_id}
          config={config.data}
          empresaNome={empresa.data?.nome ?? 'Sua empresa'}
          empresaId={empresa.data?.id}
        />
      )}
    </div>
  );
}

function BrandingStudio({
  config,
  empresaNome,
  empresaId,
}: {
  config: EmpresaConfig;
  empresaNome: string;
  empresaId: Empresa['id'] | undefined;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { saveTheme } = useBrandTheme();

  const initial = useMemo(() => formFromConfig(config), [config]);

  const [form, setForm] = useState(initial);
  const [logoBroken, setLogoBroken] = useState(false);
  const [screen, setScreen] = useState<ScreenKey>('cartao');

  const patch = (next: Partial<BrandForm>) => setForm((current) => ({ ...current, ...next }));

  const valid = {
    primaria: HEX_RE.test(form.corPrimaria),
    secundaria: HEX_RE.test(form.corSecundaria),
    texto: HEX_RE.test(form.corTexto),
    fundo: HEX_RE.test(form.corFundo),
  };
  const allValid = valid.primaria && valid.secundaria && valid.texto && valid.fundo;
  const dirty = !sameForm(form, initial);
  const isDefault = sameForm(form, DEFAULTS);

  const primary = normalizeHex(form.corPrimaria) ?? DEFAULTS.corPrimaria;
  const secondary = normalizeHex(form.corSecundaria) ?? DEFAULTS.corSecundaria;
  const textColor = normalizeHex(form.corTexto) ?? DEFAULTS.corTexto;
  const background = normalizeHex(form.corFundo) ?? DEFAULTS.corFundo;
  const ratio = contrastRatio(primary, textColor);

  const save = useMutation({
    mutationFn: () =>
      fidelidadeApi.updateEmpresaConfig({
        cor_primaria: form.corPrimaria,
        cor_secundaria: form.corSecundaria,
        cor_texto: form.corTexto,
        cor_fundo: form.corFundo,
        logo_url: form.logoUrl.trim() || undefined,
        exibir_total_gasto: form.exibirTotalGasto,
      }),
    onSuccess: (updated) => {
      setForm(formFromConfig(updated));
      saveTheme({ primary: form.corPrimaria });
      queryClient.setQueryData(['empresa-config'], updated);
      toast.success('Personalização salva', 'É assim que os clientes vão ver o app.');
    },
    onError: (err) => toast.error('Não foi possível salvar', getErrorMessage(err)),
  });

  const showLogo = form.logoUrl.trim() !== '' && !logoBroken;

  return (
    <form
      className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,420px)_1fr]"
      onSubmit={(event) => {
        event.preventDefault();
        if (allValid && dirty) save.mutate();
      }}
      noValidate
    >
      {/* Editor */}
      <Card className="order-2 flex min-h-0 flex-col overflow-hidden lg:order-1">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          <Section title="Logo">
            <Input
              type="url"
              inputMode="url"
              maxLength={LOGO_MAX}
              value={form.logoUrl}
              onChange={(event) => {
                setLogoBroken(false);
                patch({ logoUrl: event.target.value });
              }}
              placeholder="https://…/logo.png"
              error={form.logoUrl.trim() !== '' && logoBroken}
              hint={
                form.logoUrl.trim() && logoBroken
                  ? 'Não foi possível carregar essa imagem — confira o link.'
                  : 'PNG ou SVG com fundo transparente funciona melhor.'
              }
            />
          </Section>

          <Section
            title="Cores"
            hint="Primária: botões e saldo · Secundária: selos · Texto: sobre a primária · Fundo: telas do app."
          >
            <div className="space-y-2.5">
              <ColorRow
                label="Primária"
                value={form.corPrimaria}
                onChange={(value) => patch({ corPrimaria: value })}
                invalid={!valid.primaria}
              />
              <ColorRow
                label="Secundária"
                value={form.corSecundaria}
                onChange={(value) => patch({ corSecundaria: value })}
                invalid={!valid.secundaria}
              />
              <ColorRow
                label="Texto"
                value={form.corTexto}
                onChange={(value) => patch({ corTexto: value })}
                invalid={!valid.texto}
                trailing={
                  <button
                    type="button"
                    onClick={() => patch({ corTexto: readableTextColor(primary) })}
                    className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                    title="Escolher automaticamente a melhor cor de texto"
                  >
                    <Wand2 className="size-3.5" />
                    Auto
                  </button>
                }
              />
              <ContrastHint ratio={ratio} />
              <ColorRow
                label="Fundo"
                value={form.corFundo}
                onChange={(value) => patch({ corFundo: value })}
                invalid={!valid.fundo}
              />
            </div>
          </Section>

          <Section title="Exibição">
            <label className="flex cursor-pointer items-start justify-between gap-4 text-sm">
              <span className="text-fg">
                Mostrar total gasto
                <span className="mt-0.5 block text-[12px] text-fg-muted">
                  Exibe quanto o cliente já gastou no cartão.
                </span>
              </span>
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 accent-primary"
                checked={form.exibirTotalGasto}
                onChange={(event) => patch({ exibirTotalGasto: event.target.checked })}
              />
            </label>
          </Section>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
          <Button type="submit" disabled={save.isPending || !allValid || !dirty}>
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isDefault}
            onClick={() => {
              setForm({ ...DEFAULTS });
              setLogoBroken(false);
            }}
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

      {/* Prévia + QR do balcão */}
      <div className="order-1 flex min-h-0 flex-1 flex-col items-center gap-4 lg:order-2 lg:flex-row lg:items-stretch lg:justify-center lg:gap-6">
        <div className="flex min-h-0 flex-col items-center gap-2.5">
          <Segmented
            aria-label="Tela da prévia"
            size="sm"
            value={screen}
            onChange={setScreen}
            options={[
              { value: 'cartao', label: 'Cartão' },
              { value: 'recompensas', label: 'Recompensas' },
              { value: 'login', label: 'Login' },
            ]}
          />
          <div className="flex min-h-0 w-full flex-1 items-center justify-center">
            <PhoneFrame background={background}>
              <AppScreen
                screen={screen}
                primary={primary}
                secondary={secondary}
                textColor={textColor}
                background={background}
                logo={showLogo ? form.logoUrl : null}
                onLogoError={() => setLogoBroken(true)}
                empresaNome={empresaNome}
                showSpend={form.exibirTotalGasto}
              />
            </PhoneFrame>
          </div>
          <p className="text-[11px] text-fg-subtle">Prévia em tempo real — não é o app final.</p>
        </div>

        <QrBalcaoCard empresaId={empresaId} empresaNome={empresaNome} />
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

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
    <section className="space-y-2">
      <div>
        <h3 className="text-[13px] font-semibold text-fg">{title}</h3>
        {hint ? <p className="text-[11px] leading-snug text-fg-subtle">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Slug simples só pro nome do arquivo baixado — sem acento/espaço/símbolo. */
function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'padaria'
  );
}

/**
 * Ao contrário do QR pessoal do cliente (renovado a cada ~90s, ver
 * `signIdentityToken`), este é fixo: só codifica a URL do app com o id da
 * empresa (`buildAppQrUrl`) — sem token, sem validade. Pode imprimir e
 * plastificar, o mesmo QR vale enquanto a empresa existir.
 */
function QrBalcaoCard({ empresaId, empresaNome }: { empresaId: string | undefined; empresaNome: string }) {
  const toast = useToast();
  const [baixando, setBaixando] = useState(false);

  const baixar = async (url: string) => {
    setBaixando(true);
    try {
      const png = await qrPngDataUri(url, 640);
      const a = document.createElement('a');
      a.href = png;
      a.download = `qr-balcao-${slugify(empresaNome)}.png`;
      a.click();
    } catch (err) {
      toast.error('Não foi possível gerar o QR', getErrorMessage(err));
    } finally {
      setBaixando(false);
    }
  };

  const imprimir = (preview: string) => {
    const abriu = printQrWindow(preview, empresaNome, 'Escaneie para entrar no programa de fidelidade');
    if (!abriu) {
      toast.error('Não foi possível abrir a janela de impressão', 'Seu navegador pode ter bloqueado o pop-up.');
    }
  };

  return (
    <Card className="flex w-full max-w-[280px] shrink-0 flex-col items-center gap-3 self-center p-4 text-center lg:w-[248px]">
      <div>
        <h3 className="text-[13px] font-semibold text-fg">QR do balcão</h3>
        <p className="mt-1 text-[11px] leading-snug text-fg-subtle">
          Fixo — não expira nem muda, diferente do código pessoal do cliente. Imprima e deixe no
          caixa: o cliente escaneia, cai no app e já entra no seu programa.
        </p>
      </div>

      {!empresaId ? (
        <div className="flex size-32 items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-fg-subtle">
          Carregando…
        </div>
      ) : (
        <QrBalcaoConteudo
          empresaId={empresaId}
          baixando={baixando}
          onImprimir={imprimir}
          onBaixar={baixar}
        />
      )}
    </Card>
  );
}

function QrBalcaoConteudo({
  empresaId,
  baixando,
  onImprimir,
  onBaixar,
}: {
  empresaId: string;
  baixando: boolean;
  onImprimir: (preview: string) => void;
  onBaixar: (url: string) => void;
}) {
  const url = buildAppQrUrl(empresaId);
  const preview = qrDataUri(url);

  return (
    <>
      <img src={preview} alt="" className="size-32 rounded-lg border border-border bg-white p-2" />
      <div className="flex w-full gap-1.5">
        <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => onImprimir(preview)}>
          <Printer className="size-3.5" />
          Imprimir
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onBaixar(url)}
          disabled={baixando}
        >
          <Download className="size-3.5" />
          {baixando ? '…' : 'PNG'}
        </Button>
      </div>
    </>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  invalid,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[74px] shrink-0 text-[13px] font-medium text-fg">{label}</span>
      <input
        type="color"
        aria-label={`${label} — seletor de cor`}
        value={normalizeHex(value) ?? '#000000'}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-10 shrink-0 cursor-pointer rounded-md border border-border-strong bg-surface p-1"
      />
      <input
        aria-label={`${label} — hexadecimal`}
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="#000000"
        spellCheck={false}
        autoComplete="off"
        maxLength={7}
        className={cn(
          'h-9 min-w-0 flex-1 rounded-md border bg-surface px-2.5 font-mono text-[13px] uppercase text-fg outline-none transition-colors',
          'focus-visible:border-primary placeholder:font-sans placeholder:normal-case placeholder:text-fg-subtle',
          invalid ? 'border-danger' : 'border-border-strong',
        )}
      />
      {trailing}
    </div>
  );
}

function ContrastHint({ ratio }: { ratio: number }) {
  const level =
    ratio >= 4.5
      ? { text: 'Contraste ótimo', tone: 'text-success-fg', dot: 'bg-success' }
      : ratio >= 3
        ? { text: 'Contraste aceitável', tone: 'text-warning-fg', dot: 'bg-warning' }
        : {
            text: 'Contraste baixo — texto pode ficar ilegível',
            tone: 'text-danger-fg',
            dot: 'bg-danger',
          };

  return (
    <p className={cn('flex items-center gap-1.5 pt-0.5 text-[12px]', level.tone)}>
      <span className={cn('size-1.5 rounded-full', level.dot)} />
      {level.text} · {ratio.toFixed(1)}:1
    </p>
  );
}

/* --------------------------- Mockup do celular --------------------------- */

function PhoneFrame({
  background,
  children,
}: {
  background: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-[232px] shrink-0 rounded-[2.4rem] border-[8px] border-fg bg-fg shadow-[0_28px_55px_-22px_rgb(24_24_27/0.45)] sm:w-[248px] lg:h-full lg:max-h-[560px] lg:w-auto">
      <div
        className="relative aspect-[9/19.3] overflow-hidden rounded-[1.9rem] lg:h-full"
        style={{ background }}
      >
        <div className="absolute left-1/2 top-2 z-20 h-[17px] w-[70px] -translate-x-1/2 rounded-full bg-fg" />
        <StatusBar />
        <div className="h-[calc(100%-26px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[10px] font-semibold opacity-50">
      <span>9:41</span>
      <span className="tracking-tighter">5G ▮▮▮</span>
    </div>
  );
}

type Palette = {
  primary: string;
  textColor: string;
  primarySoft: string;
  primaryText: string;
  secondarySoft: string;
  secondaryText: string;
  onBg: string;
  onBgMuted: string;
};

function LogoMark({
  logo,
  onLogoError,
  empresaNome,
  palette,
  size,
}: {
  logo: string | null;
  onLogoError: () => void;
  empresaNome: string;
  palette: Palette;
  size: 'sm' | 'lg';
}) {
  if (logo) {
    return (
      <img
        key={logo}
        src={logo}
        alt={empresaNome}
        onError={onLogoError}
        className={cn('rounded-md object-contain', size === 'lg' ? 'h-14 w-14' : 'h-6 w-6')}
      />
    );
  }
  return (
    <span
      className={cn(
        'grid place-items-center rounded-md font-bold',
        size === 'lg' ? 'size-14 rounded-2xl text-xl' : 'size-6 text-[11px]',
      )}
      style={{ background: palette.primary, color: palette.textColor }}
    >
      {empresaNome.charAt(0).toUpperCase()}
    </span>
  );
}

function AppBar({
  logo,
  onLogoError,
  empresaNome,
  palette,
}: {
  logo: string | null;
  onLogoError: () => void;
  empresaNome: string;
  palette: Palette;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <LogoMark
        logo={logo}
        onLogoError={onLogoError}
        empresaNome={empresaNome}
        palette={palette}
        size="sm"
      />
      <span className="truncate text-[13px] font-semibold" style={{ color: palette.onBg }}>
        {empresaNome}
      </span>
      <Bell className="ml-auto size-4" style={{ color: palette.onBgMuted }} />
    </div>
  );
}

function RewardItem({
  title,
  cost,
  ready,
  palette,
}: {
  title: string;
  cost: string;
  ready?: boolean;
  palette: Palette;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-black/5 bg-white p-2.5">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-lg"
        style={{ background: palette.secondarySoft, color: palette.secondaryText }}
      >
        <Gift className="size-4" />
      </span>
      <span className="min-w-0 truncate text-[12px] font-medium text-fg">{title}</span>
      {ready ? (
        <span
          className="ml-auto shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold"
          style={{ background: palette.primary, color: palette.textColor }}
        >
          Resgatar
        </span>
      ) : (
        <span
          className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
          style={{ background: palette.primarySoft, color: palette.primaryText }}
        >
          {cost}
        </span>
      )}
    </div>
  );
}

function SectionLabel({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
      {children}
    </p>
  );
}

function AppScreen({
  screen,
  primary,
  secondary,
  textColor,
  background,
  logo,
  onLogoError,
  empresaNome,
  showSpend,
}: {
  screen: ScreenKey;
  primary: string;
  secondary: string;
  textColor: string;
  background: string;
  logo: string | null;
  onLogoError: () => void;
  empresaNome: string;
  showSpend: boolean;
}) {
  const onBg = readableTextColor(background);
  const palette: Palette = {
    primary,
    textColor,
    primarySoft: `color-mix(in srgb, ${primary} 12%, #fff)`,
    primaryText: `color-mix(in srgb, ${primary} 82%, #000)`,
    secondarySoft: `color-mix(in srgb, ${secondary} 14%, #fff)`,
    secondaryText: `color-mix(in srgb, ${secondary} 78%, #000)`,
    onBg,
    onBgMuted: `color-mix(in srgb, ${onBg} 55%, ${background})`,
  };

  const bar = (
    <AppBar logo={logo} onLogoError={onLogoError} empresaNome={empresaNome} palette={palette} />
  );

  if (screen === 'login') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-5 text-center">
        <LogoMark
          logo={logo}
          onLogoError={onLogoError}
          empresaNome={empresaNome}
          palette={palette}
          size="lg"
        />
        <div>
          <p className="text-base font-semibold" style={{ color: palette.onBg }}>
            {empresaNome}
          </p>
          <p className="mt-1 text-[12px]" style={{ color: palette.onBgMuted }}>
            Entre para acompanhar seus pontos.
          </p>
        </div>

        <div className="w-full space-y-2 rounded-2xl border border-black/5 bg-white p-3.5 text-left shadow-sm">
          <MockField label="E-mail" placeholder="voce@email.com" />
          <MockField label="Senha" placeholder="••••••••" />
          <div
            className="mt-1 rounded-xl py-2.5 text-center text-[13px] font-semibold"
            style={{ background: primary, color: textColor }}
          >
            Entrar
          </div>
          <p
            className="pt-0.5 text-center text-[11px] font-medium"
            style={{ color: palette.primaryText }}
          >
            Esqueci minha senha
          </p>
        </div>

        <p className="text-[11px]" style={{ color: palette.onBgMuted }}>
          Novo por aqui? <span className="font-semibold">Criar conta</span>
        </p>
      </div>
    );
  }

  if (screen === 'recompensas') {
    return (
      <div>
        {bar}
        <div className="px-4">
          <SectionLabel color={palette.onBgMuted}>Recompensas</SectionLabel>
          <div className="mt-2 space-y-2">
            <RewardItem title="Café grátis" cost="120 pts" ready palette={palette} />
            <RewardItem title="Desconto de 10%" cost="300 pts" palette={palette} />
            <RewardItem title="Sobremesa cortesia" cost="450 pts" palette={palette} />
            <RewardItem title="Combo do dia" cost="600 pts" palette={palette} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {bar}
      <div
        className="mx-4 rounded-2xl p-4"
        style={{
          background: `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 72%, #000))`,
          color: textColor,
        }}
      >
        <div className="flex items-center justify-between text-[10px] font-medium opacity-80">
          <span>CARTÃO FIDELIDADE</span>
          <span>Prata</span>
        </div>
        <div className="mt-3 text-[26px] font-bold leading-none">
          1.240 <span className="text-sm font-medium opacity-80">pts</span>
        </div>
        <div className="mt-1 text-[11px] opacity-80">Ana Souza</div>
        {showSpend ? (
          <div className="mt-3 border-t border-current/20 pt-2 text-[11px] opacity-90">
            Total gasto <span className="font-semibold">R$ 842,00</span>
          </div>
        ) : null}
      </div>

      <div className="px-4 pt-3.5">
        <div
          className="rounded-xl py-2.5 text-center text-[13px] font-semibold"
          style={{ background: primary, color: textColor }}
        >
          Ver recompensas
        </div>
      </div>

      <div className="px-4 pt-4">
        <SectionLabel color={palette.onBgMuted}>Perto de resgatar</SectionLabel>
        <div className="mt-2 space-y-2">
          <RewardItem title="Café grátis" cost="120 pts" palette={palette} />
          <RewardItem title="Desconto de 10%" cost="300 pts" palette={palette} />
        </div>
      </div>

      <div
        className="mt-4 flex items-center justify-center gap-1.5 pb-4 text-[10px]"
        style={{ color: palette.onBgMuted }}
      >
        <Sparkles className="size-3" />
        Programa de {empresaNome}
      </div>
    </div>
  );
}

function MockField({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium text-fg-muted">{label}</p>
      <div className="rounded-lg border border-border bg-surface-muted/50 px-2.5 py-2 text-[11px] text-fg-subtle">
        {placeholder}
      </div>
    </div>
  );
}
