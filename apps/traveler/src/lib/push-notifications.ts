import { apiClient } from '@/lib/api-client';

/**
 * #784: browser-side web push helpers for the traveller app.
 *
 * Everything degrades gracefully: unsupported browsers, a denied
 * permission, an unconfigured server (no VAPID key) and network
 * failures all resolve to a status the UI can render — nothing here
 * throws into the page.
 */

export type PushStatus =
  | 'subscribed'
  | 'unsubscribed'
  | 'denied'
  | 'unsupported'
  | 'unavailable'
  | 'error';

/** Convert a base64url VAPID public key to the Uint8Array PushManager wants. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const keyResponse = await apiClient.get('/notifications/push/public-key');
    const publicKey: string | null = keyResponse.data?.publicKey ?? null;
    if (!keyResponse.data?.enabled || !publicKey) return 'unavailable';

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const json = subscription.toJSON();
    await apiClient.post('/notifications/push/subscribe', {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      userAgent: navigator.userAgent,
    });
    return 'subscribed';
  } catch {
    // Re-read the permission: a subscribe attempt the user just denied
    // at the browser prompt lands here, not in the pre-check above.
    return (Notification.permission as string) === 'denied' ? 'denied' : 'error';
  }
}

export async function unsubscribeFromPush(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported';
  try {
    const subscription = await getCurrentPushSubscription();
    if (subscription) {
      // Remove the server row first (scoped to this user), then drop
      // the browser subscription itself.
      await apiClient
        .post('/notifications/push/unsubscribe', { endpoint: subscription.endpoint })
        .catch(() => undefined);
      await subscription.unsubscribe().catch(() => undefined);
    }
    await apiClient
      .patch('/notifications/preferences', { pushNotifications: false })
      .catch(() => undefined);
    return 'unsubscribed';
  } catch {
    return 'error';
  }
}
