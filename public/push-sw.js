// Handlers de Web Push, importados pelo service worker gerado pelo Workbox
// (ver `workbox.importScripts` em vite.config.ts). Arquivo à parte porque o
// vite-plugin-pwa (modo generateSW) não deixa escrever eventos custom direto
// no SW que ele gera.
//
// O ícone vem no payload de cada notificação (`data.icone`, a logo da
// padaria que enviou — ver promocoesService.enviar no backend), não fixo
// aqui: o mesmo aparelho pode estar inscrito em várias padarias ao mesmo
// tempo, então quem manda tem que se identificar visualmente. Sem `icone`
// no payload (padaria não configurou logo), cai no genérico do Fideliza+.
/* eslint-disable no-restricted-globals */

const ICONE_GENERICO = '/pwa-icon.svg';

self.addEventListener('push', (event) => {
  let data = { titulo: 'Meus Pontos', mensagem: 'Você tem uma novidade.', icone: null };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* payload não é JSON — mantém o texto padrão */
  }

  const icone = data.icone || ICONE_GENERICO;

  event.waitUntil(
    self.registration.showNotification(data.titulo, {
      body: data.mensagem,
      icon: icone,
      badge: icone,
      data: { url: '/app' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
