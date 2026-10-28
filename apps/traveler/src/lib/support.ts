/**
 * #419 (Council P0-16): the published OuiBoo support channels.
 *
 * Support is a solo, founder-run operation: one monitored inbox, plus —
 * during active trip periods — a founder escalation number (phone /
 * WhatsApp). Both channels are environment-configured:
 * NEXT_PUBLIC_SUPPORT_EMAIL and NEXT_PUBLIC_SUPPORT_PHONE.
 *
 * Council Session #3 P0-7/P0-8 (#555, #419): there is deliberately NO
 * hardcoded fallback address. The previous default published
 * support@ouiboo.com — a domain with no DNS, so mail to it can never
 * be received — on the support page, the booking escalation card and
 * the privacy convention. When a channel is not configured, the UI
 * omits it gracefully instead of publishing a dead one; the founder's
 * inbox/number decision (Session #2 B17) is what turns a channel on.
 */

/** The monitored support inbox, or null when none is configured. */
export const SUPPORT_EMAIL: string | null =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;

export const isSupportEmailConfigured = SUPPORT_EMAIL !== null;

/** mailto: href for the configured inbox, or null when unconfigured. */
export const supportMailto = (subject?: string): string | null => {
    if (!SUPPORT_EMAIL) return null;
    return subject
        ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
        : `mailto:${SUPPORT_EMAIL}`;
};

/** The founder escalation number (display form), or null when unset. */
export const SUPPORT_PHONE: string | null =
    process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || null;

export const isSupportPhoneConfigured = SUPPORT_PHONE !== null;

/** tel: href for the escalation number, or null when unconfigured. */
export const supportTelHref: string | null = SUPPORT_PHONE
    ? `tel:${SUPPORT_PHONE.replace(/[\s().-]/g, '')}`
    : null;

/** WhatsApp deep link for the escalation number, or null. */
export const supportWhatsAppHref: string | null = SUPPORT_PHONE
    ? `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, '')}`
    : null;
