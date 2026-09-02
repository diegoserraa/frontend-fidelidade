import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Coins,
  Gift,
  IdCard,
  TriangleAlert,
  UserPlus,
  X,
} from 'lucide-react';
import { QrScanner } from '../components/shared/qr-scanner';
import { FormModal } from '../components/shared/form-modal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { useToast } from '../components/ui/toast';
import { useAuth } from '../context/auth-context';
import { cn } from '../lib/utils';
import { getErrorMessage } from '../lib/errors';
import {
  isValidCPF,
  maskCPF,
  maskCurrencyBRL,
  maskPhoneBR,
  onlyDigits,
  parseCurrencyBRL,
} from '../lib/masks';
import { fidelidadeApi } from '../services/fidelidade';
import type { IdentificacaoCliente, ResgateValidacao } from '../types/api';

const num = new Intl.NumberFormat('pt-BR');
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const buzz = (ms = 20) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* sem suporte */
  }
};

type Modo = 'pontuar' | 'resgatar';

export function BalcaoPage() {
  const [modo, setModo] = useState<Modo>('pontuar');
  const { user } = useAuth();

  return (
    <div className="flex min-h-full flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-semibold tracking-tight text-fg">Balcão</h1>
        {user?.nome ? (
          <span className="truncate text-xs text-fg-subtle">Operador: {user.nome}</span>
        ) : null}
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2">
        <ModoTab
          active={modo === 'pontuar'}
          icon={Coins}
          label="Pontuar compra"
          onClick={() => setModo('pontuar')}
        />
        <ModoTab
          active={modo === 'resgatar'}
          icon={Gift}
          label="Dar baixa"
          onClick={() => setModo('resgatar')}
        />
      </div>

      <div className="flex flex-1 flex-col items-center lg:min-h-0">
        <div className="flex w-full max-w-xl flex-1 flex-col overflow-y-auto rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          {modo === 'pontuar' ? <PontuarFlow key="pontuar" /> : <ResgatarFlow key="resgatar" />}
        </div>
      </div>
    </div>
  );
}

function ModoTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Coins;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        active
          ? 'border-primary bg-primary text-fg-onprimary shadow-xs'
          : 'border-border bg-surface text-fg-muted hover:bg-surface-muted',
      )}
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
}

/* ================================================================== */
/* Pontuar                                                             */
/* ================================================================== */

