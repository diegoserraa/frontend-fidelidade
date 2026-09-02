import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(component: string) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error(`${component} deve ser usado dentro de <Dialog>`);
  return ctx;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const reactId = React.useId();
  const titleId = `dialog-${reactId}-title`;
  const descriptionId = `dialog-${reactId}-description`;

  React.useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  const value = React.useMemo(
    () => ({ open, onOpenChange, titleId, descriptionId }),
    [open, onOpenChange, titleId, descriptionId],
  );

  return (
    <DialogContext.Provider value={value}>
      {open ? children : null}
    </DialogContext.Provider>
  );
}

export function DialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { onOpenChange, titleId, descriptionId } = useDialogContext('DialogContent');
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Handler mantido em ref para o efeito de foco rodar SÓ na montagem (abertura)
  // e não a cada render — do contrário ele rouba o foco a cada tecla digitada.
  const onOpenChangeRef = React.useRef(onOpenChange);
  React.useLayoutEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const firstField = panel.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
    );
    (firstField ?? panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onOpenChangeRef.current(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === firstNode || active === panel)) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && active === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
    // Executa uma vez por abertura (o DialogContent monta/desmonta com `open`).
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-fg/40 motion-safe:animate-[fade-in_120ms_ease-out]"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full max-w-lg rounded-t-xl border border-border bg-surface shadow-lg outline-none',
          'max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl',
          'motion-safe:animate-[dialog-in_140ms_ease-out]',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-border px-5 py-4',
        className,
      )}
    >
      <div className="flex flex-col gap-1">{children}</div>
      <DialogClose />
    </div>
  );
}

export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { titleId } = useDialogContext('DialogTitle');
  return (
    <h2 id={titleId} className={cn('text-base font-semibold text-fg', className)}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { descriptionId } = useDialogContext('DialogDescription');
  return (
    <p id={descriptionId} className={cn('text-[13px] text-fg-muted', className)}>
      {children}
    </p>
  );
}

export function DialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:justify-end',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DialogClose({ className }: { className?: string }) {
  const { onOpenChange } = useDialogContext('DialogClose');
  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className={cn(
        'rounded-md p-1.5 text-fg-subtle transition-colors hover:bg-surface-muted hover:text-fg',
        className,
      )}
      aria-label="Fechar"
    >
      <X className="size-4" />
    </button>
  );
}
