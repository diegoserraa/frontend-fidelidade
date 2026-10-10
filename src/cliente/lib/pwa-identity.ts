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

// Confere se a logo cadastrada no painel carrega de verdade antes de trocar o
// ícone do app por ela — uma URL quebrada (ex.: link de imagem do Google que
// expirou) não pode deixar o app sem ícone algum.
function imagemCarrega(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = setTimeout(() => resolve(false), 5000);
    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    img.src = url;
  });
}

/**
 * Troca, em runtime, o ícone (iOS) e o nome do PWA pelos que a padaria
 * cadastrou no painel. Roda já na tela de login porque o sistema operacional
 * congela o ícone no momento em que a pessoa instala — depois disso, só um
 * reinstalar pega a logo nova.
 *
 * O `<link rel="manifest">` NÃO é tocado aqui: o manifesto (ícone composto
 * com fundo + cores certas, usado pela instalação nativa no Android/Chrome)
 * já vem pronto do backend por empresa (ver GET /api/manifest, referenciado
 * em index.html) — gerar um segundo manifesto aqui por cima, via blob, foi o
 * bug que fazia a instalação usar a logo crua (sem fundo) e a cor errada
 * mesmo com o backend certo.
 *
 * Sem `logoUrl` configurada, mantém o ícone padrão do build.
 */
export function applyEmpresaPwaIdentity(src: BrandingSource): void {
  if (!document.head) return;

  const logo = (src.logoUrl ?? '').trim();
  const nome = (src.nome ?? '').trim();

  if (nome) upsertMeta('apple-mobile-web-app-title').content = nome;
  if (!logo) return;

  // Só troca o ícone do iOS se a logo cadastrada carregar de verdade — senão
  // mantém o ícone padrão do build em vez de ficar sem ícone.
  void imagemCarrega(logo).then((ok) => {
    if (!ok || !document.head) return;
    // iOS usa o apple-touch-icon no "Adicionar à Tela de Início" (não lê o
    // manifesto pra isso).
    upsertLink('apple-touch-icon').href = logo;
  });
}
