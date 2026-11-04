/**
 * #785 (Phase 3, integration only): messaging provider abstraction.
 *
 * Mirrors the payments provider pattern (payments/interfaces +
 * payments/providers): services depend on this interface only, never on
 * a concrete BSP. The real BSP implementation is a dormant skeleton —
 * it is instantiated ONLY when MESSAGING_ENABLED=true AND the BSP
 * credentials are present in env (see messaging.module.ts). No BSP
 * account exists yet and no real message may be sent by this code
 * until the founder completes the BSP onboarding (see issue #785).
 */

export const MESSAGING_PROVIDER = 'MESSAGING_PROVIDER';

export type MessagingChannel = 'sms' | 'whatsapp';

export interface SendSmsInput {
  /** E.164 phone number of the recipient. Never logged in full. */
  to: string;
  /** Fully rendered message body (templates are rendered by the service). */
  body: string;
}

export interface SendWhatsAppTemplateInput {
  /** E.164 phone number of the recipient. Never logged in full. */
  to: string;
  /** BSP/Meta template identifier (from messaging-templates.ts data). */
  templateId: string;
  /** Locale of the approved template variant, e.g. 'fr'. */
  language: string;
  /** Ordered template variables, already rendered to strings. */
  variables: string[];
}

export interface MessagingSendResult {
  /** Provider-side message id, when the provider returns one. */
  providerMessageId?: string;
  status: 'sent' | 'queued' | 'failed';
  error?: string;
}

export interface MessagingProvider {
  readonly name: string;
  sendSms(input: SendSmsInput): Promise<MessagingSendResult>;
  sendWhatsAppTemplate(
    input: SendWhatsAppTemplateInput,
  ): Promise<MessagingSendResult>;
}

/** Mask a phone number for logs: keep country prefix + last 2 digits. */
export function maskPhone(phone: string): string {
  const digits = (phone || '').replace(/[^\d+]/g, '');
  if (digits.length <= 4) return '***';
  return `${digits.slice(0, 4)}***${digits.slice(-2)}`;
}
