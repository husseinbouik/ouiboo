import { apiClient } from '@/lib/api-client';
import { TripCard, type TripCardTrip } from '@/components/TripCard';
import { Badge, Button } from '@ouiboo/ui';
import Link from 'next/link';
import { Compass, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getFeaturedTrips(): Promise<TripCardTrip[]> {
  try {
    let response = await apiClient.get('/trips?featured=true&status=ACTIVE');
    const directFeatured = Array.isArray(response.data) ? response.data : response.data?.data;

    if (directFeatured?.length) {
      return directFeatured;
    }

    response = await apiClient.get('/trips?status=ACTIVE&sortBy=popularity&sortOrder=desc&limit=12');
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error('Failed to load featured trips:', error);
    return [];
  }
}

export default async function FeaturedTripsPage() {
  const trips = await getFeaturedTrips();

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-6 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <Badge className="bg-sunset-orange/10 text-sunset-orange border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              Featured Collection
            </Badge>
            <h1 className="mt-4 text-5xl font-black font-display tracking-tight text-foreground">Handpicked Experiences</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              A launch-MVP shortlist of the strongest active trips across discovery, demand, and agency quality.
            </p>
          </div>
          <Link href="/search">
            <Button variant="outline" className="rounded-xl font-bold">
              <Compass className="h-4 w-4 mr-2" />
              Browse all trips
            </Button>
          </Link>
        </div>

        {trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-7 w-7 text-sunset-orange" />
            </div>
            <h2 className="mt-5 text-2xl font-black text-foreground">Featured trips are being refreshed</h2>
            <p className="mt-3 text-muted-foreground">
              Explore the full catalog while the team curates the next launch-ready list.
            </p>
            <div className="mt-6">
              <Link href="/search">
                <Button className="bg-sunset-orange hover:bg-orange-600 border-none">Explore trips</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

