import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'fidelidade_cliente_install_dismissed';

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * Banner "Instalar app". No Android/desktop usa o evento nativo
 * `beforeinstallprompt`; no iPhone mostra o passo a passo do Safari.
 * Some quando já está instalado ou quando o usuário dispensa.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (dismissed) return null;
  // No Android/desktop, `deferred` (evento nativo) já é o sinal certo — o
  // Chrome só dispara `beforeinstallprompt` quando ESTE escopo (padaria)
  // realmente não está instalado, mesmo rodando dentro do app JÁ instalado
  // de outra padaria. Checar `isStandalone()` aqui esconderia o botão de
  // instalar a padaria B só por já existir uma padaria A instalada.
  // No iPhone não existe esse evento — sem sinal melhor, usa `isStandalone()`
  // como aproximação (aceita o raro caso de duas padarias no iOS não
  // detectar perfeitamente; é uma limitação do iOS, não desta checagem).
  const standalone = isStandalone();
  const iosFallback = isIos() && !deferred && !standalone;
  if (!deferred && !iosFallback) return null;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-xl border border-primary-border bg-primary-subtle p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-fg-onprimary">
          <Download className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-primary-subtle-fg">
            Instale o app na tela inicial
          </p>
          {iosFallback ? (
            <p className="mt-1 text-[12px] leading-relaxed text-primary-subtle-fg/90">
              Toque em <Share className="inline size-3.5 -mt-0.5" /> e depois em{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </p>
          ) : (
            <p className="mt-1 text-[12px] text-primary-subtle-fg/90">
              Abre em tela cheia, como um aplicativo.
            </p>
          )}
          {deferred ? (
            <Button
              size="sm"
              className="mt-2"
              onClick={async () => {
                await deferred.prompt();
                await deferred.userChoice.catch(() => undefined);
                setDeferred(null);
                close();
              }}
            >
              Instalar agora
            </Button>
          ) : null}
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
