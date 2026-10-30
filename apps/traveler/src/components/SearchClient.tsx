"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";import {
  Search,
  Filter,
  Compass,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Button, Input, Badge, MobileFilterDrawer, TripCardSkeletonGrid } from "@ouiboo/ui";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@ouiboo/ui/utils";
import { TripCard } from "@/components/TripCard";
import { BETA_DESTINATIONS, TripCategory, TripStatus } from "@ouiboo/types";
import { useTripsQuery, type TripsQueryParams } from "@ouiboo/api-client";
import { useTranslation } from "react-i18next";

type SearchFilters = {
  category: string;
  /** #675: destination facet — a slug from BETA_DESTINATIONS, '' = any. */
  destination: string;
  /** #675: duration facet — a DURATION_BUCKETS key, '' = any. The
   * field existed in this type for years but was never parsed from
   * the URL, never serialized, and never sent to the API. */
  duration: string;
  priceMax: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  priceMin: string;
  availabilityOnly: boolean;
  ratingMin: number;
};

type FilterKey = keyof SearchFilters;
type SortBy = "price" | "rating" | "popularity" | "createdAt";
type SortOrder = "asc" | "desc";

export type SearchInitialFilters = SearchFilters;

/**
 * #675: duration facet buckets (trip length in days). The bucket key
 * travels in the `duration` URL param; the API receives the resolved
 * durationMin/durationMax range (its parameters existed and were
 * parsed server-side — the traveller side never sent them).
 */
export const DURATION_BUCKETS = [
  { key: "1", min: 1, max: 1 },
  { key: "2-3", min: 2, max: 3 },
  { key: "4-7", min: 4, max: 7 },
  { key: "8+", min: 8, max: undefined },
] as const;

export function durationBucketRange(key: string): { min: number; max?: number } | null {
  const bucket = DURATION_BUCKETS.find((candidate) => candidate.key === key);
  return bucket ? { min: bucket.min, max: bucket.max } : null;
}

export function isDurationBucketKey(key: string): boolean {
  return DURATION_BUCKETS.some((bucket) => bucket.key === key);
}

export function isDestinationSlugValue(value: string): boolean {
  return BETA_DESTINATIONS.some((destination) => destination.slug === value);
}

/**
 * #440: parse the complete filter set from the current URL params.
 * `date` is accepted as the legacy alias of `dateFrom` (the server page
 * does the same); everything else uses the canonical param names that
 * buildSearchParams writes.
 */
export function parseFiltersFromSearchParams(searchParams: URLSearchParams): SearchFilters {
  const rawCategory = searchParams.get("category") ?? "";
  // Normalize to uppercase to match TripCategory enum (#133)
  const normalizedCategory = rawCategory.toUpperCase();
  const category = Object.values(TripCategory).includes(normalizedCategory as TripCategory)
    ? normalizedCategory
    : rawCategory;
  const ratingRaw = Number(searchParams.get("ratingMin"));
  // #675: destination + duration facets — parsed from the URL and
  // validated against the configuration / bucket keys (anything else
  // is ignored rather than sent to the API).
  const rawDestination = searchParams.get("destination") ?? "";
  const rawDuration = searchParams.get("duration") ?? "";
  return {
    category,
    destination: isDestinationSlugValue(rawDestination) ? rawDestination : "",
    duration: isDurationBucketKey(rawDuration) ? rawDuration : "",
    priceMax: searchParams.get("priceMax") ?? "",
    searchQuery: searchParams.get("q") ?? "",
    dateFrom: searchParams.get("date") || searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") ?? "",
    priceMin: searchParams.get("priceMin") ?? "",
    availabilityOnly: searchParams.get("available") === "true",
    ratingMin: Number.isFinite(ratingRaw) && ratingRaw > 0 ? ratingRaw : 0,
  };
}

/** #440: serialize ALL filters — dropping one here re-creates the bug. */
export function buildSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.searchQuery) params.set("q", filters.searchQuery);
  if (filters.category) params.set("category", filters.category);
  if (filters.destination) params.set("destination", filters.destination);
  if (filters.duration) params.set("duration", filters.duration);
  if (filters.priceMin) params.set("priceMin", filters.priceMin);
  if (filters.priceMax) params.set("priceMax", filters.priceMax);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.availabilityOnly) params.set("available", "true");
  if (filters.ratingMin > 0) params.set("ratingMin", String(filters.ratingMin));
  return params;
}

