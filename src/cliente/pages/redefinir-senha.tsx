import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Croissant } from 'lucide-react';
import { getErrorMessage } from '../../lib/errors';
import { PasswordField } from '../components/field';
import { hideSplash } from '../lib/splash';
import { useClienteAuth } from '../context/cliente-auth';
import { useEmpresaTemaPublico } from '../hooks/use-empresa-tema-publico';

/** Rota fora do "gate" de autenticação (ver ClienteApp.tsx) — precisa
 *  funcionar tanto pra quem clicou no link deslogado quanto logado. */
export function RedefinirSenhaPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { redefinirSenha } = useClienteAuth();
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  // Fora do Gate, então precisa pintar a tela com a marca da padaria por
  // conta própria — sem isso, fica no verde padrão do CSS (ver Gate em
  // ClienteApp.tsx, que faz isso mesmo antes do login).
  useEmpresaTemaPublico(true);

  // A splash estática de index.html só é escondida pelo Gate normalmente —
  // essa rota não passa por ele, então precisa esconder por conta própria.
  useEffect(() => {
    hideSplash();
  }, []);

  const submit = useMutation({
    mutationFn: () => redefinirSenha({ token, novaSenha: senha }),
    onSuccess: () => navigate('/app', { replace: true }),
    onError: (err) => setErro(getErrorMessage(err, 'Não foi possível redefinir a senha.')),
  });

  const handle = () => {
    setErro(null);
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.');
    if (senha !== confirmar) return setErro('As senhas não coincidem.');
    submit.mutate();
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-canvas">
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
          <h1 className="mt-4 text-[21px] font-bold tracking-tight text-fg">Criar nova senha</h1>
          <p className="mx-auto mt-1 max-w-[18rem] text-[13px] leading-relaxed text-fg-muted">
            Escolha uma nova senha para a sua conta.
          </p>
        </div>

        {!token ? (
          <div className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-3.5 text-center">
            <p className="rounded-lg border border-danger/30 bg-danger-subtle px-3.5 py-3 text-[14px] leading-relaxed text-danger-fg">
              Link inválido. Solicite a recuperação de senha novamente na tela de login.
            </p>
            <button
              type="button"
              onClick={() => navigate('/app', { replace: true })}
              className="text-[14px] font-semibold text-primary"
            >
              Voltar para o login
            </button>
          </div>
        ) : (
          <form
            className="mx-auto mt-6 flex w-full max-w-sm flex-col gap-3.5"
            onSubmit={(e) => {
              e.preventDefault();
              handle();
            }}
            noValidate
          >
            <PasswordField
              label="Nova senha"
              hint="Pelo menos 8 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Crie uma senha"
              autoComplete="new-password"
              autoFocus
            />

            <PasswordField
              label="Confirmar nova senha"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Digite a senha de novo"
              autoComplete="new-password"
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
              {submit.isPending ? 'Aguarde…' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