function PontuarFlow() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [step, setStep] = useState<'scan' | 'cliente' | 'sucesso'>('scan');
  const [entradaModo, setEntradaModo] = useState<'qr' | 'cpf'>('qr');
  const [cliente, setCliente] = useState<IdentificacaoCliente | null>(null);
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ pontos: number; saldo: number } | null>(null);
  const [cadastroOpen, setCadastroOpen] = useState(false);

  const reset = useCallback(() => {
    setStep('scan');
    setEntradaModo('qr');
    setCliente(null);
    setValor('');
    setErro(null);
    setResultado(null);
  }, []);

  const identificar = useMutation({
    mutationFn: (raw: string) => fidelidadeApi.identificarCliente(entrada(raw)),
    onSuccess: (data) => {
      buzz();
      setCliente(data);
      setValor('');
      setErro(null);
      setStep('cliente');
    },
    onError: (err) => setErro(getErrorMessage(err, 'Não foi possível identificar o cliente.')),
  });

  const registrar = useMutation({
    mutationFn: () =>
      fidelidadeApi.createCompra({
        clienteId: cliente!.clienteEmpresaId,
        valor: parseCurrencyBRL(valor),
      }),
    onSuccess: (compra) => {
      buzz(30);
      setResultado({
        pontos: compra.pontosGerados,
        saldo: (cliente?.saldoPontos ?? 0) + compra.pontosGerados,
      });
      setStep('sucesso');
      void queryClient.invalidateQueries({ queryKey: ['clientes'] });
      void queryClient.invalidateQueries({ queryKey: ['compras'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        'Compra registrada',
        `${brl.format(Number(compra.valor))} · +${num.format(compra.pontosGerados)} pts`,
      );
    },
    onError: (err) => setErro(getErrorMessage(err, 'Não foi possível registrar a compra.')),
  });

  const submitValor = () => {
    if (parseCurrencyBRL(valor) <= 0) return setErro('Informe um valor maior que zero.');
    setErro(null);
    registrar.mutate();
  };

  if (step === 'sucesso' && resultado) {
    return (
      <SuccessPanel
        tone="entrada"
        titulo="Pontos creditados"
        destaque={`+${num.format(resultado.pontos)} pts`}
        linha={`Saldo agora: ${num.format(resultado.saldo)} pts`}
        sub={cliente?.nome}
        onNova={reset}
      />
    );
  }

  if (step === 'cliente' && cliente) {
    return (
      <div className="flex flex-1 flex-col gap-5">
        <BackButton onClick={reset} />
        <ClienteResumo cliente={cliente} />

        <div>
          <label htmlFor="valor-compra" className="text-[13px] font-medium text-fg-muted">
            Valor da compra
          </label>
          <div className="relative mt-1.5">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-medium text-fg-subtle">
              R$
            </span>
            <input
              id="valor-compra"
              autoFocus
              inputMode="decimal"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(maskCurrencyBRL(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitValor();
              }}
              className="h-16 w-full rounded-xl border border-border-strong bg-surface pl-14 pr-4 text-3xl font-semibold tabular-nums text-fg outline-none focus-visible:border-primary"
            />
          </div>
        </div>

        {erro ? <ErroBox>{erro}</ErroBox> : null}

        <div className="mt-auto">
          <Button
            className="h-14 w-full text-base"
            disabled={registrar.isPending}
            onClick={submitValor}
          >
            {registrar.isPending ? 'Registrando…' : 'Registrar compra'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {identificar.isPending ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <LoadingSpinner label="Identificando cliente…" />
        </div>
      ) : entradaModo === 'qr' ? (
        <>
          <p className="text-center text-sm font-medium text-fg">
            Aponte a câmera para o QR do cliente
          </p>
          <QrScanner
            active
            onDetected={(raw) => {
              buzz();
              setErro(null);
              identificar.mutate(raw);
            }}
          />
        </>
      ) : (
        <CpfPanel
          pending={identificar.isPending}
          onBuscar={(cpf) => {
            buzz();
            setErro(null);
            identificar.mutate(cpf);
          }}
          onVoltar={() => setEntradaModo('qr')}
        />
      )}

      {erro ? <ErroBox>{erro}</ErroBox> : null}

      {!identificar.isPending ? (
        <div className="mt-auto grid gap-2 pt-1">
          <Button
            variant="outline"
            className="h-12"
            onClick={() => setEntradaModo((m) => (m === 'qr' ? 'cpf' : 'qr'))}
          >
            <IdCard className="size-4" />
            {entradaModo === 'qr' ? 'Sem o QR? Buscar por CPF' : 'Voltar a escanear'}
          </Button>
          <Button variant="ghost" className="h-12" onClick={() => setCadastroOpen(true)}>
            <UserPlus className="size-4" />
            Cadastrar cliente novo
          </Button>
        </div>
      ) : null}

      <CadastroBalcaoModal
        open={cadastroOpen}
        onOpenChange={setCadastroOpen}
        onCadastrado={(novo) => {
          setCadastroOpen(false);
          buzz();
          setCliente(novo);
          setValor('');
          setErro(null);
          setStep('cliente');
        }}
      />
    </div>
  );
}

/* ================================================================== */
/* Resgatar                                                            */
/* ================================================================== */

function ResgatarFlow() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [step, setStep] = useState<'scan' | 'validado' | 'sucesso'>('scan');
  const [validacao, setValidacao] = useState<ResgateValidacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ pontos: number; saldo: number } | null>(null);

  const reset = useCallback(() => {
    setStep('scan');
    setValidacao(null);
    setErro(null);
    setResultado(null);
  }, []);

  const validar = useMutation({
    mutationFn: (raw: string) => fidelidadeApi.validarResgate({ token: raw.trim() }),
    onSuccess: (data) => {
      buzz();
      setValidacao(data);
      setErro(null);
      setStep('validado');
    },
    onError: (err) => setErro(getErrorMessage(err, 'QR de resgate inválido ou expirado.')),
  });

  const confirmar = useMutation({
    mutationFn: () => fidelidadeApi.confirmarResgate(validacao!.resgateId),
    onSuccess: ({ novoSaldo }) => {
      buzz(30);
      setResultado({ pontos: validacao?.recompensa.custoPontos ?? 0, saldo: novoSaldo });
      setStep('sucesso');
      void queryClient.invalidateQueries({ queryKey: ['clientes'] });
      void queryClient.invalidateQueries({ queryKey: ['resgates'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Baixa confirmada', `${validacao?.recompensa.titulo ?? 'Resgate'} entregue.`);
    },
    onError: (err) => setErro(getErrorMessage(err, 'Não foi possível confirmar a baixa.')),
  });

  const recusar = useMutation({
    mutationFn: () => fidelidadeApi.recusarResgate(validacao!.resgateId),
    onSuccess: () => {
      toast.info('Resgate recusado');
      reset();
    },
    onError: (err) => setErro(getErrorMessage(err, 'Não foi possível recusar o resgate.')),
  });

  if (step === 'sucesso' && resultado) {
    return (
      <SuccessPanel
        tone="saida"
        titulo="Resgate entregue"
        destaque={`−${num.format(resultado.pontos)} pts`}
        linha={`Saldo agora: ${num.format(resultado.saldo)} pts`}
        sub={validacao?.cliente.nome}
        onNova={reset}
      />
    );
  }

  if (step === 'validado' && validacao) {
    return (
      <ResgateReview
        validacao={validacao}
        erro={erro}
        confirmando={confirmar.isPending}
        recusando={recusar.isPending}
        onConfirmar={() => {
          setErro(null);
          confirmar.mutate();
        }}
        onRecusar={() => {
          setErro(null);
          recusar.mutate();
        }}
        onVoltar={reset}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {validar.isPending ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <LoadingSpinner label="Validando resgate…" />
        </div>
      ) : (
        <>
          <p className="text-center text-sm font-medium text-fg">
            Aponte a câmera para o QR do resgate
          </p>
          <QrScanner
            active
            onDetected={(raw) => {
              buzz();
              setErro(null);
              validar.mutate(raw);
            }}
          />
        </>
      )}
      {erro ? <ErroBox>{erro}</ErroBox> : null}
    </div>
  );
}

function ResgateReview({
  validacao,
  erro,
  confirmando,
  recusando,
  onConfirmar,
  onRecusar,
  onVoltar,
}: {
  validacao: ResgateValidacao;
  erro: string | null;
  confirmando: boolean;
  recusando: boolean;
  onConfirmar: () => void;
  onRecusar: () => void;
  onVoltar: () => void;
}) {
  const restante = useCountdown(validacao.expiraEm);
  const expirado = validacao.status !== 'pendente' || restante <= 0;
  const podeConfirmar = !expirado && validacao.saldoSuficiente;

  const statusTexto =
    validacao.status === 'confirmado'
      ? 'Este resgate já foi confirmado.'
      : validacao.status === 'cancelado'
        ? 'Este resgate foi cancelado.'
        : restante <= 0 || validacao.status === 'expirado'
          ? 'O QR expirou. Peça para o cliente gerar outro no app.'
          : null;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <BackButton onClick={onVoltar} />

      <div className="flex items-center gap-3">
        <Initials name={validacao.cliente.nome} className="size-11 text-sm" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-fg">{validacao.cliente.nome}</p>
          <p className="text-xs text-fg-subtle">Saldo: {num.format(validacao.saldoPontos)} pts</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-subtle-fg">
            <Gift className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-medium text-fg">{validacao.recompensa.titulo}</p>
            <p className="text-sm font-semibold tabular-nums text-fg-muted">
              {num.format(validacao.recompensa.custoPontos)} pts
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold',
          validacao.saldoSuficiente
            ? 'bg-success-subtle text-success-fg'
            : 'bg-danger-subtle text-danger-fg',
        )}
      >
        {validacao.saldoSuficiente ? <Check className="size-4" /> : <TriangleAlert className="size-4" />}
        {validacao.saldoSuficiente ? 'Saldo suficiente' : 'Saldo insuficiente'}
        {!expirado && validacao.status === 'pendente' ? (
          <span className="ml-1 font-normal tabular-nums opacity-80">
            · expira em {formatMMSS(restante)}
          </span>
        ) : null}
      </div>

      {statusTexto ? <ErroBox tone="warning">{statusTexto}</ErroBox> : null}
      {erro ? <ErroBox>{erro}</ErroBox> : null}

      <div className="mt-auto flex flex-col gap-2">
        {validacao.status === 'pendente' && !expirado ? (
          <>
            <Button
              className="h-14 w-full text-base"
              disabled={!podeConfirmar || confirmando || recusando}
              onClick={onConfirmar}
            >
              {confirmando ? 'Confirmando…' : 'Confirmar entrega'}
            </Button>
            <Button
              variant="ghost"
              className="h-12 w-full text-danger-fg hover:bg-danger-subtle"
              disabled={recusando || confirmando}
              onClick={onRecusar}
            >
              <X className="size-4" />
              {recusando ? 'Recusando…' : 'Recusar'}
            </Button>
          </>
        ) : (
          <Button variant="outline" className="h-14 w-full text-base" onClick={onVoltar}>
            Nova leitura
          </Button>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Peças compartilhadas                                                */
/* ================================================================== */

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
    >
      <ArrowLeft className="size-4" />
      Voltar
    </button>
  );
}

function Initials({ name, className }: { name: string; className?: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const txt =
    parts.length === 0
      ? '?'
      : parts.length === 1
        ? parts[0].slice(0, 2)
        : parts[0][0] + parts[parts.length - 1][0];
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary-subtle font-semibold uppercase text-primary-subtle-fg',
        className,
      )}
    >
      {txt.toUpperCase()}
    </span>
  );
}

