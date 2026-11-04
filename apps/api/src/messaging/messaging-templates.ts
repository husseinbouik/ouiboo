/**
 * #785: messaging templates as DATA — one entry per notification event
 * that already exists in the product, per locale (fr/ar/en, matching
 * the email locale set; fr is the default, as in email-i18n).
 *
 * Events mirror the real notification surface:
 * - BOOKING_CONFIRMATION / CANCELLATION: the NotificationType enum
 *   values that create in-app NotificationLog rows + emails today.
 * - REFUND_UPDATE: the refunds flow's email events (case opened /
 *   action required in refunds.service.ts).
 * - QUOTE_RECEIVED: the quote-requests flow (a quote arrives for a
 *   traveller's request).
 *
 * `whatsappTemplateId` values are PLACEHOLDER identifiers only — real
 * template ids exist only after the founder registers the WhatsApp
 * Business number and Meta approves each template (#785 founder-hands
 * list). SMS bodies are the fallback/plain channel rendering of the
 * same copy. Copy makes no new promises and never uses the word
 * "commission".
 */

export type MessagingEvent =
  | 'BOOKING_CONFIRMATION'
  | 'CANCELLATION'
  | 'REFUND_UPDATE'
  | 'QUOTE_RECEIVED';

export type MessagingLocale = 'fr' | 'ar' | 'en';

export const MESSAGING_LOCALES: readonly MessagingLocale[] = ['fr', 'ar', 'en'];
export const DEFAULT_MESSAGING_LOCALE: MessagingLocale = 'fr';

export function normalizeMessagingLocale(
  value?: string | null,
): MessagingLocale {
  const v = (value || '').toLowerCase();
  return (MESSAGING_LOCALES as readonly string[]).includes(v)
    ? (v as MessagingLocale)
    : DEFAULT_MESSAGING_LOCALE;
}

export interface MessagingTemplate {
  whatsappTemplateId: string;
  /** Ordered variable names the template expects, e.g. ['tripTitle']. */
  variables: string[];
  /** SMS/plain rendering with {{variable}} placeholders. */
  smsBody: string;
}

export const MESSAGING_TEMPLATES: Record<
  MessagingEvent,
  Record<MessagingLocale, MessagingTemplate>
> = {
  BOOKING_CONFIRMATION: {
    fr: {
      whatsappTemplateId: 'ouiboo_booking_confirmed_fr',
      variables: ['tripTitle', 'bookingId'],
      smsBody:
        'Ouiboo : votre réservation pour « {{tripTitle}} » est confirmée. Référence : {{bookingId}}. Vous payez directement l’agence.',
    },
    ar: {
      whatsappTemplateId: 'ouiboo_booking_confirmed_ar',
      variables: ['tripTitle', 'bookingId'],
      smsBody:
        'Ouiboo: تم تأكيد حجزكم لرحلة «{{tripTitle}}». المرجع: {{bookingId}}. الدفع يتم مباشرة لدى الوكالة.',
    },
    en: {
      whatsappTemplateId: 'ouiboo_booking_confirmed_en',
      variables: ['tripTitle', 'bookingId'],
      smsBody:
        'Ouiboo: your booking for "{{tripTitle}}" is confirmed. Reference: {{bookingId}}. You pay the agency directly.',
    },
  },
  CANCELLATION: {
    fr: {
      whatsappTemplateId: 'ouiboo_booking_cancelled_fr',
      variables: ['tripTitle', 'bookingId'],
      smsBody:
        'Ouiboo : votre réservation pour « {{tripTitle}} » a été annulée. Référence : {{bookingId}}.',
    },
    ar: {
      whatsappTemplateId: 'ouiboo_booking_cancelled_ar',
      variables: ['tripTitle', 'bookingId'],
      smsBody:
        'Ouiboo: تم إلغاء حجزكم لرحلة «{{tripTitle}}». المرجع: {{bookingId}}.',
    },
    en: {
      whatsappTemplateId: 'ouiboo_booking_cancelled_en',
      variables: ['tripTitle', 'bookingId'],
      smsBody:
        'Ouiboo: your booking for "{{tripTitle}}" has been cancelled. Reference: {{bookingId}}.',
    },
  },
  REFUND_UPDATE: {
    fr: {
      whatsappTemplateId: 'ouiboo_refund_update_fr',
      variables: ['tripTitle', 'status'],
      smsBody:
        'Ouiboo : mise à jour de votre demande de remboursement pour « {{tripTitle}} » : {{status}}.',
    },
    ar: {
      whatsappTemplateId: 'ouiboo_refund_update_ar',
      variables: ['tripTitle', 'status'],
      smsBody:
        'Ouiboo: تحديث بخصوص طلب استردادكم لرحلة «{{tripTitle}}»: {{status}}.',
    },
    en: {
      whatsappTemplateId: 'ouiboo_refund_update_en',
      variables: ['tripTitle', 'status'],
      smsBody:
        'Ouiboo: update on your refund request for "{{tripTitle}}": {{status}}.',
    },
  },
  QUOTE_RECEIVED: {
    fr: {
      whatsappTemplateId: 'ouiboo_quote_received_fr',
      variables: ['tripTitle'],
      smsBody:
        'Ouiboo : vous avez reçu un devis pour « {{tripTitle}} ». Consultez-le dans votre espace Ouiboo.',
    },
    ar: {
      whatsappTemplateId: 'ouiboo_quote_received_ar',
      variables: ['tripTitle'],
      smsBody:
        'Ouiboo: توصّلتم بعرض سعر لرحلة «{{tripTitle}}». اطّلعوا عليه في حسابكم على Ouiboo.',
    },
    en: {
      whatsappTemplateId: 'ouiboo_quote_received_en',
      variables: ['tripTitle'],
      smsBody:
        'Ouiboo: you received a quote for "{{tripTitle}}". View it in your Ouiboo account.',
    },
  },
};

export function getMessagingTemplate(
  event: MessagingEvent,
  locale?: string | null,
): MessagingTemplate {
  return MESSAGING_TEMPLATES[event][normalizeMessagingLocale(locale)];
}

/** Render the SMS body with the given variables (missing = empty). */
export function renderSmsBody(
  template: MessagingTemplate,
  variables: Record<string, string>,
): string {
  return template.smsBody.replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
    variables[name] ?? '',
  );
}

/** Ordered WhatsApp template variables, in the template's declared order. */
export function templateVariables(
  template: MessagingTemplate,
  variables: Record<string, string>,
): string[] {
  return template.variables.map((name) => variables[name] ?? '');
}
