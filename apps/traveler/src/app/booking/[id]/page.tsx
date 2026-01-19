'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function BookingRedirectPage() {
  const { id } = useParams();
  const tripId = Array.isArray(id) ? id[0] : id;
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!tripId) {
      return;
    }
    const session = searchParams.get('session');
    const guests = searchParams.get('guests');
    const query = new URLSearchParams();
    if (session) {
      query.set('session', session);
    }
    if (guests) {
      query.set('guests', guests);
    }
    const queryString = query.toString();
    const target = queryString ? `/checkout/${tripId}?${queryString}` : `/checkout/${tripId}`;
    router.replace(target);
  }, [tripId, searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Redirecting to checkout...
    </div>
  );
}
