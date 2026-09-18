import { portalApi } from '../services/portal';

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '').trim();

export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

// A Push API exige a chave VAPID como Uint8Array, mas ela chega em base64url.
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function subscriptionToPayload(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Assinatura de push incompleta.');
  }
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

/**
 * Pede permissão de notificação (se necessário), garante a assinatura de
 * push do APARELHO (uma só, compartilhada entre todas as padarias do
 * cliente — a Push API não permite mais de uma por navegador) e liga a
 * notificação especificamente para `empresaId`. Deve ser chamado a partir de
 * um clique do usuário — no iOS/Safari, `Notification.requestPermission()`
 * sem gesto do usuário falha silenciosamente.
 */
export async function ativarPushNotifications(
  empresaId: string,
): Promise<'ativado' | 'negado' | 'indisponivel'> {
  if (!isPushSupported()) return 'indisponivel';

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return 'negado';

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  await portalApi.subscribePush(subscriptionToPayload(subscription));
  await portalApi.atualizarNotificacoes(empresaId, true);
  return 'ativado';
}

/**
 * Desliga notificação só de `empresaId` — nunca cancela a assinatura de push
 * do aparelho (outra padaria do mesmo cliente pode continuar precisando
 * dela). Ver migration 011.
 */
export async function desativarNotificacoesDaPadaria(empresaId: string): Promise<void> {
  await portalApi.atualizarNotificacoes(empresaId, false);
}
