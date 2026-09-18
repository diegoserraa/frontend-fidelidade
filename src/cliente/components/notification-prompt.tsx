import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast';
import { ativarPushNotifications, isPushSupported } from '../lib/push';

const DISMISSED_KEY = 'fidelidade_cliente_push_dismissed';

/**
 * Banner "Ativar notificações". Só aparece quando o navegador suporta Web
 * Push e a permissão ainda não foi decidida (`default`) — se o usuário já
 * negou, o navegador não deixa perguntar de novo, então não insistimos.
 */
export function NotificationPrompt({ empresaId }: { empresaId: string }) {
  const toast = useToast();
  const [permission, setPermission] = useState<NotificationPermission | null>(() =>
    isPushSupported() ? Notification.permission : null,
  );
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed || permission !== 'default') return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const ativar = async () => {
    setLoading(true);
    try {
      const resultado = await ativarPushNotifications(empresaId);
      if (resultado === 'ativado') {
        toast.success('Notificações ativadas');
        setPermission('granted');
      } else if (resultado === 'negado') {
        toast.info('Permissão não concedida', 'Você pode ativar depois nas configurações do navegador.');
        setPermission('denied');
      }
    } catch {
      toast.error('Não foi possível ativar', 'Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary-border bg-primary-subtle p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-fg-onprimary">
          <Bell className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-primary-subtle-fg">Ative as notificações</p>
          <p className="mt-1 text-[12px] text-primary-subtle-fg/90">
            Saiba na hora sobre promoções e recompensas novas.
          </p>
          <Button size="sm" className="mt-2" onClick={ativar} disabled={loading}>
            {loading ? 'Ativando…' : 'Ativar notificações'}
          </Button>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Dispensar"
          className="rounded-md p-1 text-primary-subtle-fg/70 hover:bg-primary-subtle-hover"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
