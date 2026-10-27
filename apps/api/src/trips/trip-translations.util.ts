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

/**
 * #584 (phase 2): one itinerary day's text inside a language entry.
 * Days align to the canonical ItineraryDay rows by `dayNumber`;
 * `activities` are free-text tags stored per day (verified in the API
 * DTO — they are `string[]`, not enum codes), so they localize as part
 * of the day's language-keyed content.
 */
export interface TripTranslationDay {
    dayNumber?: number;
    title?: string;
    description?: string;
    activities?: string[];
}

export interface TripTranslationEntry {
    title?: string;
    description?: string;
    /** #584: itinerary days in this language (aligned by dayNumber). */
    itinerary?: TripTranslationDay[];
    /** #584: whole-list translations — a non-empty list wins wholesale. */
    inclusions?: string[];
    exclusions?: string[];
    checklist?: string[];
}

/** The canonical (French) section content of a trip, as stored outside the map. */
export interface TripCanonicalSections {
    itinerary?: Array<{
        dayNumber: number;
        title?: string | null;
        description?: string | null;
        activities?: string[] | null;
    }> | null;
    inclusions?: string[] | null;
    exclusions?: string[] | null;
    checklist?: string[] | null;
}

export type TripTranslationsMap = Record<string, TripTranslationEntry>;

const LOCALE_CODE_PATTERN = /^[a-z]{2,3}$/;

/**
 * The canonical language: required to publish, first fallback
 * everywhere. Founder scalability rule (#584): the map itself is fully
 * language-agnostic — entries are keyed by any ISO code and nothing in
 * this module enumerates fr/ar/en. WHICH language is canonical is a
 * MARKET rule, not a data rule: French for the Morocco launch,
 * expressed as configuration (`TRIP_CONTENT_CANONICAL_LOCALE`) so a
 * future market changes one env value, never the schema or the code.
 */
const envCanonicalLocale = process.env.TRIP_CONTENT_CANONICAL_LOCALE
    ?.split('-')[0]
    ?.trim()
    .toLowerCase();
export const TRIP_CANONICAL_LOCALE =
    envCanonicalLocale && LOCALE_CODE_PATTERN.test(envCanonicalLocale)
        ? envCanonicalLocale
        : 'fr';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
}

/** #584: sanitize an untrusted string list (inclusions, activities, …). */
function cleanTextList(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const out = value
        .map((item) => cleanText(item))
        .filter((item): item is string => item !== undefined);
    return out.length > 0 ? out : undefined;
}

