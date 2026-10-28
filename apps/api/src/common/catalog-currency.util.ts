/**
 * Council Session #2, B24(f) — beta catalogue admission rule, tracked
 * under #498: while the closed beta runs, the public catalogue is
 * MAD-only. The #498 fix made non-MAD prices render truthfully, but a
 * non-MAD trip must still not be listed or booked in the beta
 * configuration.
 *
 * This is configuration, not a hardcoded market assumption: the gate is
 * ON unless the MAD_ONLY_CATALOG env var is explicitly set to 'false'.
 * Turning it off is the deliberate multi-currency launch act. The
 * catalogue currency itself is named here, in one place, so expanding
 * the catalogue later touches this file and the gate call sites only.
 */
export const BETA_CATALOG_CURRENCY = 'MAD';

/** True unless MAD_ONLY_CATALOG is explicitly 'false'. */
export function isMadOnlyCatalogEnabled(): boolean {
    return process.env.MAD_ONLY_CATALOG !== 'false';
}

/**
 * Whether a trip/session currency may be listed and booked right now.
 * A missing currency reads as the schema default ('MAD' is the Prisma
 * default on both TripTemplate.currency and TripSession.currency), so
 * legacy rows without an explicit value stay admissible.
 */
export function isCatalogCurrencyAllowed(currency: string | null | undefined): boolean {
    if (!isMadOnlyCatalogEnabled()) return true;
    if (!currency) return true;
    return currency.toUpperCase() === BETA_CATALOG_CURRENCY;
}
