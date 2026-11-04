import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { NotificationType } from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { SubscribePushDto } from './dto/push-subscription.dto';
import {
  PUSH_SENDER,
  PushSender,
  WebPushSender,
  isPushConfigured,
  pushPublicKey,
} from './push-sender';

/**
 * #784: which per-category preference switch gates each notification
 * type for the push channel. REVIEW_RESPONSE rides on reviewRequest —
 * it is the same conversation (a reply to the traveller's own review).
 * The existing jobs key their email gating the same way per category;
 * push never bypasses these switches.
 */
const CATEGORY_PREFERENCE: Record<NotificationType, string> = {
  PAYMENT_REMINDER: 'paymentReminder',
  TRIP_REMINDER: 'tripReminder',
  BOOKING_CONFIRMATION: 'bookingConfirmation',
  CANCELLATION: 'cancellationAlert',
  REVIEW_REQUEST: 'reviewRequest',
  REVIEW_RESPONSE: 'reviewRequest',
};

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private readonly sender: PushSender;

  constructor(
    private prisma: DatabaseService,
    @Optional() @Inject(PUSH_SENDER) sender?: PushSender,
  ) {
    this.sender = sender ?? new WebPushSender();
  }

  /** VAPID public key the browser needs for PushManager.subscribe. */
  getPublicKey() {
    return { publicKey: pushPublicKey(), enabled: isPushConfigured() };
  }

  /**
   * Store (or rebind) a browser subscription for the authenticated
   * user. The endpoint is globally unique: pushing from a browser that
   * was previously signed in as someone else rebinds the row to the
   * current user — an endpoint can only ever deliver to one account.
   * Subscribing also turns the push channel on for this user.
   */
  async subscribe(userId: string, dto: SubscribePushDto) {
    const subscription = await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent ?? null,
      },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent ?? null,
      },
    });
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: { pushNotifications: true },
      create: { userId, pushNotifications: true },
    });
    return { id: subscription.id, endpoint: subscription.endpoint };
  }

  /**
   * Remove the caller's own subscription for an endpoint. Scoped by
   * userId: one user can never delete another user's subscription.
   */
  async unsubscribe(userId: string, endpoint: string) {
    const result = await this.prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });
    return { removed: result.count };
  }

  /**
   * Attempt push delivery for one notification event. Best-effort by
   * design: never throws into the caller's flow. No-ops safely when
   * VAPID is unconfigured, when the user never opted into the push
   * channel, or when the category switch is off. Subscriptions the
   * push service reports gone (404/410) are pruned.
   */
  async sendToUser(
    userId: string,
    type: NotificationType,
    payload: PushPayload,
  ): Promise<{ sent: number; pruned: number; skipped?: string }> {
    if (!isPushConfigured()) return { sent: 0, pruned: 0, skipped: 'not-configured' };

    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    // Push is opt-in: no preference row (or channel off) means no push,
    // even if a stale subscription row exists.
    if (!preferences?.pushNotifications) {
      return { sent: 0, pruned: 0, skipped: 'channel-off' };
    }
    const categoryField = CATEGORY_PREFERENCE[type];
    if (
      categoryField &&
      (preferences as unknown as Record<string, unknown>)[categoryField] === false
    ) {
      return { sent: 0, pruned: 0, skipped: 'category-off' };
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });
    if (subscriptions.length === 0) return { sent: 0, pruned: 0, skipped: 'no-subscriptions' };

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/notifications',
    });

    let sent = 0;
    let pruned = 0;
    for (const subscription of subscriptions) {
      try {
        await this.sender.send(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          body,
        );
        sent += 1;
      } catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await this.prisma.pushSubscription
            .delete({ where: { id: subscription.id } })
            .catch(() => undefined);
          pruned += 1;
        } else {
          this.logger.warn(
            `Push delivery failed for subscription ${subscription.id}: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
          );
        }
      }
    }
    return { sent, pruned };
  }
}
