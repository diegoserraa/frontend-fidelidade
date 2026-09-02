import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { PasswordInput } from '../components/ui/password-input';
import { getErrorMessage } from '../lib/errors';

/** Formata dígitos como CNPJ (00.000.000/0001-00) e descarta qualquer não-dígito. */
function maskCnpj(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += `.${d.slice(2, 5)}`;
  if (d.length > 5) out += `.${d.slice(5, 8)}`;
  if (d.length > 8) out += `/${d.slice(8, 12)}`;
  if (d.length > 12) out += `-${d.slice(12, 14)}`;
  return out;
}

const highlights = [
  'Clientes, compras, pontos e recompensas em um só lugar',
  'Campanhas para reengajar quem parou de comprar',
  'Indicadores do programa sempre atualizados',
];

// Fundo claro com leve profundidade — brilho suave na cor da marca + degradê.
const pageBackground: CSSProperties = {
  backgroundImage: `
    radial-gradient(38rem 26rem at 50% -10%, color-mix(in srgb, var(--brand) 10%, transparent), transparent 70%),
    linear-gradient(180deg, #ffffff 0%, #f6faf8 100%)
  `,
};

const brandBackground: CSSProperties = {
  backgroundImage: `
    radial-gradient(46rem 30rem at 12% 0%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 68%),
    radial-gradient(40rem 40rem at 108% 112%, color-mix(in srgb, var(--brand) 12%, transparent), transparent 66%),
    linear-gradient(165deg, #ffffff 0%, color-mix(in srgb, var(--brand) 5%, #ffffff) 100%)
  `,
};

// Textura de grade discreta, apenas no painel da marca.
const gridOverlay: CSSProperties = {
  backgroundImage: `
    linear-gradient(color-mix(in srgb, var(--color-fg) 5%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--color-fg) 5%, transparent) 1px, transparent 1px)
  `,
  backgroundSize: '44px 44px',
  maskImage: 'radial-gradient(60rem 40rem at 30% 20%, #000 0%, transparent 75%)',
};

export function LoginPage() {
  const [form, setForm] = useState({ cnpj: '', email: '', senha: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      // A máscara é só visual — a API recebe o CNPJ apenas com dígitos.
      await login({ ...form, cnpj: form.cnpj.replace(/\D/g, '') });
      navigate('/', { replace: true });
    } catch (submitError) {
      setError(
        getErrorMessage(submitError, 'Não foi possível entrar. Verifique os dados e tente novamente.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]" style={pageBackground}>
      {/* Painel da marca — apenas em telas grandes */}
      <aside
        className="relative hidden flex-col justify-between overflow-hidden border-r border-border p-10 xl:p-14 lg:flex"
        style={brandBackground}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={gridOverlay} />

        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-fg-onprimary shadow-sm">
            <ShieldCheck className="size-5" />
          </span>
          <span className="text-base font-semibold tracking-tight text-fg">Fideliza+</span>
        </div>

        <div className="relative max-w-md space-y-7">
          <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-fg xl:text-[2.25rem]">
            O programa de fidelidade da sua operação, organizado.
          </h1>
          <ul className="space-y-3.5">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] leading-relaxed text-fg-muted">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-subtle-fg">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-[13px] text-fg-subtle">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          Acesso restrito à equipe da empresa.
        </div>
      </aside>

      {/* Formulário */}
      <main className="flex items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-fg-onprimary shadow-sm">
              <ShieldCheck className="size-5" />
            </span>
            <span className="text-base font-semibold tracking-tight text-fg">Fideliza+</span>
          </div>

          <div className="rounded-2xl border border-border bg-surface/80 p-6 shadow-lg backdrop-blur-sm sm:p-8">
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight text-fg">Entrar no painel</h2>
              <p className="text-[13px] text-fg-muted">
                Use as credenciais fornecidas pela sua empresa.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              aria-busy={isSubmitting}
              className="mt-6 space-y-4"
            >
              <Input
                label="CNPJ da empresa"
                value={form.cnpj}
                onChange={(event) =>
                  setForm((current) => ({ ...current, cnpj: maskCnpj(event.target.value) }))
                }
                placeholder="00.000.000/0001-00"
                autoComplete="organization"
                inputMode="numeric"
                maxLength={18}
                autoFocus
                required
              />
              <Input
                label="E-mail"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="voce@empresa.com"
                autoComplete="email"
                required
              />
              <PasswordInput
                label="Senha"
                value={form.senha}
                onChange={(event) => setForm((current) => ({ ...current, senha: event.target.value }))}
                placeholder="Sua senha"
                autoComplete="current-password"
                required
              />

              {error ? (
                <p
                  role="alert"
                  className="rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-[13px] text-danger-fg"
                >
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="h-11 w-full text-sm" disabled={isSubmitting}>
                {isSubmitting ? 'Entrando…' : 'Entrar'}
                {!isSubmitting ? <ArrowRight className="size-4" /> : null}
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-[13px] text-fg-subtle">
            Problemas para entrar? Fale com o gestor da conta.
          </p>
        </div>
      </main>
    </div>
  );
}
