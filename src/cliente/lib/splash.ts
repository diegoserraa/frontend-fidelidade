/**
 * Esconde a splash estática de `index.html` (logo + fundo pré-pintados antes
 * do React montar). Chamada quando o app do cliente já tem algo de verdade
 * pra mostrar no lugar — nunca antes disso, senão volta o "flash" que a
 * splash existe pra evitar.
 */
export function hideSplash(): void {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  splash.classList.add('is-hiding');
  setTimeout(() => splash.remove(), 300);
}
