declare global {
  interface Window {
    __splashShownAt?: number;
  }
}

// Duração mínima da splash — mesmo quando o app carrega rápido, fica visível
// esse tempo pra parecer um lançamento deliberado, não um flash de conteúdo.
const MIN_DURATION_MS = 3000;
const FADE_MS = 300;

/**
 * Esconde a splash estática de `index.html` (logo + fundo pré-pintados antes
 * do React montar). Chamada quando o app do cliente já tem algo de verdade
 * pra mostrar no lugar — o essencial (cobrir o intervalo até o React montar)
 * já foi cumprido nesse momento; o que resta aqui é só completar os 3s.
 */
export function hideSplash(): void {
  const splash = document.getElementById('app-splash');
  if (!splash) return;

  const elapsed = Date.now() - (window.__splashShownAt ?? Date.now());
  const remaining = Math.max(0, MIN_DURATION_MS - elapsed);

  setTimeout(() => {
    splash.classList.add('is-hiding');
    setTimeout(() => splash.remove(), FADE_MS);
  }, remaining);
}
