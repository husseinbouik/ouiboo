import { BETA_DESTINATIONS } from "@ouiboo/types";

/**
 * #885 (Council S12 P0): the beta curation gate, as pure functions so
 * the published rule is unit-testable and the home page composes from
 * ONE catalogue fetch.
 *
 * The published rule (stated on the page, `featured.subtitle`):
 *   - at most ONE featured trip per agency;
 *   - the rail spans at least two agencies whenever at least two
 *     agencies have active trips (structural: one slot per agency);
 *   - the agency order ROTATES weekly, so no agency permanently owns
 *     the first slot or the last rail slot;
 *   - within an agency, a trip with upcoming departures wins, then
 *     a trip carrying the agency's featured flag, then the newest
 *     (champion order matches the published criteria line).
 *
 * Cluster scoping: on home, "featured" means cluster supply. Trips
 * outside the Tangier–Tétouan–Chefchaouen taxonomy (destinationSlug
 * null or another slug) are NOT eligible for the rail — they stay
 * reachable through "All beta trips" and search. A trip whose slug
 * was never stamped but whose startLocation names a cluster city IS
 * cluster supply (the API derives slugs from startLocation for
 * search facets the same way — destinations.util), so eligibility
 * uses the same derivation as a fallback.
 */

export interface CurationSession {
  startDate?: string | null;
  status?: string | null;
}

export interface CurationTrip {
  id: string;
  featured?: boolean | null;
  destinationSlug?: string | null;
  startLocation?: unknown;
  category?: string | null;
  createdAt?: string | null;
  agency?: { id?: string | null } | null;
  sessions?: CurationSession[] | null;
}

/** Localised text may arrive as a plain string or a language map.
 * Exported for the hero suggestion builder (lib/hero-suggestions.ts),
 * which matches and displays the same catalogue text. */
export function locationText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const map = value as Record<string, unknown>;
    for (const key of ['en', 'fr', 'ar']) {
      if (typeof map[key] === 'string') return map[key] as string;
    }
    for (const v of Object.values(map)) {
      if (typeof v === 'string') return v;
    }
  }
  return '';
}

/** Fold accents and case for destination-name matching. */
function foldName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Destination aliases per cluster slug, mirroring the API's
 * destinations.util derivation (EN/FR/AR spellings) so home
 * eligibility agrees with the API's destination facet.
 */
const CLUSTER_LOCATION_ALIASES: Record<string, string[]> = {
  tangier: ['tangier', 'tanger', 'طنجة'],
  tetouan: ['tetouan', 'tetuan', 'tétouan', 'تطوان'],
  chefchaouen: ['chefchaouen', 'chaouen', 'chefchaoun', 'شفشاون', 'الشاون'],
};

/** The cluster slug a trip belongs to: its stamped slug, else the
 * slug derived from its startLocation (same rule as the API facet). */
export function effectiveDestinationSlug(trip: CurationTrip): string | null {
  if (trip.destinationSlug && CLUSTER_DESTINATION_SLUGS.includes(trip.destinationSlug)) {
    return trip.destinationSlug;
  }
  if (trip.destinationSlug) return null; // stamped non-cluster slug
  const text = foldName(locationText(trip.startLocation));
  if (!text) return null;
  for (const [slug, aliases] of Object.entries(CLUSTER_LOCATION_ALIASES)) {
    if (aliases.some((alias) => text.includes(foldName(alias)))) return slug;
  }
  return null;
}

/** The beta cluster slugs, in display order (taxonomy order). */
export const CLUSTER_DESTINATION_SLUGS: string[] = BETA_DESTINATIONS.map((d) => d.slug as string);

const FEATURED_RAIL_SIZE = 3;

/** ISO-8601 week number — the rotation quantum for the rail. */
export function isoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
}

function hasUpcomingDeparture(trip: CurationTrip, now: Date): boolean {
  return (trip.sessions ?? []).some((session) => {
    if (!session?.startDate) return false;
    const start = new Date(session.startDate).getTime();
    return Number.isFinite(start) && start >= now.getTime();
  });
}

/** An agency's rail candidate: upcoming departures first (the
 * published criteria promises them), then the agency's featured
 * flag, then the newest trip. */
function agencyChampion<T extends CurationTrip>(trips: T[], now: Date): T {
  return [...trips].sort((a, b) => {
    const upcoming = Number(hasUpcomingDeparture(b, now)) - Number(hasUpcomingDeparture(a, now));
    if (upcoming !== 0) return upcoming;
    const flag = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    if (flag !== 0) return flag;
    return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
  })[0];
}

/**
 * Compose the featured rail from the full active catalogue:
 * cluster-eligible trips only, one champion per agency, agencies
 * ordered deterministically (by agency id) then rotated by ISO week,
 * capped at the rail size. With fewer agencies than slots the rail is
 * simply shorter — never backfilled with a second trip per agency or
 * with out-of-cluster supply.
 */
export function curateFeaturedTrips<T extends CurationTrip>(trips: T[], now: Date = new Date()): T[] {
  const byAgency = new Map<string, T[]>();
  for (const trip of trips) {
    if (!effectiveDestinationSlug(trip)) continue;
    const agencyId = trip.agency?.id;
    if (!agencyId) continue;
    const group = byAgency.get(agencyId) ?? [];
    group.push(trip);
    byAgency.set(agencyId, group);
  }
  const agencyIds = [...byAgency.keys()].sort();
  if (agencyIds.length === 0) return [];
  const rotation = isoWeekNumber(now) % agencyIds.length;
  const rotated = [...agencyIds.slice(rotation), ...agencyIds.slice(0, rotation)];
  return rotated
    .slice(0, FEATURED_RAIL_SIZE)
    .map((agencyId) => agencyChampion(byAgency.get(agencyId)!, now));
}

