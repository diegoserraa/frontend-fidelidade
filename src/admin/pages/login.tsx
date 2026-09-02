import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/admin-auth';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/password-input';
import { getErrorMessage } from '../../lib/errors';

/** Tela interna do dono da plataforma — sem material de marketing, só o acesso. */
export function AdminLoginPage() {
  const [form, setForm] = useState({ email: '', senha: '' });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(form);
      navigate('/admin', { replace: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError, 'Não foi possível entrar. Verifique os dados.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-fg-onprimary shadow-sm">
            <ShieldCheck className="size-5" />
          </span>
          <span className="text-base font-semibold tracking-tight text-fg">Fideliza+ · Admin</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-8">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-fg">Acesso do dono</h1>
            <p className="text-[13px] text-fg-muted">Cadastre e acompanhe as empresas clientes.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting} className="mt-6 space-y-4">
            <Input
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))}
              placeholder="voce@suaempresa.com"
              autoComplete="email"
              autoFocus
              required
            />
            <PasswordInput
              label="Senha"
              value={form.senha}
              onChange={(event) => setForm((c) => ({ ...c, senha: event.target.value }))}
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
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
