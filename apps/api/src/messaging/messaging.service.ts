import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../database/database.service';
import {
  MESSAGING_PROVIDER,
  MessagingChannel,
  MessagingProvider,
  maskPhone,
} from './messaging-provider.interface';
import {
  MessagingEvent,
  getMessagingTemplate,
  normalizeMessagingLocale,
  renderSmsBody,
  templateVariables,
} from './messaging-templates';

export interface NotifyEventInput {
  userId: string;
  /** Recipient phone (e.g. Booking.phoneNumber). No phone = no send. */
  phone?: string | null;
  locale?: string | null;
  event: MessagingEvent;
  variables: Record<string, string>;
  /** Channels to attempt; each is still gated by its own flag. */
  channels?: MessagingChannel[];
}

export interface DeliveryRecord {
  /** Provider message id, or the idempotency key for inbound/status rows. */
  providerMessageId: string;
  channel: MessagingChannel | 'inbound';
  event?: MessagingEvent;
  status: string;
  /** Masked recipient — full numbers are never stored in this log. */
  toMasked: string;
  at: Date;
}

const flagOn = (name: string): boolean => process.env[name] === 'true';

/**
 * #785 (integration only): SMS / WhatsApp notification attempts.
 *
 * STRICT NO-OP unless ALL of these hold, checked per attempt:
 *  1. MESSAGING_ENABLED=true (global flag, default off);
 *  2. the channel flag (SMS_ENABLED / WHATSAPP_ENABLED, default off);
 *  3. the recipient has a phone number;
 *  4. the user opted IN — NotificationPreference.smsNotifications is
 *     the pre-existing messaging opt-in and defaults to false, so no
 *     preference row (or a row without opt-in) means no send.
 *
 * This mirrors the gateway-payments discipline
 * (payments.service ensureGatewayPaymentsEnabled): the feature simply
 * does not exist for callers while its flags are off. Attempts never
 * throw into the caller's flow — a messaging failure must not fail a
 * booking, cancellation or refund (same rule as booking emails).
 *
 * Delivery status is recorded in an in-memory log (masked numbers
 * only). A durable delivery-log table is deliberately NOT added while
 * the integration is dormant: it lands with the BSP activation change,
 * when real volume exists to record.
 */
@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly deliveries: DeliveryRecord[] = [];
  private readonly seenProviderIds = new Set<string>();

  constructor(
    @Optional() private readonly prisma?: DatabaseService,
    @Optional()
    @Inject(MESSAGING_PROVIDER)
    private readonly provider?: MessagingProvider,
  ) {}

  isMessagingEnabled(): boolean {
    return flagOn('MESSAGING_ENABLED');
  }

  isChannelEnabled(channel: MessagingChannel): boolean {
    if (!this.isMessagingEnabled()) return false;
    return channel === 'sms' ? flagOn('SMS_ENABLED') : flagOn('WHATSAPP_ENABLED');
  }

  /** Bound provider name ('fake' unless a real BSP is configured+on). */
  providerName(): string {
    return this.provider?.name ?? 'none';
  }

  /**
   * Attempt messaging for one notification event. Returns the number
   * of messages actually sent (0 in every dormant/opted-out case).
   */
  async notifyEvent(input: NotifyEventInput): Promise<number> {
    try {
      if (!this.isMessagingEnabled()) return 0;
      if (!input.phone) return 0;
      if (!this.provider) return 0;

      const optedIn = await this.userOptedIn(input.userId);
      if (!optedIn) return 0;

      const locale = normalizeMessagingLocale(input.locale);
      const template = getMessagingTemplate(input.event, locale);
      const channels = input.channels ?? ['whatsapp', 'sms'];
      let sent = 0;

      for (const channel of channels) {
        if (!this.isChannelEnabled(channel)) continue;
        const result =
          channel === 'sms'
            ? await this.provider.sendSms({
                to: input.phone,
                body: renderSmsBody(template, input.variables),
              })
            : await this.provider.sendWhatsAppTemplate({
                to: input.phone,
                templateId: template.whatsappTemplateId,
                language: locale,
                variables: templateVariables(template, input.variables),
              });
        if (result.providerMessageId) {
          this.seenProviderIds.add(result.providerMessageId);
        }
        this.deliveries.push({
          providerMessageId: result.providerMessageId ?? `local-${Date.now()}`,
          channel,
          event: input.event,
          status: result.status,
          toMasked: maskPhone(input.phone),
          at: new Date(),
        });
        if (result.status !== 'failed') sent += 1;
        this.logger.log(
          `Messaging ${channel} ${input.event} -> ${maskPhone(input.phone)}: ${result.status} via ${this.provider.name}`,
        );
      }
      return sent;
    } catch (error) {
      this.logger.warn(
        `Messaging attempt failed for ${input.event}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
  }

  private async userOptedIn(userId: string): Promise<boolean> {
    if (!this.prisma) return false;
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    return pref?.smsNotifications === true;
  }

  // --- Inbound webhooks -------------------------------------------------

  /**
   * Verify a provider webhook signature: hex HMAC-SHA256 of the raw
   * body with MESSAGING_WEBHOOK_SECRET. FAILS CLOSED — no secret
   * configured means every webhook is rejected (the PSP webhook rule,
   * #373: validation fails closed when the variable is unset).
   */
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    const secret = process.env.MESSAGING_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const given = Buffer.from(signature.replace(/^sha256=/, ''), 'utf8');
    const want = Buffer.from(expected, 'utf8');
    return given.length === want.length && timingSafeEqual(given, want);
  }

  /**
   * Record a delivery-status or inbound-message webhook event.
   * Idempotent on the provider message/event id: a redelivery returns
   * { duplicate: true } and records nothing new (webhook handlers must
   * be safe to retry — AGENTS.md).
   */
  recordWebhookEvent(event: {
    providerEventId: string;
    channel: MessagingChannel | 'inbound';
    status: string;
    fromPhone?: string | null;
  }): { recorded: boolean; duplicate: boolean } {
    if (this.seenProviderIds.has(event.providerEventId)) {
      return { recorded: false, duplicate: true };
    }
    this.seenProviderIds.add(event.providerEventId);
    this.deliveries.push({
      providerMessageId: event.providerEventId,
      channel: event.channel,
      status: event.status,
      toMasked: event.fromPhone ? maskPhone(event.fromPhone) : '',
      at: new Date(),
    });
    return { recorded: true, duplicate: false };
  }

  /** Recorded deliveries (masked numbers only) — tests + witness. */
  getDeliveries(): readonly DeliveryRecord[] {
    return this.deliveries;
  }
}
