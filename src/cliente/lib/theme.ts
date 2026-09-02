import { contrastRatio, normalizeHex, readableTextColor } from '../../lib/color';
import type { EmpresaVinculo } from '../../types/api';

const DEFAULT_PRIMARY = '#059669';
const DEFAULT_CANVAS = '#f6f7f6';
const FG_DARK = '#18181b';

/**
 * Guarda o tema já resolvido para o script inline do index.html pré-pintar a
 * próxima abertura sem "piscar" o verde padrão.
 */
const THEME_CACHE_KEY = 'fidelidade_cliente_tema';

function cacheTheme(t: { brand: string; contrast: string; brand2: string; canvas: string }) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(t));
  } catch {
    /* storage indisponível — só perde a otimização anti-flash */
  }
}

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

  const secondary = normalizeHex(empresa.corSecundaria ?? '') ?? primary;
  root.setProperty('--brand-2', secondary);

  const canvasCfg = normalizeHex(empresa.corFundo ?? '');
  const canvas =
    canvasCfg && contrastRatio(canvasCfg, FG_DARK) >= 4.5 ? canvasCfg : DEFAULT_CANVAS;
  root.setProperty('--color-canvas', canvas);

  setMetaThemeColor(primary);
  cacheTheme({ brand: primary, contrast, brand2: secondary, canvas });
}

export function resetTheme() {
  const root = document.documentElement.style;
  root.setProperty('--brand', DEFAULT_PRIMARY);
  root.removeProperty('--brand-contrast');
  root.removeProperty('--brand-2');
  root.removeProperty('--color-canvas');
  setMetaThemeColor(DEFAULT_PRIMARY);
}
