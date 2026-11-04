import { randomBytes } from 'node:crypto';

/**
 * #684 (Council S6): custom-trip requests (private RFQ) — gate +
 * pseudonymisation rules.
 *
 * GATE: the feature is POST-OPINION by design. It exists only behind
 * CUSTOM_TRIP_REQUESTS_ENABLED, which defaults OFF in code and must
 * stay OFF in every environment until the Law 11-16 opinion expressly
 * covers lead distribution. With the flag off, every route answers
 * 404 — the feature presents as unavailable, nothing leaks.
 *
 * PRIVACY (Collision-1 launch form): a request is visible ONLY to
 * matched verified cluster agencies, and ONLY pseudonymised — the
 * public reference + trip facts. The traveller's identity/contact is
 * revealed ONLY to the accepted agency, ONLY after acceptance.
 */

export const CUSTOM_TRIP_REQUESTS_FLAG = 'CUSTOM_TRIP_REQUESTS_ENABLED';

/** Requests auto-expire after this many days without acceptance. */
export const CUSTOM_TRIP_REQUEST_TTL_DAYS = 14;

export function isCustomTripRequestsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return env[CUSTOM_TRIP_REQUESTS_FLAG] === 'true';
}

const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Pseudonymised public reference, e.g. CTR-7K2QX9. Rejection
 * sampling over the crypto bytes — a raw modulo would bias the
 * distribution (CodeQL js/biased-cryptographic-random). */
export function generateCustomTripPublicRef(): string {
    const alphabetSize = REF_ALPHABET.length;
    const limit = Math.floor(256 / alphabetSize) * alphabetSize;
    let suffix = '';
    while (suffix.length < 6) {
        const bytes = randomBytes(6 - suffix.length + 4);
        for (const byte of bytes) {
            if (byte >= limit) continue;
            suffix += REF_ALPHABET[byte % alphabetSize];
            if (suffix.length === 6) break;
        }
    }
    return `CTR-${suffix}`;
}

export interface CustomTripRequestRow {
    id: string;
    publicRef: string;
    travelerId: string;
    title: string;
    description?: string | null;
    category?: string;
    destinationSlug?: string | null;
    startLocation?: string | null;
    requestedStartDate: Date | string;
    requestedEndDate: Date | string;
    guestsCount: number;
    budgetMaxMad?: unknown;
    note?: string | null;
    status: string;
    expiresAt: Date | string;
    acceptedOfferId?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    traveler?: { email: string; name?: string | null } | null;
    offers?: unknown[];
    convertedTemplate?: { id: string } | null;
}

function iso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * The agency-facing shape. `revealIdentity` is true ONLY for the
 * accepted agency after acceptance — every other agency view is
 * pseudonymised: no travelerId, no name, no email, no note authored
 * with identity hints beyond what the traveller wrote as trip facts.
 */
export function toAgencyCustomTripView(
    row: CustomTripRequestRow,
    opts: { revealIdentity: boolean },
) {
    return {
        id: row.id,
        publicRef: row.publicRef,
        title: row.title,
        description: row.description ?? null,
        category: row.category ?? 'CULTURAL',
        destinationSlug: row.destinationSlug ?? null,
        startLocation: row.startLocation ?? null,
        requestedStartDate: iso(row.requestedStartDate),
        requestedEndDate: iso(row.requestedEndDate),
        guestsCount: row.guestsCount,
        budgetMaxMad: row.budgetMaxMad != null ? String(row.budgetMaxMad) : null,
        note: row.note ?? null,
        status: row.status,
        expiresAt: iso(row.expiresAt),
        acceptedOfferId: row.acceptedOfferId ?? null,
        convertedTemplateId: row.convertedTemplate?.id ?? null,
        offers: row.offers ?? [],
        traveler: opts.revealIdentity && row.traveler
            ? { email: row.traveler.email, name: row.traveler.name ?? null }
            : null,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
    };
}

/** Whether a stored request has passed its expiry while still open. */
export function isCustomTripExpired(row: { status: string; expiresAt: Date | string }, now = new Date()): boolean {
    return (row.status === 'PENDING' || row.status === 'QUOTED')
        && new Date(row.expiresAt).getTime() <= now.getTime();
}
