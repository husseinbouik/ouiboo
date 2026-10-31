import { BadRequestException } from '@nestjs/common';

/**
 * Council S6 (#674 + #676) — publish-time guardrails for trip content.
 *
 * #674: a published trip carries exactly ONE cancellation scale — the
 * platform-structured bands stored on TripTemplate.cancellationPolicy
 * (validated by cancellation.util, snapshotted onto every booking at
 * creation, #417). Free-text agency cancellation/payment terms anywhere
 * in the trip's traveller-facing text are prohibited: they contradict
 * the structured scale on the same page (the Eden Voyages failure mode
 * that motivated the issue — a platform ladder beside pasted text
 * saying "ferme, non remboursable et non annulable" with 50%-deposit
 * terms). The checks here run at publish (and on edits that keep a
 * published trip published); drafts may be incomplete while composed,
 * but the agency editor flags the same patterns before submit.
 *
 * #676: a trip also cannot publish with neither a structured meeting
 * address nor pickupAvailable=true — a traveller who booked must have a
 * way to find the departure. Everything else about itinerary depth
 * (drive time, accommodation, meals) is a non-blocking completeness
 * nudge, computed here and surfaced by the publish responses/editor.
 */

export interface MeetingPoint {
    address?: string | null;
    mapsUrl?: string | null;
    pickupAvailable: boolean;
}

/** Normalize untrusted meeting-point input (DTO / stored Json). */
export function normalizeMeetingPoint(raw: unknown): MeetingPoint | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const address = typeof record.address === 'string' ? record.address.trim().slice(0, 300) : '';
    const mapsUrl = typeof record.mapsUrl === 'string' ? record.mapsUrl.trim().slice(0, 1000) : '';
    if (mapsUrl && !/^https?:\/\//i.test(mapsUrl)) {
        throw new BadRequestException('meetingPoint.mapsUrl must be an http(s) URL');
    }
    const pickupAvailable = record.pickupAvailable === true;
    if (!address && !mapsUrl && !pickupAvailable) return null;
    return {
        address: address || null,
        mapsUrl: mapsUrl || null,
        pickupAvailable,
    };
}

/** #676 publish gate: an address OR a pickup promise — one is required. */
export function hasPublishableMeetingPoint(meetingPoint: MeetingPoint | null): boolean {
    if (!meetingPoint) return false;
    return Boolean(meetingPoint.address?.trim()) || meetingPoint.pickupAvailable === true;
}

/**
 * The public (pre-booking) shape of a meeting point: AREA ONLY. The
 * exact address and the maps link are never exposed on public trip
 * payloads — they appear on the booking view (booking responses carry
 * the full structure to the traveller holding the booking).
 */
export function publicMeetingPoint(
    meetingPoint: MeetingPoint | null,
    area: string | null | undefined,
): { area: string | null; pickupAvailable: boolean } {
    return {
        area: area?.trim() ? area.trim() : null,
        pickupAvailable: meetingPoint?.pickupAvailable === true,
    };
}

/**
 * Prohibited free-text commercial terms (#674). Each pattern is a
 * cancellation/payment TERM stated as prose — refundability claims,
 * cancellation/payment policy headings, deposit/acompte percentages —
 * in the three catalogue languages (FR canonical, AR, EN). Ordinary
 * descriptive words ("deposit" for a hotel key card, a day titled
 * "Cancellation visit"…) do not match: a term must state a refund /
 * cancellation / payment condition.
 */
