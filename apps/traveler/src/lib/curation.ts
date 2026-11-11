import { BETA_DESTINATIONS } from "@ouiboo/types";

/**
 * #885 (Council S12 P0): the beta curation gate, as pure functions so
 * the published rule is unit-testable and the home page composes from
 * ONE catalogue fetch.
 *
 * The published rule (stated on the page, `featured.criteria`):
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

/** Localised text may arrive as a plain string or a language map. */
function locationText(value: unknown): string {
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
