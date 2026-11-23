import { apiClient } from '@/lib/api-client';
import { effectiveDestinationSlug } from '@/lib/curation';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { getInitialLanguage } from '@ouiboo/i18n/server';
import type { TripSession, TripTemplate, VerificationStatusType } from '@ouiboo/types';
import { OG_LOCALES, SITE_COPY } from '@/lib/site';

const HomeClient = dynamic(() => import('./HomeClient'));

type FeaturedTrip = TripTemplate & {
  sessions?: TripSession[];
  agency?: { id?: string; verificationStatus?: VerificationStatusType } | null;
};

/**
 * #563 rework: this page previously exported a static `openGraph:
 * { url: '/' }`, which REPLACED the root layout's openGraph object in
 * Next's metadata merge — the deployed home page served no og:locale
 * at all. The metadata is generated per-locale here so the home page
 * serves og:locale + alternateLocale like every other surface.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getInitialLanguage();
  const copy = SITE_COPY[locale];
  return {
    alternates: { canonical: '/' },
    openGraph: {
      url: '/',
      title: copy.title,
      description: copy.description,
      locale: copy.ogLocale,
      alternateLocale: OG_LOCALES.filter((value) => value !== copy.ogLocale),
    },
  };
}

/**
 * #575: a catalogue fetch failure must not be swallowed into the same
 * empty array as a genuinely empty catalogue — an API outage rendered
 * as "No trips found" hides the outage from travellers (and from us).
 * The result therefore carries an explicit fetchFailed flag so the
 * home page can render its error state instead of the empty state.
 * #877/#885: hero suggestions and every home section derive from this
 * one catalogue fetch (the old featured-then-everything fallback and
 * the separate destinations fetch are gone).
 */
export interface CatalogResult {
  trips: FeaturedTrip[];
  fetchFailed: boolean;
}

/**
 * #885: ONE catalogue fetch feeds the whole home composition — the
 * featured rail is curated from it client-side under the published
 * rule (see lib/curation.ts), hero suggestions derive from it, and
 * "All beta trips" lists it in full. A failure is flagged, never
 * swallowed into an empty array (#575's rule, extended).
 */
async function getCatalogTrips(): Promise<CatalogResult> {
  try {
    const locale = await getInitialLanguage();
    const response = await apiClient.get(`/trips?status=ACTIVE&limit=100&locale=${locale}`);
    const payload: unknown = response.data;
    const trips: FeaturedTrip[] = Array.isArray(payload)
      ? (payload as FeaturedTrip[])
      : Array.isArray((payload as { data?: unknown })?.data)
        ? (payload as { data: FeaturedTrip[] }).data
        : [];
    return { trips, fetchFailed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to fetch catalogue trips: ${message}`);
    return { trips: [], fetchFailed: true };
  }
}

export default async function HomePage() {
  const locale = await getInitialLanguage();
  const { trips: catalogTrips, fetchFailed } = await getCatalogTrips();
  const catalogDestinations = [
    ...new Set(
      catalogTrips
        .map((trip) => effectiveDestinationSlug(trip))
        .filter(Boolean) as string[],
    ),
  ];

  return (
    <HomeClient
      catalogTrips={catalogTrips}
      featuredTripsFetchFailed={fetchFailed}
      catalogDestinations={catalogDestinations}
    />
  );
}
// Trigger fresh traveler deployment