function ClienteResumo({ cliente }: { cliente: IdentificacaoCliente }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
      <div className="flex items-center gap-3">
        <Initials name={cliente.nome} className="size-12 text-base" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-fg">{cliente.nome}</p>
            {cliente.novoVinculo ? (
              <span className="rounded-md bg-info-subtle px-1.5 py-0.5 text-[11px] font-medium text-info-fg">
                novo cliente
              </span>
            ) : null}
          </div>
          <p className="text-xs text-fg-subtle">{cliente.cpfMascarado ?? 'CPF não informado'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] uppercase tracking-wide text-fg-subtle">Saldo</p>
          <p className="text-lg font-semibold tabular-nums text-fg">
            {num.format(cliente.saldoPontos)}
          </p>
        </div>
      </div>
    </div>
  );
}

function SuccessPanel({
  tone,
  titulo,
  destaque,
  linha,
  sub,
  onNova,
}: {
  tone: 'entrada' | 'saida';
  titulo: string;
  destaque: string;
  linha: string;
  sub?: string;
  onNova: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onNova, 8000);
    return () => clearTimeout(t);
  }, [onNova]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
      <span
        className={cn(
          'flex size-16 items-center justify-center rounded-full',
          tone === 'entrada'
            ? 'bg-success-subtle text-success-fg'
            : 'bg-primary-subtle text-primary-subtle-fg',
        )}
      >
        <Check className="size-8" />
      </span>
      <div>
        <p className="text-[13px] font-medium text-fg-muted">{titulo}</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-fg">{destaque}</p>
        <p className="mt-1.5 text-sm text-fg-muted">{linha}</p>
        {sub ? <p className="text-xs text-fg-subtle">{sub}</p> : null}
      </div>
      <div className="mt-2 w-full max-w-xs">
        <Button className="h-14 w-full text-base" onClick={onNova}>
          Próximo cliente
        </Button>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full bg-primary/50 motion-safe:animate-[shrink_8s_linear_forwards]" />
        </div>
      </div>
    </div>
  );
}

