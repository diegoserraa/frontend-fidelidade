import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastApi {
  show: (type: ToastType, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

const DURATION = 4500;
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: string) => {
    setItems((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = React.useCallback(
    (type: ToastType, title: string, description?: string) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2);
      setItems((current) => [...current, { id, type, title, description }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION),
      );
    },
    [dismiss],
  );

  React.useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => clearTimeout(timer));
  }, []);

  const api = React.useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      success: (title, description) => show('success', title, description),
      error: (title, description) => show('error', title, description),
      info: (title, description) => show('info', title, description),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components
export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  }
  return context;
}

const typeConfig: Record<
  ToastType,
  { icon: typeof Info; container: string; icon_: string; role: 'status' | 'alert' }
> = {
  success: {
    icon: CheckCircle2,
    container: 'border-success/30 bg-success-subtle',
    icon_: 'text-success-fg',
    role: 'status',
  },
  error: {
    icon: AlertTriangle,
    container: 'border-danger/30 bg-danger-subtle',
    icon_: 'text-danger-fg',
    role: 'alert',
  },
  info: {
    icon: Info,
    container: 'border-info/30 bg-info-subtle',
    icon_: 'text-info-fg',
    role: 'status',
  },
};

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role="region"
      aria-label="Notificações"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      {items.map((toast) => {
        const config = typeConfig[toast.type];
        const Icon = config.icon;
        return (
          <div
            key={toast.id}
            role={config.role}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface p-3.5 shadow-lg',
              'motion-safe:animate-[toast-in_160ms_ease-out]',
              config.container,
            )}
          >
            <Icon className={cn('mt-0.5 size-4 shrink-0', config.icon_)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-fg">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-[13px] text-fg-muted">{toast.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fechar aviso"
              className="-m-1 shrink-0 rounded p-1 text-fg-subtle transition-colors hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
