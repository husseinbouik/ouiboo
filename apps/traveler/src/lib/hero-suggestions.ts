import { BETA_DESTINATIONS } from "@ouiboo/types";
import {
  countTripsByDestination,
  effectiveDestinationSlug,
  locationText,
  showcaseDestinations,
  stripCountrySuffix,
  type ShowcaseTrip,
} from "./curation";
import { normalizeDestinationText } from "./hero-search";
import { COVERAGE_IMAGES, DESTINATION_IMAGES, NON_PLACE_PHOTO_IDS, STATIC_HOME_PHOTO_IDS } from "./static-imagery";

/**
 * Search-Interface Council adoption (#938; punch items 1, 10, 12):
 * the hero search's suggestion model, computed LOCALLY from the
 * catalogue already in page props — per-keystroke suggestion
 * fetches are banned by the build spec (#894, item 7).
 *
 * The model carries three strictly separated sections:
 *  - `destinations`: every place with at least one live trip —
 *    the complete list, never a silent top-N (item 10; the
 *    council's blind renders dropped Marrakech, 3 trips). Order is
 *    a stated rule: configured cluster destinations first, in
 *    taxonomy order, then the remaining places by live count
 *    (desc), then name — the same rule the first-screen tile row
 *    (#942) renders, so panel and tiles never disagree.
 *  - `trips`: trip-level suggestions for a typed query, capped at
 *    one per agency (fairness, item 10), rendered from the live
 *    record (title / place / duration / from-price).
 *  - `zeroPlaces`: configured places with ZERO trips. Debate D3:
 *    these never appear inside the suggestion listbox — the
 *    component renders them in a separate headed region of the
 *    panel as plain text. Presence in the list would say
 *    "bookable"; a headed disclosure outside it says "not yet"
 *    (#877, as amended on that issue).
 */

export interface HeroSuggestionTrip extends ShowcaseTrip {
  durationDays?: number | null;
}

export interface DestinationSuggestion {
  /** Cluster slug for a configured beta destination, else null
   * (the place is reached through the free-text `q` param, exactly
   * as the coverage tiles link today). */
  slug: string | null;
  name: string;
  count: number;
  minPrice: number | null;
  priceCurrency: string | null;
  /** The tile-row photograph under the #898 discipline (curated
   * statics first, audited media picks second, null = graded). */
  photo: string | null;
  href: string;
}

export interface TripSuggestion {
  id: string;
  title: string;
  place: string;
  durationDays: number | null;
  minPrice: number | null;
  priceCurrency: string | null;
  href: string;
}

export interface ZeroPlace {
  slug: string;
  name: string;
  /** Curated static photograph when one exists (Tétouan has a
   * verified medina photo, #898) — the tile row shows it with the
   * "No trips yet" label; never desaturation as the only signal. */
  photo: string | null;
}

export interface HeroSuggestions {
  destinations: DestinationSuggestion[];
  trips: TripSuggestion[];
  zeroPlaces: ZeroPlace[];
  totalTrips: number;
}

const TRIP_SUGGESTION_CAP = 5;

function minSessionPrice(
  trips: HeroSuggestionTrip[],
): { minPrice: number | null; priceCurrency: string | null } {
  let minPrice: number | null = null;
  let priceCurrency: string | null = null;
  for (const trip of trips) {
    for (const session of trip.sessions ?? []) {
      const price = Number(session?.price);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (minPrice === null || price < minPrice) {
        minPrice = price;
        priceCurrency = session?.currency ?? trip.currency ?? null;
      }
    }
  }
  return { minPrice, priceCurrency };
}

function matchesQuery(needle: string, names: string[]): boolean {
  if (!needle) return true;
  return names.some((name) => normalizeDestinationText(name).includes(needle));
}

export function buildHeroSuggestions(
  trips: HeroSuggestionTrip[],
  query: string,
  localizedNames: Record<string, string> = {},
): HeroSuggestions {
  const needle = normalizeDestinationText(query);
  const clusterCounts = countTripsByDestination(trips);

  const destinations: DestinationSuggestion[] = [];
  const zeroPlaces: ZeroPlace[] = [];

  // Configured cluster destinations, in taxonomy order.
  for (const destination of BETA_DESTINATIONS) {
    const slug = destination.slug as string;
    const name = localizedNames[slug] ?? slug;
    const count = clusterCounts[slug] ?? 0;
    if (count === 0) {
      if (matchesQuery(needle, [name, slug, ...destination.aliases])) {
        zeroPlaces.push({ slug, name, photo: DESTINATION_IMAGES[slug] ?? null });
      }
      continue;
    }
    if (!matchesQuery(needle, [name, slug, ...destination.aliases])) continue;
    const clusterTrips = trips.filter((trip) => effectiveDestinationSlug(trip) === slug);
    const { minPrice, priceCurrency } = minSessionPrice(clusterTrips);
    destinations.push({
      slug,
      name,
      count,
      minPrice,
      priceCurrency,
      photo: DESTINATION_IMAGES[slug] ?? null,
      href: `/search?destination=${slug}`,
    });
  }

  // Everywhere else the catalogue reaches, grouped by place with
  // the coverage showcase's photo discipline (no photo twice on
  // the page, no audited non-place photo) — the tile row renders
  // exactly this pick.
  const showcase = showcaseDestinations(trips, [...STATIC_HOME_PHOTO_IDS, ...NON_PLACE_PHOTO_IDS], 50);
  for (const place of showcase) {
    if (!matchesQuery(needle, [place.name])) continue;
    const curated = COVERAGE_IMAGES[place.name.toLowerCase().replace(/\s+/g, "")];
    destinations.push({
      slug: null,
      name: place.name,
      count: place.count,
      minPrice: place.minPrice,
      priceCurrency: place.priceCurrency,
      photo: curated ?? place.photo,
      href: `/search?q=${encodeURIComponent(place.name)}`,
    });
  }

  // Trip-level suggestions: typed queries only, one per agency.
  const tripSuggestions: TripSuggestion[] = [];
  if (needle) {
    const seenAgencies = new Set<string>();
    for (const trip of trips) {
      if (tripSuggestions.length >= TRIP_SUGGESTION_CAP) break;
      const title = locationText(trip.title);
      const place = stripCountrySuffix(locationText(trip.startLocation));
      if (!matchesQuery(needle, [title, place])) continue;
      const agencyKey = trip.agency?.id ?? trip.id;
      if (seenAgencies.has(agencyKey)) continue;
      seenAgencies.add(agencyKey);
      const { minPrice, priceCurrency } = minSessionPrice([trip]);
      tripSuggestions.push({
        id: trip.id,
        title,
        place,
        durationDays: trip.durationDays ?? null,
        minPrice,
        priceCurrency,
        href: `/trip/${trip.id}`,
      });
    }
  }

  return { destinations, trips: tripSuggestions, zeroPlaces, totalTrips: trips.length };
}