function ErroBox({ children, tone = 'danger' }: { children: ReactNode; tone?: 'danger' | 'warning' }) {
  return (
    <p
      role="alert"
      className={cn(
        'rounded-lg border px-3 py-2.5 text-[13px]',
        tone === 'danger'
          ? 'border-danger/30 bg-danger-subtle text-danger-fg'
          : 'border-warning/30 bg-warning-subtle text-warning-fg',
      )}
    >
      {children}
    </p>
  );
}

function CpfPanel({
  pending,
  onBuscar,
  onVoltar,
}: {
  pending: boolean;
  onBuscar: (cpf: string) => void;
  onVoltar: () => void;
}) {
  const [cpf, setCpf] = useState('');
  const ok = isValidCPF(cpf);

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="cpf-busca" className="text-[13px] font-medium text-fg-muted">
        CPF do cliente
      </label>
      <input
        id="cpf-busca"
        autoFocus
        inputMode="numeric"
        placeholder="000.000.000-00"
        value={cpf}
        maxLength={14}
        onChange={(e) => setCpf(maskCPF(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && ok) onBuscar(onlyDigits(cpf));
        }}
        className="h-16 w-full rounded-xl border border-border-strong bg-surface px-4 text-2xl font-semibold tabular-nums tracking-wide text-fg outline-none focus-visible:border-primary"
      />
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-12" onClick={onVoltar}>
          Escanear
        </Button>
        <Button className="h-12" disabled={!ok || pending} onClick={() => onBuscar(onlyDigits(cpf))}>
          {pending ? 'Buscando…' : 'Buscar'}
        </Button>
      </div>
    </div>
  );
}

