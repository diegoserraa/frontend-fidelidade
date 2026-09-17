import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // Deploy single-tenant (uma padaria por instância, ver VITE_EMPRESA_ID):
  // com a logo/cores de verdade já na config estática, o ícone do PWA e a
  // splash nativa do Android saem certos desde a primeira instalação — sem
  // isso, dependem de um patch em runtime que só aplica depois de a página
  // carregar (tarde demais pro momento da instalação).
  const logoUrl = env.VITE_EMPRESA_LOGO_URL || '/pwa-icon.svg';
  const corPrimaria = env.VITE_EMPRESA_COR_PRIMARIA || '#059669';
  // Fundo da splash nativa (Android) e da nossa splash em HTML — combina com a
  // LOGO (extraído dela), não é o corFundo geral do app configurado em
  // Configurações (esse continua vindo ao vivo da API, ver theme.ts).
  const splashBg = env.VITE_EMPRESA_SPLASH_BG || '#ffffff';

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // O PWA instalável é o app do cliente (/app). O painel continua acessível
        // como site normal em /.
        manifest: {
          id: '/app/',
          name: 'Meu Cartão de Fidelidade',
          short_name: 'Meus Pontos',
          description: 'Seu cartão de fidelidade, recompensas e extrato de pontos.',
          theme_color: corPrimaria,
          background_color: splashBg,
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/app/',
          icons: [
            { src: logoUrl, sizes: '192x192', purpose: 'any' },
            { src: logoUrl, sizes: '512x512', purpose: 'any' },
            { src: logoUrl, sizes: 'any', purpose: 'maskable' },
          ],
        },
        workbox: {
          // index.html NÃO entra no precache de propósito (e navigateFallback
          // desligado: por padrão o vite-plugin-pwa registra um sempre, então
          // precisa ser sobrescrito com `undefined` mesmo, omitir não basta).
          // Esse HTML carrega os scripts críticos da splash (logo/cor certas
          // desde o primeiro paint) e do ícone da aba. Se o Workbox o
          // servisse do cache, toda vez que esse arquivo mudasse (ex.: trocar
          // a logo) quem já tinha o app aberto ficava vendo a versão antiga
          // até o SW notar a atualização sozinho — daí o "pisca fundo errado,
          // depois acerta". Sem isso, a navegação sempre busca o HTML da rede
          // (a rota da SPA já é resolvida pelo rewrite do vercel.json).
          navigateFallback: undefined,
          globPatterns: ['**/*.{js,css,svg,woff2}'],
          // Injeta os handlers de push/notificationclick no SW gerado pelo Workbox.
          importScripts: ['push-sw.js'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