export default function SearchClient({
  initialFilters,
  initialResponse,
}: {
  initialFilters: SearchInitialFilters;
  initialResponse: unknown;
}) {
  const { t, ready, i18n } = useTranslation();
  const TRIP_CATEGORIES = [
    { label: t('categories.adventure'), value: TripCategory.Adventure },
    { label: t('categories.cultural'), value: TripCategory.Cultural },
    { label: t('categories.luxury'), value: TripCategory.Luxury },
    { label: t('categories.budget'), value: TripCategory.Budget },
    { label: t('categories.nature'), value: TripCategory.Nature },
  ] as const;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQueryInput, setSearchQueryInput] = useState(initialFilters.searchQuery);
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // #440 (Council P1-15) rework: the URL is the single source of truth
  // for filters. They are re-parsed from useSearchParams() on EVERY
  // render, so in-page changes, shared deep links and back/forward
  // navigation all render exactly what the URL says — the previous
  // useState copy (seeded once, then partially re-hydrated by a
  // post-mount effect) drifted from the URL: its updater dropped
  // dates/availability/rating from the query string, and the query
  // kept serving the stale filter set until a full reload.
  const filters = useMemo<SearchFilters>(() => parseFiltersFromSearchParams(searchParams), [searchParams]);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const hasAdvancedFilters = Boolean(filters.dateFrom || filters.dateTo || filters.priceMin || filters.priceMax || filters.availabilityOnly);
  const advancedVisible = advancedFiltersOpen || hasAdvancedFilters;

  // The text input keeps a local echo for responsive typing; the URL
  // (and therefore the filters) is updated through the 300ms debounce
  // below. External URL changes (back/forward, a fresh deep link while
  // mounted) re-sync the echo — during typing the URL value is stable,
  // so this never clobbers an in-progress edit.
  useEffect(() => {
    setSearchQueryInput(filters.searchQuery);
  }, [filters.searchQuery]);

  const activeFiltersCount = useMemo(
    () =>
      Object.entries(filters).filter(([key, value]) => {
        if (key === "searchQuery") return false;
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value > 0;
        return value !== "";
      }).length,
    [filters],
  );

  // Every control writes ALL filter params via router.replace — a
  // replace (not push) per keystroke/slider move keeps history clean,
  // and serializing the complete next filter set means no param can be
  // silently dropped by a partial updater (the original #440 defect).
  const updateFilters = useCallback((patch: Partial<SearchFilters>) => {
    const nextFilters = { ...filters, ...patch };
    const params = buildSearchParams(nextFilters);
    const query = params.toString();
    router.replace(query ? `/search?${query}` : "/search");
    setCurrentPage(1);
  }, [filters, router, setCurrentPage]);

  const updateFilter = useCallback((key: FilterKey, value: SearchFilters[FilterKey]) => {
    updateFilters({ [key]: value } as Partial<SearchFilters>);
  }, [updateFilters]);

  // Debounce local input -> write `q` to the URL (which re-derives the
  // filters). Skips the write when the echo already matches the URL.
  useEffect(() => {
    if (searchQueryInput === filters.searchQuery) return;
    const id = setTimeout(() => {
      updateFilter("searchQuery", searchQueryInput);
    }, 300);
    return () => clearTimeout(id);
  }, [searchQueryInput, filters.searchQuery, updateFilter]);

  const queryParams = useMemo<TripsQueryParams>(() => {
    const params: TripsQueryParams = {
      status: TripStatus.Active,
      sortBy,
      sortOrder,
      page: currentPage,
      limit: 20,
      // #546: resolve trip titles/descriptions into the UI language.
      locale: i18n.language,
    };
    if (filters.searchQuery) params.q = filters.searchQuery;
    if (filters.category) params.category = filters.category;
    // #675: destination facet end to end (API parses ?destination=).
    if (filters.destination) params.destination = filters.destination;
    // #675: duration facet — bucket key resolved to the API range.
    const durationRange = filters.duration ? durationBucketRange(filters.duration) : null;
    if (durationRange) {
      params.durationMin = durationRange.min;
      if (durationRange.max !== undefined) params.durationMax = durationRange.max;
    }
    if (filters.priceMin) params.priceMin = Number(filters.priceMin);
    if (filters.priceMax) params.priceMax = Number(filters.priceMax);
    if (filters.dateFrom) params.startDateFrom = filters.dateFrom;
    if (filters.dateTo) params.startDateTo = filters.dateTo;
    if (filters.availabilityOnly) params.available = true;
    if (filters.ratingMin > 0) params.ratingMin = filters.ratingMin;
    return params;
  }, [filters, sortBy, sortOrder, currentPage, i18n.language]);

  // #440 (Council P1-15): the SSR response may only seed the query it was
  // fetched for (page 1, default sort, the initial filters). Seeding every
  // query key with it made in-page searches render the initial result set
  // as if it were the response for the new filters — stale results until a
  // full reload. Any deviation from the initial query must fetch fresh.
  const isInitialQuery =
    currentPage === 1 &&
    sortBy === "createdAt" &&
    sortOrder === "desc" &&
    filters.searchQuery === initialFilters.searchQuery &&
    filters.category === initialFilters.category &&
    filters.destination === initialFilters.destination &&
    filters.duration === initialFilters.duration &&
    filters.priceMin === initialFilters.priceMin &&
    filters.priceMax === initialFilters.priceMax &&
    filters.dateFrom === initialFilters.dateFrom &&
    filters.dateTo === initialFilters.dateTo &&
    filters.availabilityOnly === initialFilters.availabilityOnly &&
    filters.ratingMin === initialFilters.ratingMin;

  const { data: response, isLoading, error, isError } = useTripsQuery(queryParams, {
    placeholderData: keepPreviousData,
    // Seed from server-side fetch so first paint shows results without a loading flash.
    // React Query refetches when queryParams change (filters/pagination/sort).
    initialData: isInitialQuery ? (initialResponse as never) : undefined,
  });

  const trips = response?.data || [];
  const pagination = response?.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 };

  const clearAllFilters = () => {
    setSearchQueryInput("");
    setCurrentPage(1);
    setSortBy("createdAt");
    setSortOrder("desc");
    router.replace("/search");
  };

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (filters.destination) {
      chips.push({ label: t(`search.destinationNames.${filters.destination}`), onRemove: () => updateFilter("destination", "") });
    }
    if (filters.duration) {
      chips.push({ label: t(`search.durationBuckets.${filters.duration}`), onRemove: () => updateFilter("duration", "") });
    }
    if (filters.priceMin || filters.priceMax) {
      const min = filters.priceMin || "0";
      const max = filters.priceMax || "8";
      chips.push({ label: `Price: ${min}-${max} MAD`, onRemove: () => updateFilters({ priceMin: "", priceMax: "" }) });
    }
    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom ? new Date(filters.dateFrom).toLocaleDateString() : "any";
      const to = filters.dateTo ? new Date(filters.dateTo).toLocaleDateString() : "any";
      chips.push({ label: `Dates: ${from} - ${to}`, onRemove: () => updateFilters({ dateFrom: "", dateTo: "" }) });
    }
    if (filters.availabilityOnly) chips.push({ label: "Available Only", onRemove: () => updateFilter("availabilityOnly", false) });
    if (filters.ratingMin > 0) chips.push({ label: `Rating: ${filters.ratingMin}+`, onRemove: () => updateFilter("ratingMin", 0) });
    return chips;
  }, [filters, updateFilter, updateFilters, t]);

  const renderCategoryGroup = () => (
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase">{t('search.travelStyles')}</p>
        <div className="grid gap-2">
          {TRIP_CATEGORIES.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => updateFilter("category", filters.category === category.value ? "" : category.value)}
              aria-pressed={filters.category === category.value}
              className={cn(
                "px-3 py-2 rounded-lg text-sm text-left",
                filters.category === category.value ? "bg-sunset-orange/10 text-sunset-orange-dark" : "bg-muted",
              )}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
  );

  // #675: destination facet — exactly the configured beta-cluster
  // destinations; labels are localised names (proper nouns per locale).
  const renderDestinationGroup = () => (
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase">{t('search.destination')}</p>
        <div className="grid gap-2">
          {BETA_DESTINATIONS.map((destination) => (
            <button
              key={destination.slug}
              type="button"
              onClick={() => updateFilter("destination", filters.destination === destination.slug ? "" : destination.slug)}
              aria-pressed={filters.destination === destination.slug}
              className={cn(
                "px-3 py-2 rounded-lg text-sm text-left",
                filters.destination === destination.slug ? "bg-sunset-orange/10 text-sunset-orange-dark" : "bg-muted",
              )}
            >
              {t(`search.destinationNames.${destination.slug}`)}
            </button>
          ))}
        </div>
      </div>
  );

  // #675: duration facet — day-count buckets resolved to API ranges.
  const renderDurationGroup = () => (
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase">{t('search.duration')}</p>
        <div className="grid gap-2">
          {DURATION_BUCKETS.map((bucket) => (
            <button
              key={bucket.key}
              type="button"
              onClick={() => updateFilter("duration", filters.duration === bucket.key ? "" : bucket.key)}
              aria-pressed={filters.duration === bucket.key}
              className={cn(
                "px-3 py-2 rounded-lg text-sm text-left",
                filters.duration === bucket.key ? "bg-sunset-orange/10 text-sunset-orange-dark" : "bg-muted",
              )}
            >
              {t(`search.durationBuckets.${bucket.key}`)}
            </button>
          ))}
        </div>
      </div>
  );

  const renderDatesGroup = () => (
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase">{t('search.dates')}</p>
        <Input type="date" aria-label={t('search.startDate')} value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
        <Input type="date" aria-label={t('search.endDate')} value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
      </div>
  );

  const renderPriceGroup = () => (
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase">{t('search.price')}</p>
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" min="0" aria-label={t('search.minPrice')} placeholder={t('search.min')} value={filters.priceMin} onChange={(event) => updateFilter("priceMin", event.target.value)} />
          <Input type="number" min="0" aria-label={t('search.maxPrice')} placeholder={t('search.max')} value={filters.priceMax} onChange={(event) => updateFilter("priceMax", event.target.value)} />
        </div>
      </div>
  );

  const renderAvailabilityGroup = () => (
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase">{t('search.availability')}</p>
        <button type="button" onClick={() => updateFilter("availabilityOnly", !filters.availabilityOnly)} aria-pressed={filters.availabilityOnly} className={cn("px-3 py-2 rounded-lg w-full", filters.availabilityOnly ? "bg-success/10 text-success" : "bg-muted")}>{t('search.availabilityOnly')}</button>
      </div>
  );

  const renderSortGroup = () => (
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase">{t('search.sort')}</p>
        <div className="grid gap-2">
          {[
            { value: "createdAt", label: t('search.newest') },
            { value: "price", label: t('search.sortPrice') },
            { value: "rating", label: t('search.rating') },
            { value: "popularity", label: t('search.popularity') },
          ].map((option) => (
            <button key={option.value} type="button" onClick={() => setSortBy(option.value as SortBy)} aria-pressed={sortBy === option.value} className={cn("px-3 py-2 rounded-lg", sortBy === option.value ? "bg-sunset-orange/10" : "bg-muted")}>{option.label}</button>
          ))}
        </div>
      </div>
    
  );

  const renderFilterControls = () => (
    <div className="space-y-6">
      {renderCategoryGroup()}
      {renderDestinationGroup()}
      {renderDurationGroup()}
      {renderDatesGroup()}
      {renderPriceGroup()}
      {renderAvailabilityGroup()}
      {renderSortGroup()}
    </div>
  );

  // Desktop sidebar (#330 choice overload): travel styles + sort stay visible;
  // dates/price/availability collapse behind one toggle (auto-open when any
  // of them is active). The mobile drawer keeps the full set — it is already
  // behind a deliberate tap.
  const renderSidebarFilterControls = () => (
    <div className="space-y-6">
      {renderCategoryGroup()}
      {renderDestinationGroup()}
      {renderDurationGroup()}
      {renderSortGroup()}
      <div>
        <button
          type="button"
          onClick={() => setAdvancedFiltersOpen((value) => !value)}
          aria-expanded={advancedVisible}
          className="flex w-full items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm font-semibold"
        >
          {advancedVisible ? t('search.fewerFilters') : t('search.moreFilters')}
          <ChevronDown className={cn("h-4 w-4 transition-transform", advancedVisible && "rotate-180")} />
        </button>
        {advancedVisible && (
          <div className="mt-6 space-y-6">
            {renderDatesGroup()}
            {renderPriceGroup()}
            {renderAvailabilityGroup()}
          </div>
        )}
      </div>
    </div>
  );

  // Don't render until translations are ready to avoid raw key flash (#122)
  if (!ready) {
    return (
      <div className="min-h-screen bg-background font-sans text-foreground">
        <div className="pt-24 sm:pt-28 pb-6 sm:pb-8 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <TripCardSkeletonGrid />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="pt-24 sm:pt-28 pb-6 sm:pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold">{t('search.title')}</motion.h1>
          <div className="mt-6 max-w-3xl mx-auto">
            <div className="flex gap-3 bg-card p-2 rounded-2xl items-center">
              <div className="flex-1 flex items-center gap-3 px-4">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input value={searchQueryInput} onChange={(e) => setSearchQueryInput(e.target.value)} aria-label={t('search.placeholder')} placeholder={t('search.placeholder')} className="bg-transparent w-full outline-none" />
              </div>
              <Button onClick={() => updateFilter('searchQuery', searchQueryInput)}>{t('search.searchButton')}</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <MobileFilterDrawer
            hideAt="lg"
            open={filterDrawerOpen}
            onOpenChange={setFilterDrawerOpen}
            triggerLabel={`Filters${activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}`}
            description="Choose travel style, dates, budget, availability, and sorting."
            footer={(
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" onClick={clearAllFilters} disabled={activeFiltersCount === 0}>{t('search.clearAll')}</Button>
                <Button type="button" onClick={() => setFilterDrawerOpen(false)}>View {pagination.total} trips</Button>
              </div>
            )}
          >
            {renderFilterControls()}
          </MobileFilterDrawer>
          <span className="text-sm text-muted-foreground">{pagination.total} trips</span>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="bg-card p-5 rounded-2xl border border-border space-y-6 sticky top-28">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> {t('search.filters')}</h3>
                {activeFiltersCount > 0 && <button onClick={clearAllFilters} aria-label={t('search.clearAll')} className="text-sm text-muted-foreground">{t('search.clear')}</button>}
              </div>

              {renderSidebarFilterControls()}
            </div>
          </aside>

          <section className="flex-1" aria-label="Search results">
            {activeFilterChips.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {activeFilterChips.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Badge className="px-3 py-1 flex items-center gap-2">{c.label} <button onClick={c.onRemove} aria-label={`Remove filter ${c.label}`}><X className="h-3 w-3" /></button></Badge>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="mb-4 flex items-center justify-between bg-muted/50 p-3 rounded-lg border border-border">
              <div className="text-sm text-muted-foreground">{t('search.resultCount', { count: Number((pagination.page - 1) * pagination.limit + trips.length) || 0, total: Number(pagination.total) || 0 })}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSortOrder((state) => state === 'asc' ? 'desc' : 'asc')} aria-label={t('search.toggleSortOrder', 'Toggle sort order')} className="px-3 py-1 rounded-lg bg-muted">{sortOrder === 'asc' ? t('search.ascending', 'Asc') : t('search.descending', 'Desc')}</button>
              </div>
            </div>

            {isError && (
              <div className="p-6 bg-danger/10 border border-danger/20 rounded-lg text-center">
                <p className="font-semibold text-danger">{t('search.failedToLoad')}</p>
                <p className="text-sm text-danger/80 mt-1">{error instanceof Error ? error.message : 'Please try again'}</p>
                <div className="mt-3"><Button onClick={() => window.location.reload()}>{t('search.retry')}</Button></div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {isLoading ? (
                <TripCardSkeletonGrid count={4} className="md:col-span-2 sm:grid-cols-2 lg:grid-cols-2 gap-8" />
              ) : trips.length > 0 ? (
                <AnimatePresence>
                  {trips.map((trip, idx) => (
                    <motion.div key={trip.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                      <TripCard trip={trip} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="col-span-full py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><Compass className="h-6 w-6" /></div>
                  <h3 className="text-lg font-semibold">{t('search.noTrips')}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{t('search.noTripsHint', 'Try adjusting your filters or clearing them.')}</p>
                </div>
              )}
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} aria-label="Previous page" className="px-3 py-1 rounded-lg bg-muted"><ChevronLeft /></button>
                {Array.from({ length: pagination.totalPages }, (_,i)=>i+1).filter(p=>Math.abs(p-currentPage)<=2||p===1||p===pagination.totalPages).map(p=> (
                  <button key={p} onClick={()=>setCurrentPage(p)} aria-label={`Go to page ${p}`} aria-current={p === currentPage ? 'page' : undefined} className={cn('px-3 py-1 rounded-lg', p===currentPage?'bg-sunset-orange-dark text-white':'bg-muted')}>{p}</button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p+1))} disabled={currentPage===pagination.totalPages} aria-label="Next page" className="px-3 py-1 rounded-lg bg-muted"><ChevronRight /></button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