/** Active-trip counts per cluster destination slug (zero-filled).
 * Unstamped trips count under the slug their startLocation derives
 * to, matching the API facet. */
export function countTripsByDestination<T extends CurationTrip>(trips: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const slug of CLUSTER_DESTINATION_SLUGS) counts[slug] = 0;
  for (const trip of trips) {
    const slug = effectiveDestinationSlug(trip);
    if (slug) counts[slug] += 1;
  }
  return counts;
}

/** Active-trip counts per category key (upper-case API values). */
export function countTripsByCategory<T extends CurationTrip>(trips: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const trip of trips) {
    if (!trip.category) continue;
    const key = String(trip.category).toUpperCase();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/**
 * Round 2 (founder decision 2026-11-11, superseding #885's home
 * "All trips" listing): the coverage showcase. Instead of listing
 * every trip, home shows the honest map — destinations WITH trips
 * (live counts) and, via `tripsCoverPlace`, well-known places with
 * none yet. The cluster destinations are NOT repeated here: "Start
 * in the North" directly above already covers them.
 */

export interface ShowcaseDestination {
  /** Display place name (the catalogue's own startLocation text,
   * country suffix stripped — "Merzouga, Morocco" → "Merzouga"). */
  name: string;
  count: number;
  /** A photo from the destination's own trips, or null. */
  photo: string | null;
  minPrice: number | null;
  priceCurrency: string | null;
}

export interface ShowcaseTrip extends CurationTrip {
  title?: unknown;
  images?: string[] | null;
  currency?: string | null;
  sessions?:
    | Array<CurationSession & { price?: number | string | null; currency?: string | null }>
    | null;
}

/** The stable identity of a photo URL (its Unsplash photo-id token;
 * the URL itself for non-Unsplash media), for page-wide dedupe. */
export function photoIdOf(url: string): string {
  const match = /photo-[0-9a-z-]+/i.exec(url);
  return match ? match[0].toLowerCase() : url;
}

/** "Merzouga, Morocco" and "Merzouga" are one destination. */
export function stripCountrySuffix(name: string): string {
  return name.replace(/,?\s*(morocco|maroc|المغرب)\s*$/i, '').trim();
}

/**
 * Group the non-cluster catalogue by destination: live counts, a
 * from-price, and one representative photo per destination. The
 * photo prefers a trip whose title names the place, and skips any
 * photo the caller already shows elsewhere on the page
 * (`excludedPhotoIds` — the fixed assets), so no photograph ever
 * appears twice on home. Sorted by count, then name; capped.
 */
export function showcaseDestinations<T extends ShowcaseTrip>(
  trips: T[],
  excludedPhotoIds: readonly string[] = [],
  limit = 8,
): ShowcaseDestination[] {
  const groups = new Map<string, { name: string; trips: T[] }>();
  for (const trip of trips) {
    if (effectiveDestinationSlug(trip)) continue; // cluster: covered above
    const raw = locationText(trip.startLocation);
    if (!raw) continue;
    const name = stripCountrySuffix(raw);
    if (!name) continue;
    const key = foldName(name);
    const group = groups.get(key) ?? { name, trips: [] };
    group.trips.push(trip);
    groups.set(key, group);
  }
  const excluded = new Set(excludedPhotoIds.map((id) => id.toLowerCase()));
  const result: ShowcaseDestination[] = [];
  for (const [key, group] of groups) {
    const byTitle = [...group.trips].sort((a, b) =>
      locationText(a.title).localeCompare(locationText(b.title)),
    );
    const photoOrder = [
      ...byTitle.filter((trip) => foldName(locationText(trip.title)).includes(key)),
      ...byTitle.filter((trip) => !foldName(locationText(trip.title)).includes(key)),
    ];
    let photo: string | null = null;
    for (const trip of photoOrder) {
      for (const image of trip.images ?? []) {
        if (image && !excluded.has(photoIdOf(image))) { photo = image; break; }
      }
      if (photo) break;
    }
    let minPrice: number | null = null;
    let priceCurrency: string | null = null;
    for (const trip of group.trips) {
      for (const session of trip.sessions ?? []) {
        const price = Number(session?.price);
        if (!Number.isFinite(price) || price <= 0) continue;
        if (minPrice === null || price < minPrice) {
          minPrice = price;
          priceCurrency = session?.currency ?? trip.currency ?? null;
        }
      }
    }
    result.push({ name: group.name, count: group.trips.length, photo, minPrice, priceCurrency });
  }
  return result
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/**
 * Does any trip in the catalogue start at a place matching these
 * aliases (EN/FR/AR spellings)? The showcase's "not covered yet"
 * tiles are filtered through this, so the section can never claim
 * a place has no trips while trips exist there.
 */
export function tripsCoverPlace<T extends CurationTrip>(trips: T[], aliases: string[]): boolean {
  return trips.some((trip) => {
    const text = foldName(locationText(trip.startLocation));
    if (!text) return false;
    return aliases.some((alias) => text.includes(foldName(alias)));
  });
}
