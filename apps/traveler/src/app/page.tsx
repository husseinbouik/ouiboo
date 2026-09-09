import { apiClient } from '@/lib/api-client';
import HomeClient from './HomeClient';
import type { Metadata } from 'next';
import type { TripSession, TripTemplate, VerificationStatusType } from '@ouiboo/types';

type FeaturedTrip = TripTemplate & {
  sessions?: TripSession[];
  agency?: { verificationStatus?: VerificationStatusType } | null;
};

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: { url: '/' },
};

export const dynamic = 'force-dynamic';

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
    console.error('Failed to fetch featured trips:', error);
    return [];
  }
}

export default async function HomePage() {
  const featuredTrips = await getFeaturedTrips();

  return <HomeClient featuredTrips={featuredTrips} />;
}

