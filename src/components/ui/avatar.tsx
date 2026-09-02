import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../../lib/utils';

/** Tons claros determinísticos para o fundo das iniciais. */
const TINTS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
];

function hashIndex(value: string, mod: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(hash) % mod;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

export function Avatar({ name, src, className }: AvatarProps) {
  const tint = TINTS[hashIndex(name || '?', TINTS.length)];

  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex size-8 shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
        'ring-1 ring-inset ring-black/5',
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(140deg, color-mix(in srgb, ${tint} 24%, #fff), color-mix(in srgb, ${tint} 12%, #fff))`,
      }}
    >
      {src ? (
        <AvatarPrimitive.Image
          src={src}
          alt={name}
          className="size-full object-cover"
        />
      ) : null}
      <AvatarPrimitive.Fallback
        className="text-[11px] font-semibold"
        style={{ color: `color-mix(in srgb, ${tint} 72%, #000)` }}
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
