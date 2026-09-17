// Handlers de Web Push, importados pelo service worker gerado pelo Workbox
// (ver `workbox.importScripts` em vite.config.ts). Arquivo à parte porque o
// vite-plugin-pwa (modo generateSW) não deixa escrever eventos custom direto
// no SW que ele gera.
//
// Fica fora do bundle do Vite (é copiado de `public/` como está), então não
// dá pra ler VITE_EMPRESA_LOGO_URL em build time — o valor abaixo é a mesma
// logo cadastrada em Configurações, colada à mão. Se a logo mudar no painel,
// atualize aqui também e faça um novo deploy.
/* eslint-disable no-restricted-globals */

const ICONE_NOTIFICACAO =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQArBCUY79yi-556EXwISpisTGguanO_odz3mPvhQg8jQ&s=10';

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