const PROHIBITED_TERM_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
    { label: 'non-refundable wording', pattern: /\bnon[-\s]?remboursable\b/i },
    { label: 'non-refundable wording', pattern: /\bnon[-\s]?refundable\b/i },
    { label: 'non-refundable wording', pattern: /\bno\s+refunds?\b/i },
    { label: 'non-refundable wording', pattern: /\bsans\s+remboursement\b/i },
    { label: 'non-refundable wording', pattern: /غير\s+قابل\s+للاسترداد/ },
    { label: 'non-cancellable wording', pattern: /\bnon[-\s]?annulable\b/i },
    { label: 'non-cancellable wording', pattern: /\bnon[-\s]?cancell?able\b/i },
    { label: 'non-cancellable wording', pattern: /غير\s+قابل\s+للإلغاء/ },
    { label: 'free-text cancellation policy', pattern: /\bcancellation\s+(policy|terms|conditions)\b/i },
    { label: 'free-text cancellation policy', pattern: /\bpolitique\s+d['’]annulation\b/i },
    { label: 'free-text cancellation policy', pattern: /\bconditions?\s+d['’]annulation\b/i },
    { label: 'free-text cancellation policy', pattern: /سياسة\s+الإلغاء/ },
    { label: 'free-text payment terms', pattern: /\bpayment\s+terms\b/i },
    { label: 'free-text payment terms', pattern: /\bconditions?\s+de\s+paiement\b/i },
    { label: 'free-text payment terms', pattern: /شروط\s+الدفع/ },
    // A percentage tied to a deposit/acompte or a refund states a term.
    { label: 'percentage deposit/payment term', pattern: /\b\d{1,3}\s?%\s*(de\s+|d['’]\s*)?(acompte|deposit|avance|down\s*payment)\b/i },
    { label: 'percentage deposit/payment term', pattern: /\b(acompte|deposit|avance|down\s*payment)\b[^.\n]{0,40}?\d{1,3}\s?%/i },
    { label: 'percentage deposit/payment term', pattern: /\b\d{1,3}\s?%\s*(de\s+)?(remboursement|refund)\b/i },
    { label: 'percentage deposit/payment term', pattern: /\b(remboursement|refund)\b[^.\n]{0,40}?\d{1,3}\s?%/i },
];

/** Every traveller-facing text of a trip, flattened for the scan. */
export function collectTripTexts(trip: {
    title?: string | null;
    description?: string | null;
    inclusions?: string[] | null;
    exclusions?: string[] | null;
    checklist?: string[] | null;
    itinerary?: Array<{
        title?: string | null;
        description?: string | null;
        activities?: string[] | null;
    }> | null;
    translations?: unknown;
}): string[] {
    const texts: string[] = [];
    const push = (value: unknown) => {
        if (typeof value === 'string' && value.trim()) texts.push(value);
    };
    push(trip.title);
    push(trip.description);
    for (const list of [trip.inclusions, trip.exclusions, trip.checklist]) {
        for (const item of list ?? []) push(item);
    }
    for (const day of trip.itinerary ?? []) {
        push(day?.title);
        push(day?.description);
        for (const activity of day?.activities ?? []) push(activity);
    }
    // Translations map: every language's title/description + sections.
    const walk = (value: unknown, depth: number) => {
        if (depth > 6 || value == null) return;
        if (typeof value === 'string') {
            texts.push(value);
            return;
        }
        if (Array.isArray(value)) {
            for (const item of value) walk(item, depth + 1);
            return;
        }
        if (typeof value === 'object') {
            for (const item of Object.values(value as Record<string, unknown>)) walk(item, depth + 1);
        }
    };
    walk(trip.translations, 0);
    return texts;
}

/** Distinct prohibited-term labels found in the given texts. */
export function findProhibitedCommercialTerms(texts: string[]): string[] {
    const found = new Set<string>();
    for (const text of texts) {
        for (const { label, pattern } of PROHIBITED_TERM_PATTERNS) {
            if (pattern.test(text)) found.add(label);
        }
    }
    return [...found];
}

/**
 * #674 publish gate. `policy` is the trip's post-write stored
 * cancellationPolicy (already normalized on write); it must be a
 * structured scale with at least one band — the platform default
 * fallback is a display resolution, not a publishable state, so a
 * publishing trip always carries ONE explicit structured scale.
 */
export function assertCommercialTermsPublishable(args: {
    cancellationPolicy: unknown;
    texts: string[];
}) {
    const policy = args.cancellationPolicy as { bands?: unknown } | null | undefined;
    if (!policy || !Array.isArray(policy.bands) || policy.bands.length === 0) {
        throw new BadRequestException(
            'A structured cancellation scale is required to publish a trip — set the trip cancellation bands in the editor (free-text cancellation terms are not accepted)',
        );
    }
    const prohibited = findProhibitedCommercialTerms(args.texts);
    if (prohibited.length > 0) {
        throw new BadRequestException(
            `Free-text cancellation/payment terms are not allowed on a published trip (${prohibited.join(', ')}) — the structured cancellation scale is the only cancellation text a trip may carry`,
        );
    }
}

/** #680 publish gate: a reachable agency emergency contact, or no publish. */
export function assertEmergencyContactPublishable(emergencyContactPhone: string | null | undefined) {
    if (!emergencyContactPhone?.trim()) {
        throw new BadRequestException(
            'An agency emergency contact is required to publish a trip — add the emergency contact name and phone in the agency settings (travellers holding a booking see it on their booking during the trip)',
        );
    }
}

/** #676 publish gate: meeting address or pickup, never neither. */
export function assertMeetingPointPublishable(meetingPoint: MeetingPoint | null) {
    if (!hasPublishableMeetingPoint(meetingPoint)) {
        throw new BadRequestException(
            'A meeting point is required to publish a trip — provide the meeting address or enable traveller pickup',
        );
    }
}

export interface ItineraryDayCompleteness {
    dayNumber: number;
    driveTimeMinutes?: number | null;
    accommodationName?: string | null;
    accommodationType?: string | null;
    mealsIncluded?: string[] | null;
}

/**
 * #676 completeness nudge: stable machine-readable warning codes for
 * itinerary depth gaps. Warnings only — publishing is never blocked by
 * these, and they are never shown to travellers as a defect.
 */
export function itineraryCompletenessWarnings(
    days: ItineraryDayCompleteness[] | null | undefined,
): string[] {
    const warnings: string[] = [];
    for (const day of days ?? []) {
        if (day.driveTimeMinutes == null) warnings.push(`DAY_${day.dayNumber}_MISSING_DRIVE_TIME`);
        if (!day.accommodationName?.trim() && !day.accommodationType) {
            warnings.push(`DAY_${day.dayNumber}_MISSING_ACCOMMODATION`);
        }
        if (!day.mealsIncluded || day.mealsIncluded.length === 0) {
            warnings.push(`DAY_${day.dayNumber}_MISSING_MEALS`);
        }
    }
    return warnings;
}
