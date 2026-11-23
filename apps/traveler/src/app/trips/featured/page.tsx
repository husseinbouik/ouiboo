import { apiClient } from '@/lib/api-client';
import dynamic from 'next/dynamic';
import type { TripCardTrip } from '@/components/TripCard';
import { curateFeaturedTrips } from '@/lib/curation';
import { Badge, Button } from '@ouiboo/ui';
import Link from 'next/link';
import { Compass, Sparkles } from 'lucide-react';
import { getInitialLanguage } from '@ouiboo/i18n/server';
import { getServerTranslations } from '@/lib/server-translations';

const TripCard = dynamic(() => import('@/components/TripCard').then((m) => m.TripCard));

async function getFeaturedTrips(): Promise<TripCardTrip[]> {
  try {
    // #546: trip text in the visitor's language.
    const locale = await getInitialLanguage();
    const response = await apiClient.get(`/trips?status=ACTIVE&limit=100&locale=${locale}`);
    const catalogue: TripCardTrip[] = Array.isArray(response.data)
      ? response.data
      : response.data?.data ?? [];

    // #879/#885 (Council S12 P0): the page publishes the same rule the
    // home rail enforces — one trip per agency, agencies rotated
    // weekly, beta-cluster supply only — so the composition must be
    // produced by that rule (lib/curation.ts), not by the raw
    // agency-set featured flag. Previously an empty featured set
    // silently fell back to the top-12 trips by popularity and still
    // presented them as "Featured"; the page now falls through to
    // the honest empty state instead.
    return curateFeaturedTrips(catalogue);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Failed to load featured trips: ${message}`);
    return [];
  }
}

export default async function FeaturedTripsPage() {
  const { t } = await getServerTranslations();
  const trips = await getFeaturedTrips();

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-6 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <Badge className="bg-sunset-orange/10 text-sunset-orange border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              {t('featuredPage.badge')}
            </Badge>
            <h1 className="mt-4 text-5xl font-black font-display tracking-tight text-foreground">{t('featuredPage.title')}</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {t('featuredPage.subtitle')}
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-xl font-bold">
              <Link href="/search"><Compass className="h-4 w-4 mr-2" />
              {t('featuredPage.browseAll')}</Link>
            </Button>
        </div>

        {trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-7 w-7 text-sunset-orange" />
            </div>
            <h2 className="mt-5 text-2xl font-black text-foreground">{t('featuredPage.emptyTitle')}</h2>
            <p className="mt-3 text-muted-foreground">
              {t('featuredPage.emptySubtitle')}
            </p>
            <div className="mt-6">
              <Button asChild className="bg-sunset-orange hover:bg-orange-600 border-none">
              <Link href="/search">{t('featuredPage.explore')}</Link>
            </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
