/**
 * Design Council Phase 4 — Trips list A: listing completeness.
 *
 * Derived ONLY from fields the agency trips API already returns on the
 * list payload (images, inclusions, sessions incl. price). Four signals,
 * weighted equally (25% each):
 * - photos: at least one photo uploaded (partial credit up to 3 photos)
 * - inclusions: at least one inclusion listed
 * - sessions: at least one session exists
 * - pricing: at least one session carries a positive price
 * Signals the list payload does not carry (e.g. future-session dates —
 * the summary only exposes price + booking counts) are NOT invented:
 * sessions/pricing are judged on presence, not dates.
 */
export type TripCompletenessInput = {
  images?: string[] | null;
  inclusions?: string[] | null;
  sessions?: Array<{ price?: number | null }> | null;
};

export type TripCompleteness = {
  percent: number;
  photos: boolean;
  inclusions: boolean;
  sessions: boolean;
  pricing: boolean;
  photoCount: number;
};

export function getTripCompleteness(trip: TripCompletenessInput): TripCompleteness {
  const photoCount = (trip.images ?? []).filter((img) => typeof img === 'string' && img.trim()).length;
  const photos = photoCount > 0;
  // Photos earn partial credit: 1 photo = 1/3 of the signal, 3+ = full.
  const photoScore = Math.min(photoCount, 3) / 3;
  const inclusions = (trip.inclusions ?? []).some((item) => typeof item === 'string' && item.trim());
  const sessions = (trip.sessions ?? []).length > 0;
  const pricing = (trip.sessions ?? []).some((s) => typeof s.price === 'number' && s.price > 0);
  const percent = Math.round(((photoScore + (inclusions ? 1 : 0) + (sessions ? 1 : 0) + (pricing ? 1 : 0)) / 4) * 100);
  return { percent, photos, inclusions, sessions, pricing, photoCount };
}
