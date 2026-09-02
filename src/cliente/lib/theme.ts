import { contrastRatio, normalizeHex, readableTextColor } from '../../lib/color';
import type { EmpresaVinculo } from '../../types/api';

const DEFAULT_PRIMARY = '#059669';
const DEFAULT_CANVAS = '#f6f7f6';
const FG_DARK = '#18181b';

function setMetaThemeColor(color: string) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

/**
 * Aplica a identidade visual configurada pela empresa no app do cliente:
 *
 *  --brand           cor primária (todas as variações derivam dela em index.css)
 *  --brand-contrast  cor do texto/ícones sobre a primária (cartão, botão)
 *  --brand-2         cor secundária (detalhes, brilho do cartão)
 *  --color-canvas    fundo das telas (só é trocado se o texto escuro continuar
 *                    legível sobre ele — evita quebrar a UI com um fundo ruim)
 */
export function applyEmpresaTheme(empresa: Pick<
  EmpresaVinculo,
  'corPrimaria' | 'corSecundaria' | 'corTexto' | 'corFundo'
>) {
  const root = document.documentElement.style;

  const primary = normalizeHex(empresa.corPrimaria ?? '') ?? DEFAULT_PRIMARY;
  root.setProperty('--brand', primary);

  // Usa a cor de texto configurada pela empresa, mas só se ela for legível sobre
  // a primária (rede de proteção para não deixar o cartão ilegível).
  const configurada = normalizeHex(empresa.corTexto ?? '');
  const contrast =
    configurada && contrastRatio(configurada, primary) >= 3
      ? configurada
      : readableTextColor(primary);
  root.setProperty('--brand-contrast', contrast);

  const secondary = normalizeHex(empresa.corSecundaria ?? '');
  root.setProperty('--brand-2', secondary ?? primary);

  const canvas = normalizeHex(empresa.corFundo ?? '');
  if (canvas && contrastRatio(canvas, FG_DARK) >= 4.5) {
    root.setProperty('--color-canvas', canvas);
  } else {
    root.setProperty('--color-canvas', DEFAULT_CANVAS);
  }

  setMetaThemeColor(primary);
}

export function resetTheme() {
  const root = document.documentElement.style;
  root.setProperty('--brand', DEFAULT_PRIMARY);
  root.removeProperty('--brand-contrast');
  root.removeProperty('--brand-2');
  root.removeProperty('--color-canvas');
  setMetaThemeColor(DEFAULT_PRIMARY);
}
