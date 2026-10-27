/**
 * #546: multilingual trip content.
 *
 * A trip's title + description live in a language map stored on
 * `TripTemplate.translations` (Json), keyed by ISO language code:
 *
 *   { "fr": { "title": "...", "description": "..." },
 *     "ar": { "title": "...", "description": "..." } }
 *
 * The map is the scalable shape (the `cancellationPolicy` Json precedent):
 * adding a future language is a data change, never a schema change.
 *
 * FRENCH IS CANONICAL. The long-standing `title` / `description` columns
 * hold the French text and mirror `translations.fr` on every write, so
 * every pre-existing consumer (bookings, emails, admin, search) keeps
 * rendering exactly what it renders today. Other languages exist only in
 * the map; public payloads resolve them server-side per request locale.
 */

export interface TripTranslationEntry {
    title?: string;
    description?: string;
}

export type TripTranslationsMap = Record<string, TripTranslationEntry>;

/** The canonical language: required to publish, first fallback everywhere. */
export const TRIP_CANONICAL_LOCALE = 'fr';

const LOCALE_CODE_PATTERN = /^[a-z]{2,3}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
}

/**
 * Council Session #3 P0-6 (#554): the staging seed used to append its
 * bookkeeping marker (`[staging-seed-v1]`) to the user-visible
 * description field itself, and it rendered verbatim on trip pages.
 * The seed no longer writes it (identity is the demo agency + title),
 * but existing rows still carry it — strip any `[staging-seed-*]`
 * marker at this boundary so it can never reach a public payload,
 * whichever language version it sits in.
 */
const SEED_MARKER_PATTERN = /\s*\[staging-seed-[^\]]*\]\s*/g;

export function stripSeedMarker(value: string): string {
    return value.replace(SEED_MARKER_PATTERN, ' ').trim();
}

/**
 * Normalize a raw locale value coming from a query param, header, or a
 * map key: lowercases and drops any region suffix ('fr-MA' -> 'fr').
 * Returns undefined for anything that is not a plausible language code.
 */
export function normalizeTripLocale(raw?: string | null): string | undefined {
    if (typeof raw !== 'string') return undefined;
    const code = raw.split('-')[0]?.trim().toLowerCase();
    return code && LOCALE_CODE_PATTERN.test(code) ? code : undefined;
}

/**
 * Sanitize an untrusted translations payload into a storable map.
 * Unknown/garbage shapes degrade to an empty map instead of throwing —
 * the French gate (below) is what protects publish quality, and drafts
 * may legitimately be incomplete.
 */
export function normalizeTripTranslations(input: unknown): TripTranslationsMap {
    if (!isRecord(input)) return {};
    const out: TripTranslationsMap = {};
    for (const [rawCode, rawEntry] of Object.entries(input)) {
        const code = normalizeTripLocale(rawCode);
        if (!code || !isRecord(rawEntry)) continue;
        const entry: TripTranslationEntry = {};
        const title = cleanText(rawEntry.title);
        const description = cleanText(rawEntry.description);
        if (title) entry.title = title;
        if (description) entry.description = description;
        if (entry.title || entry.description) out[code] = entry;
    }
    return out;
}

/**
 * Build the map to persist for a trip. The French entry ALWAYS mirrors
 * the canonical columns (whichever French value the write carried —
 * map or columns — the columns win, because the columns are what the
 * rest of the platform renders).
 */
export function buildTripTranslations(
    input: unknown,
    french: { title?: string | null; description?: string | null },
): TripTranslationsMap {
    const map = normalizeTripTranslations(input);
    const frTitle = cleanText(french.title);
    const frDescription = cleanText(french.description);
    if (frTitle || frDescription) {
        map[TRIP_CANONICAL_LOCALE] = {
            ...(frTitle ? { title: frTitle } : {}),
            ...(frDescription ? { description: frDescription } : {}),
        };
    } else {
        delete map[TRIP_CANONICAL_LOCALE];
    }
    return map;
}

/**
 * True when the trip carries a complete FRENCH title + description.
 * French sources only (the map's `fr` entry, then the canonical
 * columns) — another language's text never satisfies the French gate.
 */
export function hasCompleteFrenchText(trip: {
    title?: string | null;
    description?: string | null;
    translations?: unknown;
}): boolean {
    const map = normalizeTripTranslations(trip.translations);
    const fr = map[TRIP_CANONICAL_LOCALE];
    const title = fr?.title ?? cleanText(trip.title);
    const description = fr?.description ?? cleanText(trip.description);
    return Boolean(title) && Boolean(description);
}

/**
 * Resolve the display title + description for a locale.
 * Fallback chain, per field: requested language -> French (the map's
 * `fr` entry, then the canonical columns) -> any available language.
 * A field is only empty when NO language version of it exists.
 */
export function resolveTripText(
    trip: {
        title?: string | null;
        description?: string | null;
        translations?: unknown;
    },
    locale?: string | null,
): { title: string; description: string; language: string } {
    const map = normalizeTripTranslations(trip.translations);
    const requested = normalizeTripLocale(locale);
    // Session #3 P0-11 (#546): every chain entry carries the language it
    // would resolve FROM, so the payload can tell the traveller which
    // language they are actually reading when it is not their own.
    const chain: Array<{ entry: TripTranslationEntry | undefined; language: string }> = [];
    if (requested && requested !== TRIP_CANONICAL_LOCALE) {
        chain.push({ entry: map[requested], language: requested });
    }
    chain.push({ entry: map[TRIP_CANONICAL_LOCALE], language: TRIP_CANONICAL_LOCALE });
    chain.push({
        entry: {
            title: cleanText(trip.title),
            description: cleanText(trip.description),
        },
        language: TRIP_CANONICAL_LOCALE,
    });
    for (const [code, entry] of Object.entries(map)) {
        chain.push({ entry, language: code });
    }

    const pick = (field: 'title' | 'description'): { value: string; language: string } => {
        for (const { entry, language } of chain) {
            const value = entry?.[field];
            if (value && value.trim() !== '') return { value: stripSeedMarker(value), language };
        }
        return { value: '', language: TRIP_CANONICAL_LOCALE };
    };

    const title = pick('title');
    const description = pick('description');
    return {
        title: title.value,
        description: description.value,
        // The headline language is what the reader perceives as "the
        // language of this trip"; the description only decides when
        // there is no title at all.
        language: title.value !== '' ? title.language : description.language,
    };
}

/**
 * Apply the locale resolution to a public payload: `title`/`description`
 * become the localized text while the full map stays available for
 * clients that render several languages (agency/admin editors use the
 * owner endpoints, which return the raw record untouched).
 */
export function localizeTripPayload<T extends {
    title?: string | null;
    description?: string | null;
    translations?: unknown;
}>(trip: T, locale?: string | null): T & { contentLanguage: string } {
    const resolved = resolveTripText(trip, locale);
    // Session #3 P0-11 (#546): additive payload field — the language the
    // title/description were actually resolved in, so the traveller UI
    // can say "shown in French" instead of failing silently in a
    // language the reader may not read.
    return { ...trip, title: resolved.title, description: resolved.description, contentLanguage: resolved.language };
}
