import type { Metadata } from 'next';
import SearchClient, { type SearchInitialFilters } from '@/components/SearchClient';
import { TripCategory, TripStatus } from '@ouiboo/types';

export const metadata: Metadata = {
  title: 'Explore trips — Ouiboo',
  description: 'Search and filter handpicked travel experiences across Morocco and beyond.',
};

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
  return {
    category,
    duration: '',
    priceMax: get('priceMax'),
    searchQuery: q,
    dateFrom: get('date') || get('dateFrom'),
    dateTo: get('dateTo'),
    priceMin: get('priceMin'),
    availabilityOnly: false,
    ratingMin: 0,
  };
}

async function fetchInitialTrips(filters: SearchInitialFilters) {
  const params = new URLSearchParams({
    status: TripStatus.Active,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: '1',
    limit: '20',
  });
  if (filters.searchQuery) params.set('q', filters.searchQuery);
  if (filters.category) params.set('category', filters.category);
  if (filters.priceMin) params.set('priceMin', filters.priceMin);
  if (filters.priceMax) params.set('priceMax', filters.priceMax);
  if (filters.dateFrom) params.set('startDateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('startDateTo', filters.dateTo);
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
  const initialResponse = await fetchInitialTrips(initialFilters);
  return <SearchClient initialFilters={initialFilters} initialResponse={initialResponse} />;
}
