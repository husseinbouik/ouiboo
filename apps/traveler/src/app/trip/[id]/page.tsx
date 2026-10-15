import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TripDetailsClient from '@/components/TripDetailsClient';

// ISR: revalidate trip pages every hour. First request renders on demand,
// subsequent requests serve the cached version.
export const revalidate = 3600;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

async function fetchTrip(id: string) {
  try {
    const res = await fetch(`${API_URL}/trips/${id}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchReviewStats(id: string) {
  try {
    const res = await fetch(`${API_URL}/trips/${id}/reviews/stats`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const trip = await fetchTrip(id);
  if (!trip) return { title: 'Trip not found — Ouiboo' };

  const title = `${trip.title} — Ouiboo`;
  const description =
    trip.description?.slice(0, 160) ||
    `Book ${trip.title}, a ${trip.durationDays}-day trip from ${trip.startLocation}.`;
  const image = trip.images?.[0];
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: image ? [{ url: image, alt: trip.title }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [trip, reviewStats] = await Promise.all([fetchTrip(id), fetchReviewStats(id)]);
  if (!trip) notFound();
  return <TripDetailsClient tripId={id} initialTrip={trip} initialReviewStats={reviewStats} />;
}
