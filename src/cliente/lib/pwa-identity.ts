import { normalizeHex } from '../../lib/color';

/**
 * Campos de marca que tanto `EmpresaPublica` (tela de login) quanto
 * `EmpresaVinculo` (cliente logado) fornecem.
 */
type BrandingSource = {
  nome?: string | null;
  logoUrl?: string | null;
  corPrimaria?: string | null;
  corFundo?: string | null;
};

let objectUrl: string | null = null;

function iconType(url: string): string | undefined {
  const clean = url.split(/[?#]/)[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.webp')) return 'image/webp';
  return undefined;
}

function upsertLink(rel: string): HTMLLinkElement {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  return el;
}

function upsertMeta(name: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  return el;
}

/**
 * Troca, em runtime, o ícone e o nome do PWA pelos que a padaria cadastrou no
 * painel (logo + cores). Roda já na tela de login porque o sistema operacional
 * congela o ícone no momento em que a pessoa instala — depois disso, só um
 * reinstalar pega a logo nova.
 *
 * Sem `logoUrl` configurada, mantém o ícone padrão do build.
 */
export function applyEmpresaPwaIdentity(src: BrandingSource): void {
  if (!document.head) return;

  const logo = (src.logoUrl ?? '').trim();
  const nome = (src.nome ?? '').trim();

  // iOS usa o apple-touch-icon no "Adicionar à Tela de Início".
  if (logo) upsertLink('apple-touch-icon').href = logo;
  if (nome) upsertMeta('apple-mobile-web-app-title').content = nome;

  const manifestLink = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!manifestLink || !logo) return;

  const brand = normalizeHex(src.corPrimaria ?? '') ?? '#059669';
  const background = normalizeHex(src.corFundo ?? '') ?? '#ffffff';
  const type = iconType(logo);
  const icon = (sizes: string, purpose: string) => ({
    src: logo,
    sizes,
    purpose,
    ...(type ? { type } : {}),
  });

  const manifest = {
    id: '/app/',
    name: nome || 'Meu Cartão de Fidelidade',
    short_name: (nome || 'Meus Pontos').slice(0, 12),
    description: 'Seu cartão de fidelidade, recompensas e extrato de pontos.',
    start_url: '/app/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: brand,
    background_color: background,
    icons: [
      icon('192x192', 'any'),
      icon('512x512', 'any'),
      icon('any', 'maskable'),
    ],
  };

  try {
    const next = URL.createObjectURL(
      new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }),
    );
    manifestLink.href = next;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = next;
  } catch {
    /* Blob/URL indisponível — mantém o manifesto do build */
  }
}
