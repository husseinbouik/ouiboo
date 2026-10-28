import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import TripDetailsClient from '@/components/TripDetailsClient';
import { buildTripMetadata } from '@/lib/trip-metadata';
import { getInitialLanguage, type SupportedLanguage } from '@ouiboo/i18n/server';

// ISR: revalidate trip pages every 60 seconds. First request renders on
// demand, subsequent requests serve the cached version. The window is short
// because trips are marketplace content that agencies edit (photos, price,
// sessions, availability) and changes must become visible to travelers
// quickly; a 1-hour window served stale pages long after edits landed.
// A possible future step is on-demand revalidation triggered by trip
// mutations in the API, which would make edits appear immediately.
export const revalidate = 60;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

async function fetchTrip(id: string, locale?: SupportedLanguage) {
  try {
    // #563 rework: ask the API for the trip in the visitor's locale —
    // without ?locale= the OG title/description resolved in the API
    // default (French) regardless of the served og:locale.
    const query = locale ? `?locale=${encodeURIComponent(locale)}` : '';
    const res = await fetch(`${API_URL}/trips/${id}${query}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchReviewStats(id: string) {
  try {
    const res = await fetch(`${API_URL}/trips/${id}/reviews/stats`, { next: { revalidate: 60 } });
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
  const locale = await getInitialLanguage();
  const trip = await fetchTrip(id, locale);
  // #468: shared builder — same result as the segment layout, so the
  // served OG/Twitter tags never depend on metadata merge order.
  // #563 rework: pass the locale so og:locale/alternateLocale are set.
  return buildTripMetadata(trip, { locale });
}

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getInitialLanguage();
  const [trip, reviewStats] = await Promise.all([fetchTrip(id, locale), fetchReviewStats(id)]);
  if (!trip) notFound();
  return <TripDetailsClient tripId={id} initialTrip={trip} initialReviewStats={reviewStats} />;
}
