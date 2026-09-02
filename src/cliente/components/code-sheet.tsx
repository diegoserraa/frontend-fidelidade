import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { BigCode } from './big-code';
import { portalApi } from '../services/portal';

/**
 * Tela cheia e bem clara com o QR de identificação — o cliente abre por um
 * botão na hora da compra. O código se renova sozinho enquanto está aberto.
 */
export function CodeSheet({
  open,
  onClose,
  nome,
}: {
  open: boolean;
  onClose: () => void;
  nome?: string;
}) {
  const qr = useQuery({
    queryKey: ['cliente', 'qr'],
    queryFn: portalApi.getQr,
    enabled: open,
    refetchInterval: open ? 45_000 : false,
    staleTime: 40_000,
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Meu código"
      className="fixed inset-0 z-50 flex flex-col bg-white motion-safe:animate-[sheet-up_200ms_ease-out]"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between px-5 py-3.5">
        <span className="text-[14px] font-semibold text-[#18181b]">
          {nome ? nome.split(' ')[0] : 'Meu código'}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="flex size-10 items-center justify-center rounded-full bg-[#f4f4f5] text-[#18181b]"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <BigCode
          value={qr.data?.token ?? null}
          title="Mostre no caixa"
          hint="para ganhar pontos na sua compra"
          className="shadow-none"
        />
        <p className="mt-5 text-center text-[12px] text-[#6b7280]">
          O código muda a cada minuto por segurança.
        </p>
      </div>

      <div className="px-6 pb-4">
        <button
          type="button"
          onClick={onClose}
          className="h-12 w-full rounded-xl bg-[#18181b] text-[15px] font-semibold text-white"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
