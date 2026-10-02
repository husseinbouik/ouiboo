import { apiClient } from '@/lib/api-client';
import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
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

async function getFeaturedTrips() {
  try {
    const extractTrips = (payload: unknown): FeaturedTrip[] => {
      if (Array.isArray(payload)) return payload as FeaturedTrip[];
      if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
        return (payload as { data: FeaturedTrip[] }).data;
      }
      return [];
    };

    let response = await apiClient.get('/trips?featured=true&status=ACTIVE');
    let trips = extractTrips(response.data);
    if (trips.length === 0) {
      response = await apiClient.get('/trips?status=ACTIVE');
      trips = extractTrips(response.data);
    }
    return trips;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to fetch featured trips: ${message}`);
    return [];
  }
}

export default async function HomePage() {
  const featuredTrips = await getFeaturedTrips();

  return <HomeClient featuredTrips={featuredTrips} />;
}
// Trigger fresh traveler deployment
