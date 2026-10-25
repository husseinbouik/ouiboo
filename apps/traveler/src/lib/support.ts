/**
 * #419 (Council P0-16): the published OuiBoo support channel.
 *
 * Support is a single monitored inbox (founder-run, solo). The address
 * can be overridden per environment with NEXT_PUBLIC_SUPPORT_EMAIL;
 * the default follows the product's published @ouiboo.com convention
 * (privacy@ouiboo.com in the privacy policy).
 */
export const SUPPORT_EMAIL =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@ouiboo.com';

export const supportMailto = (subject?: string) =>
    subject
        ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
        : `mailto:${SUPPORT_EMAIL}`;
