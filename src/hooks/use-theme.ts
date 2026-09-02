import { useCallback, useEffect } from 'react';

const THEME_STORAGE_KEY = 'fidelidade_brand_theme';

export interface BrandTheme {
  /** Cor primária da marca em hexadecimal (#rrggbb). */
  primary: string;
}

/** Verde esmeralda — precisa refletir `--brand` em `index.css`. */
export const DEFAULT_BRAND: BrandTheme = { primary: '#059669' };

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isValidHex(value: string): value is string {
  return HEX_RE.test(value.trim());
}

function readStoredTheme(): BrandTheme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_BRAND;
    const parsed = JSON.parse(raw) as Partial<BrandTheme>;
    if (parsed.primary && isValidHex(parsed.primary)) {
      return { primary: parsed.primary };
    }
  } catch {
    /* storage indisponível ou JSON inválido — usa o padrão */
  }
  return DEFAULT_BRAND;
}

function applyTheme(theme: BrandTheme) {
  // Todas as variações da primária derivam de `--brand` via color-mix.
  document.documentElement.style.setProperty('--brand', theme.primary);
}

/**
 * Inicializa o tema da marca no boot da aplicação. Deve ser montado uma vez,
 * acima das rotas.
 */
export function useBrandThemeInit() {
  useEffect(() => {
    applyTheme(readStoredTheme());
  }, []);
}

/**
 * Acesso ao tema da marca para telas de configuração.
 * `saveTheme` persiste e aplica imediatamente, sem reload.
 */
export function useBrandTheme() {
  const saveTheme = useCallback((theme: BrandTheme) => {
    const next = isValidHex(theme.primary) ? theme : DEFAULT_BRAND;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignora falha de persistência — o tema ainda é aplicado na sessão */
    }
    applyTheme(next);
  }, []);

  return { saveTheme, defaultTheme: DEFAULT_BRAND };
}
