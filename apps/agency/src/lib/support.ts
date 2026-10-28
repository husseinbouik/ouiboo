/**
 * Session #3 P0-9 (#556): the agency app's route to OuiBoo support.
 *
 * Same model as the traveller app (apps/traveler/src/lib/support.ts):
 * the monitored inbox comes only from NEXT_PUBLIC_SUPPORT_EMAIL. There
 * is no hardcoded fallback address — the previous traveller default
 * published an address on a domain with no DNS. When no inbox is
 * configured for this app, the support block explains the beta channel
 * (the contact who onboarded the agency) without inventing an address.
 */
export const SUPPORT_EMAIL: string | null =
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;

export const isSupportEmailConfigured = SUPPORT_EMAIL !== null;

export const supportMailto: string | null = SUPPORT_EMAIL
    ? `mailto:${SUPPORT_EMAIL}`
    : null;