/** #584: sanitize one language entry's itinerary days. */
function cleanTranslationDays(value: unknown): TripTranslationDay[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const out: TripTranslationDay[] = [];
    for (const raw of value) {
        if (!isRecord(raw)) continue;
        const day: TripTranslationDay = {};
        if (typeof raw.dayNumber === 'number' && Number.isFinite(raw.dayNumber)) {
            day.dayNumber = Math.trunc(raw.dayNumber);
        }
        const title = cleanText(raw.title);
        const description = cleanText(raw.description);
        const activities = cleanTextList(raw.activities);
        if (title) day.title = title;
        if (description) day.description = description;
        if (activities) day.activities = activities;
        if (day.title || day.description || day.activities || day.dayNumber !== undefined) out.push(day);
    }
    return out.length > 0 ? out : undefined;
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
        // #584 (phase 2): section content rides in the same entry.
        const itinerary = cleanTranslationDays(rawEntry.itinerary);
        const inclusions = cleanTextList(rawEntry.inclusions);
        const exclusions = cleanTextList(rawEntry.exclusions);
        const checklist = cleanTextList(rawEntry.checklist);
        if (itinerary) entry.itinerary = itinerary;
        if (inclusions) entry.inclusions = inclusions;
        if (exclusions) entry.exclusions = exclusions;
        if (checklist) entry.checklist = checklist;
        if (entry.title || entry.description || entry.itinerary || entry.inclusions || entry.exclusions || entry.checklist) out[code] = entry;
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
    french: { title?: string | null; description?: string | null } & TripCanonicalSections,
): TripTranslationsMap {
    const map = normalizeTripTranslations(input);

    // #584: canonical day numbers, ascending — the alignment spine for
    // every language's itinerary (the form sends days positionally;
    // they are stamped with the canonical dayNumber here, at the write
    // boundary, so stored maps are always dayNumber-aligned).
    const canonicalDays = [...(french.itinerary ?? [])]
        .filter((day) => typeof day?.dayNumber === 'number')
        .sort((a, b) => a.dayNumber - b.dayNumber);
    const canonicalDayNumbers = canonicalDays.map((day) => day.dayNumber);
    if (canonicalDayNumbers.length > 0) {
        for (const [code, entry] of Object.entries(map)) {
            if (code === TRIP_CANONICAL_LOCALE || !entry.itinerary) continue;
            entry.itinerary = entry.itinerary.map((day, index) => ({
                ...day,
                dayNumber: day.dayNumber ?? canonicalDayNumbers[index],
            }));
        }
    }

    const frEntry: TripTranslationEntry = {};
    const frTitle = cleanText(french.title);
    const frDescription = cleanText(french.description);
    if (frTitle) frEntry.title = frTitle;
    if (frDescription) frEntry.description = frDescription;
    // #584: the French entry also mirrors the canonical sections.
    if (canonicalDays.length > 0) {
        frEntry.itinerary = canonicalDays.map((day) => ({
            dayNumber: day.dayNumber,
            ...(cleanText(day.title) ? { title: cleanText(day.title) } : {}),
            ...(cleanText(day.description) ? { description: cleanText(day.description) } : {}),
            ...(cleanTextList(day.activities) ? { activities: cleanTextList(day.activities) } : {}),
        }));
    }
    const frInclusions = cleanTextList(french.inclusions);
    const frExclusions = cleanTextList(french.exclusions);
    const frChecklist = cleanTextList(french.checklist);
    if (frInclusions) frEntry.inclusions = frInclusions;
    if (frExclusions) frEntry.exclusions = frExclusions;
    if (frChecklist) frEntry.checklist = frChecklist;

    if (Object.keys(frEntry).length > 0) {
        map[TRIP_CANONICAL_LOCALE] = frEntry;
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
 * #584 (phase 2): resolve the section content for a locale, same
 * fallback philosophy as resolveTripText (requested -> French -> any):
 *
 * - Lists (inclusions/exclusions/checklist) resolve WHOLESALE: the
 *   first chain source with a non-empty list wins (requested map entry
 *   -> canonical columns -> the map's `fr` entry -> any language).
 * - Itinerary resolves PER DAY and PER FIELD against the canonical day
 *   spine: requested entry's day -> canonical row -> the map's `fr`
 *   entry's day -> any language's day. The canonical row outranks the
 *   `fr` map mirror here because the row IS the write target (a partial
 *   PATCH can leave the mirror a step behind; it can never leave the
 *   row behind).
 */
export function resolveTripSections(
    trip: { translations?: unknown } & TripCanonicalSections,
    locale?: string | null,
): Required<Omit<TripCanonicalSections, 'itinerary'>> & {
    itinerary: Array<{ dayNumber: number; title: string; description: string; activities: string[] }>;
} {
    const map = normalizeTripTranslations(trip.translations);
    const requested = normalizeTripLocale(locale);
    const entries: Array<TripTranslationEntry | undefined> = [];
    if (requested && requested !== TRIP_CANONICAL_LOCALE) entries.push(map[requested]);
    entries.push(map[TRIP_CANONICAL_LOCALE]);
    for (const entry of Object.values(map)) entries.push(entry);

    const pickList = (field: 'inclusions' | 'exclusions' | 'checklist'): string[] => {
        if (requested && requested !== TRIP_CANONICAL_LOCALE) {
            const list = map[requested]?.[field];
            if (list && list.length > 0) return list;
        }
        const canonical = cleanTextList(trip[field]);
        if (canonical) return canonical;
        for (const entry of entries) {
            const list = entry?.[field];
            if (list && list.length > 0) return list;
        }
        return [];
    };

    const canonicalDays = [...(trip.itinerary ?? [])]
        .filter((day) => typeof day?.dayNumber === 'number')
        .sort((a, b) => a.dayNumber - b.dayNumber);
    const dayIn = (entry: TripTranslationEntry | undefined, dayNumber: number) =>
        entry?.itinerary?.find((day) => day.dayNumber === dayNumber);
    const itinerary = canonicalDays.map((row) => {
        const pickDayField = (field: 'title' | 'description'): string => {
            if (requested && requested !== TRIP_CANONICAL_LOCALE) {
                const value = dayIn(map[requested], row.dayNumber)?.[field];
                if (value) return stripSeedMarker(value);
            }
            const canonical = cleanText(row[field]);
            if (canonical) return stripSeedMarker(canonical);
            const fr = dayIn(map[TRIP_CANONICAL_LOCALE], row.dayNumber)?.[field];
            if (fr) return stripSeedMarker(fr);
            for (const entry of entries) {
                const value = dayIn(entry, row.dayNumber)?.[field];
                if (value) return stripSeedMarker(value);
            }
            return '';
        };
        const pickActivities = (): string[] => {
            if (requested && requested !== TRIP_CANONICAL_LOCALE) {
                const list = dayIn(map[requested], row.dayNumber)?.activities;
                if (list && list.length > 0) return list;
            }
            const canonical = cleanTextList(row.activities);
            if (canonical) return canonical;
            for (const entry of entries) {
                const list = dayIn(entry, row.dayNumber)?.activities;
                if (list && list.length > 0) return list;
            }
            return [];
        };
        return {
            // Keep the stored row's own fields (id, templateId, …) —
            // only the language-bearing fields are overridden.
            ...row,
            dayNumber: row.dayNumber,
            title: pickDayField('title'),
            description: pickDayField('description'),
            activities: pickActivities(),
        };
    });

    return {
        itinerary,
        inclusions: pickList('inclusions'),
        exclusions: pickList('exclusions'),
        checklist: pickList('checklist'),
    };
}

/**
 * #584 (phase 2): the French gate for sections. French is complete
 * when (a) every itinerary day that exists in ANY language (or in the
 * canonical rows) has a French title AND description — from the
 * canonical row or the map's `fr` entry — and (b) for each list, if
 * any language carries items, French carries items too (the canonical
 * column or the `fr` entry). Returns the missing pieces for the error
 * message; an empty array means complete.
 */
export function frenchSectionsMissing(
    trip: { translations?: unknown } & TripCanonicalSections,
): string[] {
    const map = normalizeTripTranslations(trip.translations);
    const fr = map[TRIP_CANONICAL_LOCALE];
    const missing: string[] = [];

    const dayNumbers = new Set<number>();
    for (const day of trip.itinerary ?? []) {
        if (typeof day?.dayNumber === 'number') dayNumbers.add(day.dayNumber);
    }
    for (const entry of Object.values(map)) {
        for (const day of entry.itinerary ?? []) {
            if (typeof day.dayNumber === 'number') dayNumbers.add(day.dayNumber);
        }
    }
    for (const dayNumber of [...dayNumbers].sort((a, b) => a - b)) {
        const canonical = (trip.itinerary ?? []).find((day) => day.dayNumber === dayNumber);
        const frDay = fr?.itinerary?.find((day) => day.dayNumber === dayNumber);
        const title = cleanText(canonical?.title) ?? frDay?.title;
        const description = cleanText(canonical?.description) ?? frDay?.description;
        if (!title || !description) missing.push(`itinerary day ${dayNumber}`);
    }

    for (const field of ['inclusions', 'exclusions', 'checklist'] as const) {
        const frenchHas = Boolean(cleanTextList(trip[field])) || Boolean(fr?.[field]?.length);
        if (frenchHas) continue;
        const anyHas = Object.values(map).some((entry) => (entry[field]?.length ?? 0) > 0);
        if (anyHas) missing.push(field);
    }
    return missing;
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
} & TripCanonicalSections>(trip: T, locale?: string | null): T & { contentLanguage: string } {
    const resolved = resolveTripText(trip, locale);
    // #584: sections resolve too — but only when the payload actually
    // carries them (list payloads don't select the itinerary relation;
    // their canonical lists still resolve through the map fallback).
    const sections = resolveTripSections(trip, locale);
    const withSections = {
        ...trip,
        ...(trip.itinerary !== undefined && trip.itinerary !== null ? { itinerary: sections.itinerary } : {}),
        ...(trip.inclusions !== undefined ? { inclusions: sections.inclusions } : {}),
        ...(trip.exclusions !== undefined ? { exclusions: sections.exclusions } : {}),
        ...(trip.checklist !== undefined ? { checklist: sections.checklist } : {}),
    };
    // Session #3 P0-11 (#546): additive payload field — the language the
    // title/description were actually resolved in, so the traveller UI
    // can say "shown in French" instead of failing silently in a
    // language the reader may not read.
    return { ...withSections, title: resolved.title, description: resolved.description, contentLanguage: resolved.language };
}
