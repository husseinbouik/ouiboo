import * as webPush from 'web-push';

/**
 * #784: minimal sender seam over the `web-push` library so the push
 * service can be unit-tested with a mocked sender (no network, no real
 * push service). The real implementation reads the VAPID keys from the
 * environment on every send and throws when they are absent — callers
 * must check configuration first (the service no-ops when unconfigured).
 */
export interface PushSubscriptionLike {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushSender {
  send(subscription: PushSubscriptionLike, payload: string): Promise<void>;
}

export const PUSH_SENDER = 'PUSH_SENDER';

export class WebPushSender implements PushSender {
  async send(subscription: PushSubscriptionLike, payload: string): Promise<void> {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:ouibouuu@gmail.com';
    if (!publicKey || !privateKey) {
      throw new Error('VAPID keys are not configured');
    }
    webPush.setVapidDetails(subject, publicKey, privateKey);
    await webPush.sendNotification(subscription, payload);
  }
}

/** True when the server can actually deliver push (keys present). */
export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

/** Server-provided VAPID public key for the browser PushManager. */
export function pushPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}
