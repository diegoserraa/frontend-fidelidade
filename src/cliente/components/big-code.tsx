import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { qrDataUri } from '../../lib/qr';
import { cn } from '../../lib/utils';

/**
 * Painel branco com o QR bem grande — feito para ser lido de longe, no caixa.
 * Usado tanto para o código de identificação (pontuar) quanto para o resgate.
 */
export function BigCode({
  value,
  title,
  hint,
  footer,
  className,
}: {
  value: string | null;
  title: string;
  hint?: string;
  footer?: ReactNode;
  className?: string;
}) {
  const img = useMemo(() => (value ? qrDataUri(value) : null), [value]);

  return (
    <div
      className={cn(
        'mx-auto flex w-full max-w-[320px] flex-col items-center rounded-2xl bg-white p-5 shadow-lg',
        className,
      )}
    >
      <p className="text-center text-[15px] font-semibold text-[#18181b]">{title}</p>
      {hint ? <p className="mt-1 text-center text-[12px] text-[#6b7280]">{hint}</p> : null}
      <div className="mt-3.5 aspect-square w-full max-w-[260px]">
        {img ? (
          <img src={img} alt="Código QR" className="size-full" />
        ) : (
          <div className="flex size-full items-center justify-center rounded-xl bg-[#f4f4f5]">
            <span className="size-8 animate-spin rounded-full border-2 border-[#e4e4e7] border-t-[#18181b]" />
          </div>
        )}
      </div>
      {footer ? <div className="mt-4 w-full">{footer}</div> : null}
    </div>
  );
}
