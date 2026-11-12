import type { Metadata } from 'next';
import SearchClient, { type SearchInitialFilters } from '@/components/SearchClient';
import {
  durationBucketRange,
  isDestinationSlugValue,
  isDurationBucketKey,
  parseSortKey,
  sortKeyToApi,
  type SearchSortKey,
} from '@/lib/search-facets';
import { TripCategory, TripStatus } from '@ouiboo/types';
import { getInitialLanguage } from '@ouiboo/i18n/server';
import { getServerTranslations } from '@/lib/server-translations';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations();
  return {
    title: t('search.metaTitle'),
    description: t('search.metaDescription'),
    alternates: { canonical: '/search' },
  };
}

// SSR: the server reads searchParams, fetches the initial trip list, and
// passes it to the client component. All filter/pagination/sort interactivity
// stays client-side via React Query (seeded with initialData).

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

function parseFilters(sp: Record<string, string | string[] | undefined>): SearchInitialFilters {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v ?? '';
  };
  const q = get('q');
  const rawCategory = get('category');
  const normalizedCategory = rawCategory.toUpperCase();
  const category = Object.values(TripCategory).includes(normalizedCategory as TripCategory)
    ? normalizedCategory
    : rawCategory;
  // #675: destination + duration facets — the SSR seed must parse
  // them too, or the first paint would disagree with the URL (the
  // client validates them against the same configuration).
  const rawDestination = get('destination');
  const rawDuration = get('duration');
  return {
    category,
    destination: isDestinationSlugValue(rawDestination) ? rawDestination : '',
    duration: isDurationBucketKey(rawDuration) ? rawDuration : '',
    priceMax: get('priceMax'),
    searchQuery: q,
    dateFrom: get('date') || get('dateFrom'),
    dateTo: get('dateTo'),
    priceMin: get('priceMin'),
    // #440 rework: dates/availability/rating are first-class URL params
    // now — the SSR seed must parse them too, or the first paint (and
    // the client's initial-query seed check) would disagree with the URL.
    availabilityOnly: get('available') === 'true',
    freeCancellationOnly: get('freeCancellation') === 'true',
    ratingMin: (() => {
      const n = Number(get('ratingMin'));
      return Number.isFinite(n) && n > 0 ? n : 0;
    })(),
  };
}

async function fetchInitialTrips(filters: SearchInitialFilters, sort: SearchSortKey = 'newest') {
  // Search-page council item 5: the SSR fetch honours the URL's sort
  // key, so the seeded response matches the client's first query.
  const { sortBy, sortOrder } = sortKeyToApi(sort);
  const params = new URLSearchParams({
    status: TripStatus.Active,
    sortBy,
    sortOrder,
    page: '1',
    limit: '20',
    // #546: trip text in the visitor's language (client refetches keep
    // passing the active UI language via SearchClient).
    locale: await getInitialLanguage(),
  });
  if (filters.searchQuery) params.set('q', filters.searchQuery);
  if (filters.category) params.set('category', filters.category);
  if (filters.destination) params.set('destination', filters.destination);
  const durationRange = filters.duration ? durationBucketRange(filters.duration) : null;
  if (durationRange) {
    params.set('durationMin', String(durationRange.min));
    if (durationRange.max !== undefined) params.set('durationMax', String(durationRange.max));
  }
  if (filters.priceMin) params.set('priceMin', filters.priceMin);
  if (filters.priceMax) params.set('priceMax', filters.priceMax);
  if (filters.dateFrom) params.set('startDateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('startDateTo', filters.dateTo);
  if (filters.availabilityOnly) params.set('available', 'true');
  if (filters.freeCancellationOnly) params.set('freeCancellation', 'true');
  if (filters.ratingMin > 0) params.set('ratingMin', String(filters.ratingMin));
  try {
    const res = await fetch(`${API_URL}/trips?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initialFilters = parseFilters(sp);
  const rawSort = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const initialSort = parseSortKey(rawSort);
  const initialResponse = await fetchInitialTrips(initialFilters, initialSort);
  return (
    <SearchClient
      initialFilters={initialFilters}
      initialResponse={initialResponse}
      initialSort={initialSort}
    />
  );
}
