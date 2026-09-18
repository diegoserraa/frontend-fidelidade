// Handlers de Web Push, importados pelo service worker gerado pelo Workbox
// (ver `workbox.importScripts` em vite.config.ts). Arquivo à parte porque o
// vite-plugin-pwa (modo generateSW) não deixa escrever eventos custom direto
// no SW que ele gera.
//
// Ícone genérico do Fideliza+ de propósito: um deploy só manda notificação
// pra clientes de VÁRIAS padarias diferentes (ver src/cliente/lib/config.ts)
// — não dá pra saber em build time qual logo usar pra cada notificação.
/* eslint-disable no-restricted-globals */

const ICONE_NOTIFICACAO = '/pwa-icon.svg';

self.addEventListener('push', (event) => {
  let data = { titulo: 'Meus Pontos', mensagem: 'Você tem uma novidade.' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* payload não é JSON — mantém o texto padrão */
  }

  event.waitUntil(
    self.registration.showNotification(data.titulo, {
      body: data.mensagem,
      icon: ICONE_NOTIFICACAO,
      badge: ICONE_NOTIFICACAO,
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
