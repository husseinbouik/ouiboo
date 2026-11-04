import { BETA_DESTINATIONS } from '@ouiboo/types';

/**
 * #675 (Council S6): destination derivation for the beta-cluster
 * taxonomy. The taxonomy itself is configuration (BETA_DESTINATIONS in
 * @ouiboo/types — exactly Tangier, Tétouan, Chefchaouen for the beta);
 * this helper maps a free-text startLocation onto a slug so writes can
 * stamp the normalised column and legacy rows can be backfilled with
 * the identical rule (the migration's UPDATEs mirror these aliases).
 */

/** Accent/case-insensitive comparison key for a location string. */
export function normalizeLocationText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/** The destination slug a free-text location belongs to, or null. */
export function deriveDestinationSlug(startLocation: string | null | undefined): string | null {
    if (!startLocation) return null;
    const normalized = normalizeLocationText(startLocation);
    for (const destination of BETA_DESTINATIONS) {
        for (const alias of destination.aliases) {
            // Arabic aliases have no accents/case to fold — match raw.
            if (startLocation.includes(alias) || normalized.includes(normalizeLocationText(alias))) {
                return destination.slug;
            }
        }
    }
    return null;
}

/** Whether a value is one of the configured destination slugs. */
export function isDestinationSlug(value: string | null | undefined): boolean {
    return !!value && BETA_DESTINATIONS.some((destination) => destination.slug === value);
}