function CadastroBalcaoModal({
  open,
  onOpenChange,
  onCadastrado,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCadastrado: (cliente: IdentificacaoCliente) => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({ nome: '', cpf: '', telefone: '' });
  const [erro, setErro] = useState<string | null>(null);

  const criar = useMutation({
    mutationFn: async () => {
      await fidelidadeApi.createCliente({
        nome: form.nome.trim(),
        cpf: onlyDigits(form.cpf),
        telefone: onlyDigits(form.telefone) || null,
      });
      return fidelidadeApi.identificarCliente({ cpf: onlyDigits(form.cpf) });
    },
    onSuccess: (ident) => {
      setForm({ nome: '', cpf: '', telefone: '' });
      setErro(null);
      toast.success('Cliente cadastrado', `${ident.nome} entrou na base.`);
      onCadastrado(ident);
    },
    onError: (err) => setErro(getErrorMessage(err, 'Não foi possível cadastrar o cliente.')),
  });

  const submit = () => {
    if (!form.nome.trim()) return setErro('Informe o nome do cliente.');
    if (!isValidCPF(form.cpf)) return setErro('CPF inválido.');
    const tel = onlyDigits(form.telefone);
    if (tel && (tel.length < 10 || tel.length > 11)) return setErro('Telefone incompleto.');
    setErro(null);
    criar.mutate();
  };

  return (
    <FormModal
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setForm({ nome: '', cpf: '', telefone: '' });
          setErro(null);
        }
      }}
      title="Cadastrar no balcão"
      description="O cliente é identificado por CPF. A senha do app ele cria depois."
      submitLabel={criar.isPending ? 'Cadastrando…' : 'Cadastrar e pontuar'}
      onSubmit={submit}
      disabled={criar.isPending}
      error={erro}
    >
      <div className="grid gap-3.5">
        <Input
          label="Nome"
          value={form.nome}
          onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))}
          placeholder="Nome completo"
          autoCapitalize="words"
        />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="CPF"
            value={form.cpf}
            onChange={(e) => setForm((c) => ({ ...c, cpf: maskCPF(e.target.value) }))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            maxLength={14}
          />
          <Input
            label="Telefone"
            hint="Opcional"
            value={form.telefone}
            onChange={(e) => setForm((c) => ({ ...c, telefone: maskPhoneBR(e.target.value) }))}
            placeholder="(11) 99999-9999"
            inputMode="numeric"
            maxLength={15}
          />
        </div>
      </div>
    </FormModal>
  );
}

/* ================================================================== */
/* helpers                                                             */
/* ================================================================== */

/**
 * Decide se o texto lido/colado é um token de identidade (JWT, 3 partes
 * separadas por ".") ou um CPF (11 dígitos). Na dúvida, envia como token e
 * deixa o backend validar.
 */
function entrada(raw: string): { token?: string; cpf?: string } {
  const texto = raw.trim();
  if (texto.split('.').length === 3) return { token: texto };
  const digits = onlyDigits(texto);
  if (digits.length === 11) return { cpf: digits };
  return { token: texto };
}

function formatMMSS(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function useCountdown(iso: string | null): number {
  const alvo = useMemo(() => (iso ? new Date(iso).getTime() : 0), [iso]);
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    if (!alvo) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [alvo]);

  return alvo ? (alvo - agora) / 1000 : 0;
}
