/** Utilidades de cor para contraste/legibilidade. */

export function normalizeHex(value: string): string | null {
  const match = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(value.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }
  return `#${hex.toLowerCase()}`;
}

export function hexToRgb(value: string): [number, number, number] | null {
  const hex = normalizeHex(value);
  if (!hex) return null;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(value: string): number {
  const rgb = hexToRgb(value);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(channel) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores (1–21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Preto ou branco — o que tiver melhor contraste sobre `bg`. */
export function readableTextColor(bg: string): '#ffffff' | '#18181b' {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#18181b') ? '#ffffff' : '#18181b';
}
