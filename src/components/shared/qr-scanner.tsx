import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CameraOff, Keyboard, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface QrScannerProps {
  /** Chamado a cada leitura (QR ou código colado). O pai decide o que fazer. */
  onDetected: (text: string) => void;
  /** Quando `false`, a câmera é desligada (ex.: enquanto mostra o resultado). */
  active: boolean;
  className?: string;
}

type CamState = 'idle' | 'starting' | 'running' | 'denied' | 'unavailable';

export function QrScanner({ onDetected, active, className }: QrScannerProps) {
  const regionId = `qr-region-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const controllerRef = useRef<Html5Qrcode | null>(null);
  const runningRef = useRef(false);
  const firedRef = useRef(false);
  const onDetectedRef = useRef(onDetected);

  const [cam, setCam] = useState<CamState>('idle');
  const [attempt, setAttempt] = useState(0);
  const [manual, setManual] = useState('');
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  /** Uma leitura por vez: rearma quando o pai volta a ativar o scanner. */
  const emit = (text: string) => {
    if (firedRef.current) return;
    firedRef.current = true;
    onDetectedRef.current(text);
  };

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (runningRef.current || cancelled) return;
      firedRef.current = false;
      setCam('starting');
      const controller = controllerRef.current ?? new Html5Qrcode(regionId, { verbose: false });
      controllerRef.current = controller;
      try {
        await controller.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => emit(text),
          () => {},
        );
        if (cancelled) {
          await safeStop();
          return;
        }
        runningRef.current = true;
        setCam('running');
      } catch (err) {
        const message = String((err as Error)?.message ?? err).toLowerCase();
        if (message.includes('permission') || message.includes('notallowed')) setCam('denied');
        else setCam('unavailable');
        setShowManual(true);
      }
    }

    async function safeStop() {
      const controller = controllerRef.current;
      if (!controller || !runningRef.current) return;
      runningRef.current = false;
      try {
        await controller.stop();
        controller.clear();
      } catch {
        /* já parado */
      }
    }

    if (active) void start();
    else void safeStop();

    return () => {
      cancelled = true;
      void safeStop();
    };
  }, [active, regionId, attempt]);

  const submitManual = () => {
    const value = manual.trim();
    if (!value) return;
    setManual('');
    firedRef.current = false;
    emit(value);
  };

  const offline = cam === 'denied' || cam === 'unavailable';

  return (
    <div className={cn('flex w-full flex-col items-center gap-3', className)}>
      <div className="relative aspect-square w-full max-w-[20rem] overflow-hidden rounded-2xl border border-border bg-fg/[0.04] sm:max-w-[24rem]">
        <div id={regionId} className="size-full [&_video]:size-full [&_video]:object-cover" />

        {cam !== 'running' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            {offline ? (
              <>
                <CameraOff className="size-8 text-fg-subtle" />
                <p className="text-sm text-fg-muted">
                  {cam === 'denied'
                    ? 'Sem acesso à câmera. Libere a permissão no navegador ou use o CPF.'
                    : 'Nenhuma câmera disponível neste aparelho.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCam('idle');
                    setAttempt((a) => a + 1);
                  }}
                >
                  <RefreshCw className="size-4" />
                  Tentar de novo
                </Button>
              </>
            ) : (
              <>
                <span className="size-8 motion-safe:animate-spin rounded-full border-2 border-border border-t-primary" />
                <p className="text-sm text-fg-muted">Abrindo a câmera…</p>
              </>
            )}
          </div>
        ) : null}

        {cam === 'running' ? (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <span className="absolute left-4 top-4 size-9 rounded-tl-xl border-l-[3px] border-t-[3px] border-primary" />
            <span className="absolute right-4 top-4 size-9 rounded-tr-xl border-r-[3px] border-t-[3px] border-primary" />
            <span className="absolute bottom-4 left-4 size-9 rounded-bl-xl border-b-[3px] border-l-[3px] border-primary" />
            <span className="absolute bottom-4 right-4 size-9 rounded-br-xl border-b-[3px] border-r-[3px] border-primary" />
            <span
              style={{ top: '6%' }}
              className="absolute inset-x-6 h-0.5 rounded-full bg-primary/70 shadow-[0_0_14px_2px_var(--color-primary)] motion-safe:animate-[scan-sweep_2.4s_ease-in-out_infinite]"
            />
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setShowManual((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
      >
        <Keyboard className="size-3.5" />
        Colar código manualmente
      </button>

      {showManual ? (
        <div className="flex w-full max-w-[24rem] items-center gap-2">
          <input
            className="h-11 min-w-0 flex-1 rounded-lg border border-border-strong bg-surface px-3 font-mono text-xs text-fg outline-none focus-visible:border-primary"
            aria-label="Colar código do QR"
            placeholder="Cole aqui o código do QR"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitManual();
            }}
          />
          <Button type="button" className="h-11" onClick={submitManual} disabled={!manual.trim()}>
            Usar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
