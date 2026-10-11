import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Croissant } from 'lucide-react';
import { ApiError } from '../../lib/api';
import { getErrorMessage } from '../../lib/errors';
import { isValidCPF, maskCPF, maskPhoneBR, onlyDigits } from '../../lib/masks';
import { cn } from '../../lib/utils';
import { Field, PasswordField } from '../components/field';
import { InstallPrompt } from '../components/install-prompt';
import { useClienteAuth } from '../context/cliente-auth';
import { appPath } from '../lib/config';
import { portalApi } from '../services/portal';

type Modo = 'entrar' | 'criar' | 'recuperar';

export function ClienteLoginPage() {
  const { entrar, criarConta } = useClienteAuth();
  const [modo, setModo] = useState<Modo>('entrar');
  const [form, setForm] = useState({ nome: '', cpf: '', telefone: '', email: '', senha: '' });
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Avisa JÁ na tela de cadastro se esse CPF tem conta — em vez de só depois
  // de tentar enviar o formulário e levar um 409 (ver onError do submit
  // abaixo, que continua existindo como rede de segurança pra quem digita
  // rápido e envia antes dessa checagem terminar). Debounce pra não disparar
  // uma requisição a cada tecla; nunca revela o nome do dono, só "existe".
  const cpfDigitado = onlyDigits(form.cpf);
  const [cpfParaChecar, setCpfParaChecar] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setCpfParaChecar(cpfDigitado), 500);
    return () => clearTimeout(t);
  }, [cpfDigitado]);
  const cpfExiste = useQuery({
    queryKey: ['cliente', 'cpf-existe', cpfParaChecar],
    queryFn: () => portalApi.cpfExiste(cpfParaChecar),
    enabled: modo === 'criar' && isValidCPF(cpfParaChecar),
    staleTime: 60_000,
  });

  const submit = useMutation({
    mutationFn: () =>
      modo === 'entrar'
        ? entrar({ cpf: onlyDigits(form.cpf), senha: form.senha })
        : criarConta({
            nome: form.nome.trim(),
            cpf: onlyDigits(form.cpf),
            senha: form.senha,
            telefone: onlyDigits(form.telefone) || undefined,
            email: form.email.trim() || undefined,
            aceitouPrivacidade,
          }),
    onError: (err) => {
      // Cadastro é global por CPF (a mesma conta serve pra qualquer padaria,
      // ver clienteAuth.service.ts) — quem tenta "criar conta" de novo com um
      // CPF já cadastrado só precisa entrar, não criar outra. Troca pro modo
      // "Entrar" sozinho em vez de deixar a pessoa quicar num erro sem saída.
      if (modo === 'criar' && err instanceof ApiError && err.status === 409) {
        setModo('entrar');
        setErro('Você já tem uma conta com esse CPF — falta só sua senha.');
        return;
      }
      setErro(getErrorMessage(err, 'Não foi possível continuar.'));
    },
  });

  const handle = () => {
    setErro(null);
    if (modo === 'criar' && form.nome.trim().length < 2) return setErro('Escreva o seu nome.');
    if (!isValidCPF(form.cpf)) return setErro('Confira o número do CPF.');
    if (modo === 'criar') {
      const tel = onlyDigits(form.telefone);
      if (tel && (tel.length < 10 || tel.length > 11)) return setErro('Telefone incompleto.');
      const email = form.email.trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErro('Confira o e-mail.');
    }
    // Cadastro exige senha mais forte (8+); login só confere o mínimo antigo
    // pra não bloquear quem já tem conta com senha de 6-7 caracteres.
    const minimo = modo === 'criar' ? 8 : 6;
    if (form.senha.length < minimo) {
      return setErro(`A senha precisa ter pelo menos ${minimo} caracteres.`);
    }
    if (modo === 'criar' && !aceitouPrivacidade) {
      return setErro('Para criar sua conta, aceite a política de privacidade.');
    }
    submit.mutate();
  };

  const trocar = (m: Modo) => {
    setModo(m);
    setErro(null);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-canvas">
      {/* respingo de cor no topo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--brand) 22%, transparent), transparent 70%)',
        }}
      />

      <div
        className="relative flex flex-1 flex-col px-6 pb-8"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' }}
      >
        <div className="text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-fg-onprimary shadow-md">
            <Croissant className="size-7" />
          </span>
          <h1 className="mt-4 text-[21px] font-bold tracking-tight text-fg">
            {modo === 'entrar'
              ? 'Bem-vindo de volta'
              : modo === 'criar'
                ? 'Vamos criar sua conta'
                : 'Recuperar senha'}
          </h1>
          <p className="mx-auto mt-1 max-w-[18rem] text-[13px] leading-relaxed text-fg-muted">
            {modo === 'entrar'
              ? 'Entre para ver seus pontos e prêmios.'
              : modo === 'criar'
                ? 'É rápido. Você já começa a juntar pontos na próxima compra.'
                : 'Informe seu CPF e mandamos um link para o seu e-mail cadastrado.'}
          </p>
        </div>

        {modo === 'recuperar' ? (
          <RecuperarSenhaForm onVoltar={() => trocar('entrar')} cpfInicial={form.cpf} />
        ) : (
          <>
            {/* alternador */}
            <div className="mx-auto mt-6 grid w-full max-w-sm grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1">
              {(['entrar', 'criar'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => trocar(m)}
                  className={cn(
                    'h-10 rounded-lg text-[14px] font-semibold transition-colors',
                    modo === m ? 'bg-primary text-fg-onprimary' : 'text-fg-muted',
                  )}
                >
                  {m === 'entrar' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>

            <form
          className="mx-auto mt-5 flex w-full max-w-sm flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            handle();
          }}
          noValidate
        >
          {modo === 'criar' ? (
            <Field
              label="Seu nome"
              value={form.nome}
              onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))}
              placeholder="Como podemos te chamar?"
              autoCapitalize="words"
              autoComplete="name"
            />
          ) : null}

          <Field
            label="CPF"
            value={form.cpf}
            onChange={(e) => setForm((c) => ({ ...c, cpf: maskCPF(e.target.value) }))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            maxLength={14}
            autoComplete="username"
          />

          {modo === 'criar' && cpfExiste.data?.existe ? (
            <p className="-mt-2 text-[13px] text-primary-subtle-fg">
              Esse CPF já tem conta. Digite sua senha em{' '}
              <button
                type="button"
                onClick={() => trocar('entrar')}
                className="font-semibold underline underline-offset-2"
              >
                Entrar
              </button>
              , ou toque em{' '}
              <button
                type="button"
                onClick={() => trocar('recuperar')}
                className="font-semibold underline underline-offset-2"
              >
                Esqueci minha senha
              </button>{' '}
              se não lembrar.
            </p>
          ) : null}

          {modo === 'criar' ? (
            <Field
              label="Celular"
              hint="Opcional — para avisos de promoções"
              value={form.telefone}
              onChange={(e) => setForm((c) => ({ ...c, telefone: maskPhoneBR(e.target.value) }))}
              placeholder="(11) 99999-9999"
              inputMode="numeric"
              maxLength={15}
              autoComplete="tel"
            />
          ) : null}

          {modo === 'criar' ? (
            <Field
              label="E-mail"
              hint="Opcional — usamos só para o caso de você esquecer a senha"
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              placeholder="seu@email.com"
              type="email"
              inputMode="email"
              autoComplete="email"
            />
          ) : null}

          <PasswordField
            label="Senha"
            hint={modo === 'criar' ? 'Pelo menos 8 caracteres' : undefined}
            value={form.senha}
            onChange={(e) => setForm((c) => ({ ...c, senha: e.target.value }))}
            placeholder={modo === 'criar' ? 'Crie uma senha' : 'Digite sua senha'}
            autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
          />

          {modo === 'entrar' ? (
            <button
              type="button"
              onClick={() => trocar('recuperar')}
              className="-mt-1 self-end text-[13px] font-semibold text-primary"
            >
              Esqueci minha senha
            </button>
          ) : null}

          {modo === 'criar' ? (
            <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-fg-muted">
              <input
                type="checkbox"
                checked={aceitouPrivacidade}
                onChange={(e) => setAceitouPrivacidade(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-(--brand)"
              />
              <span>
                Li e aceito a{' '}
                <Link to={appPath('privacidade')} className="font-semibold underline underline-offset-2">
                  política de privacidade
                </Link>
                .
              </span>
            </label>
          ) : null}

          {erro ? (
            <p
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-subtle px-3.5 py-2.5 text-[13px] font-medium text-danger-fg"
            >
              {erro}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submit.isPending}
            className="mt-1 h-12 w-full rounded-xl bg-primary text-[15px] font-bold text-fg-onprimary shadow-sm transition-colors hover:bg-primary-hover active:bg-primary-active disabled:opacity-60"
          >
            {submit.isPending ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar minha conta'}
          </button>
            </form>
          </>
        )}

        <div className="mx-auto mt-4 w-full max-w-sm">
          <InstallPrompt />
        </div>

        <p className="mx-auto mt-auto max-w-sm pt-8 text-center text-[12px] leading-relaxed text-fg-subtle">
          Ao continuar, você concorda que usamos seu nome e CPF para identificar sua conta e seus
          pontos. Veja a{' '}
          <Link to={appPath('privacidade')} className="underline underline-offset-2">
            política de privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function RecuperarSenhaForm({ onVoltar, cpfInicial }: { onVoltar: () => void; cpfInicial?: string }) {
  const [cpf, setCpf] = useState(cpfInicial ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const submit = useMutation({
    mutationFn: () => portalApi.esqueciSenha(onlyDigits(cpf)),
    onSuccess: () => setEnviado(true),
    onError: (err) => setErro(getErrorMessage(err, 'Não foi possível continuar.')),
  });

  if (enviado) {
    return (
      <div className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-3.5 text-center">
        <p className="rounded-lg border border-border bg-surface px-3.5 py-3 text-[14px] leading-relaxed text-fg">
          Se encontrarmos uma conta com e-mail cadastrado para esse CPF, você vai receber um link
          para redefinir a senha em instantes.
        </p>
        <button
          type="button"
          onClick={onVoltar}
          className="text-[14px] font-semibold text-primary"
        >
          Voltar para o login
        </button>
      </div>
    );
  }

  return (
    <form
      className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        setErro(null);
        if (!isValidCPF(cpf)) return setErro('Confira o número do CPF.');
        submit.mutate();
      }}
      noValidate
    >
      <Field
        label="CPF"
        value={cpf}
        onChange={(e) => setCpf(maskCPF(e.target.value))}
        placeholder="000.000.000-00"
        inputMode="numeric"
        maxLength={14}
        autoComplete="username"
        autoFocus
      />

      {erro ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-subtle px-3.5 py-2.5 text-[13px] font-medium text-danger-fg"
        >
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submit.isPending}
        className="mt-1 h-12 w-full rounded-xl bg-primary text-[15px] font-bold text-fg-onprimary shadow-sm transition-colors hover:bg-primary-hover active:bg-primary-active disabled:opacity-60"
      >
        {submit.isPending ? 'Aguarde…' : 'Enviar link de recuperação'}
      </button>

      <button type="button" onClick={onVoltar} className="text-[14px] font-semibold text-fg-muted">
        Voltar para o login
      </button>
    </form>
  );
}
