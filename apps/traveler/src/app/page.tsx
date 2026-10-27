import { apiClient } from '@/lib/api-client';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { getInitialLanguage } from '@ouiboo/i18n/server';
import type { TripSession, TripTemplate, VerificationStatusType } from '@ouiboo/types';

const HomeClient = dynamic(() => import('./HomeClient'));

type FeaturedTrip = TripTemplate & {
  sessions?: TripSession[];
  agency?: { verificationStatus?: VerificationStatusType } | null;
};

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
};

/**
 * #575: a catalogue fetch failure must not be swallowed into the same
 * empty array as a genuinely empty catalogue — an API outage rendered
 * as "No trips found" hides the outage from travellers (and from us).
 * The result therefore carries an explicit fetchFailed flag so the
 * home page can render its error state instead of the empty state.
 */
export interface FeaturedTripsResult {
  trips: FeaturedTrip[];
  fetchFailed: boolean;
}

async function getFeaturedTrips(): Promise<FeaturedTripsResult> {
  try {
    const extractTrips = (payload: unknown): FeaturedTrip[] => {
      if (Array.isArray(payload)) return payload as FeaturedTrip[];
      if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
        return (payload as { data: FeaturedTrip[] }).data;
      }
      return [];
    };

    // #546: ask the API for trip text in the visitor's language.
    const locale = await getInitialLanguage();
    let response = await apiClient.get(`/trips?featured=true&status=ACTIVE&locale=${locale}`);
    let trips = extractTrips(response.data);
    if (trips.length === 0) {
      response = await apiClient.get(`/trips?status=ACTIVE&locale=${locale}`);
      trips = extractTrips(response.data);
    }
    return { trips, fetchFailed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to fetch featured trips: ${message}`);
    return { trips: [], fetchFailed: true };
  }
}

export default async function HomePage() {
  const { trips: featuredTrips, fetchFailed } = await getFeaturedTrips();

  return <HomeClient featuredTrips={featuredTrips} featuredTripsFetchFailed={fetchFailed} />;
}
// Trigger fresh traveler deployment
