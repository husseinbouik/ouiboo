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
} from "lucide-react";
import { Button, Input, Badge, MobileFilterDrawer, TripCardSkeletonGrid } from "@ouiboo/ui";
import { motion } from "framer-motion";
import { cn } from "@ouiboo/ui/utils";
import { TripCard } from "@/components/TripCard";
import { BETA_DESTINATIONS, TripCategory, TripStatus } from "@ouiboo/types";
import { useTripsQuery, type TripsQueryParams } from "@ouiboo/api-client";
import { useTranslation } from "react-i18next";
import {
  DURATION_BUCKETS,
  durationBucketRange,
  isDestinationSlugValue,
  isDurationBucketKey,
  parseSortKey,
  sortKeyToApi,
  type SearchSortKey,
} from "@/lib/search-facets";
import { countTripsByDestination, type CurationTrip } from "@/lib/curation";

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
  /** #687: free-cancellation filter (standardised definition). */
  freeCancellationOnly: boolean;
  ratingMin: number;
};

type FilterKey = keyof SearchFilters;

export type SearchInitialFilters = SearchFilters;

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
    freeCancellationOnly: searchParams.get("freeCancellation") === "true",
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
  if (filters.freeCancellationOnly) params.set("freeCancellation", "true");
  if (filters.ratingMin > 0) params.set("ratingMin", String(filters.ratingMin));
  return params;
}

export default function SearchClient({
  initialFilters,
  initialResponse,
  initialSort = "newest",
}: {
  initialFilters: SearchInitialFilters;
  initialResponse: unknown;
  /** Search-page council item 5: the SSR page parses `sort` too, so
   * the first paint already honours a shared link's sort. */
  initialSort?: SearchSortKey;
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
  // Search-page council item 5: sort rides the same URL truth (it was
  // component state — a shared link silently lost it).
  const sortKey = useMemo<SearchSortKey>(() => parseSortKey(searchParams.get("sort")), [searchParams]);
  const { sortBy, sortOrder } = sortKeyToApi(sortKey);

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
  // The sort key rides along (omitted at the default so plain filter
  // URLs stay clean); updateSort does the symmetric operation.
  const updateFilters = useCallback((patch: Partial<SearchFilters>) => {
    const nextFilters = { ...filters, ...patch };
    const params = buildSearchParams(nextFilters);
    if (sortKey !== "newest") params.set("sort", sortKey);
    const query = params.toString();
    router.replace(query ? `/search?${query}` : "/search");
    setCurrentPage(1);
  }, [filters, router, sortKey, setCurrentPage]);

  const updateFilter = useCallback((key: FilterKey, value: SearchFilters[FilterKey]) => {
    updateFilters({ [key]: value } as Partial<SearchFilters>);
  }, [updateFilters]);

  const updateSort = useCallback((nextSort: SearchSortKey) => {
    const params = buildSearchParams(filters);
    if (nextSort !== "newest") params.set("sort", nextSort);
    const query = params.toString();
    router.replace(query ? `/search?${query}` : "/search");
    setCurrentPage(1);
  }, [filters, router, setCurrentPage]);

  // Debounce local input -> write `q` to the URL (which re-derives the
  // filters). Skips the write when the echo already matches the URL.
  useEffect(() => {
    if (searchQueryInput === filters.searchQuery) return;
    const id = setTimeout(() => {
      updateFilter("searchQuery", searchQueryInput);
    }, 300);
    return () => clearTimeout(id);
  }, [searchQueryInput, filters.searchQuery, updateFilter]);

  // Search-page council item 7 (Performance): the price inputs keep a
  // local echo and commit on blur or after a 300ms debounce — the old
  // write-per-keystroke refetched the result set for every digit.
  const [priceMinInput, setPriceMinInput] = useState(filters.priceMin);
  const [priceMaxInput, setPriceMaxInput] = useState(filters.priceMax);
  useEffect(() => {
    setPriceMinInput(filters.priceMin);
  }, [filters.priceMin]);
  useEffect(() => {
    setPriceMaxInput(filters.priceMax);
  }, [filters.priceMax]);
  useEffect(() => {
    if (priceMinInput === filters.priceMin && priceMaxInput === filters.priceMax) return;
    const id = setTimeout(() => {
      updateFilters({ priceMin: priceMinInput, priceMax: priceMaxInput });
    }, 300);
    return () => clearTimeout(id);
  }, [priceMinInput, priceMaxInput, filters.priceMin, filters.priceMax, updateFilters]);
  const commitPriceInputs = useCallback(() => {
    if (priceMinInput === filters.priceMin && priceMaxInput === filters.priceMax) return;
    updateFilters({ priceMin: priceMinInput, priceMax: priceMaxInput });
  }, [priceMinInput, priceMaxInput, filters.priceMin, filters.priceMax, updateFilters]);

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
    if (filters.freeCancellationOnly) params.freeCancellation = true;
    if (filters.ratingMin > 0) params.ratingMin = filters.ratingMin;
    return params;
  }, [filters, sortBy, sortOrder, currentPage, i18n.language]);

  // #440 (Council P1-15): the SSR response may only seed the query it was
  // fetched for (page 1, the URL's sort, the initial filters). Seeding every
  // query key with it made in-page searches render the initial result set
  // as if it were the response for the new filters — stale results until a
  // full reload. Any deviation from the initial query must fetch fresh.
  const isInitialQuery =
    currentPage === 1 &&
    sortKey === initialSort &&
    filters.searchQuery === initialFilters.searchQuery &&
    filters.category === initialFilters.category &&
    filters.destination === initialFilters.destination &&
    filters.duration === initialFilters.duration &&
    filters.priceMin === initialFilters.priceMin &&
    filters.priceMax === initialFilters.priceMax &&
    filters.dateFrom === initialFilters.dateFrom &&
    filters.dateTo === initialFilters.dateTo &&
    filters.availabilityOnly === initialFilters.availabilityOnly &&
    filters.freeCancellationOnly === initialFilters.freeCancellationOnly &&
    filters.ratingMin === initialFilters.ratingMin;

  const { data: response, isLoading, error, isError } = useTripsQuery(queryParams, {
    placeholderData: keepPreviousData,
    // Seed from server-side fetch so first paint shows results without a loading flash.
    // React Query refetches when queryParams change (filters/pagination/sort).
    initialData: isInitialQuery ? (initialResponse as never) : undefined,
  });

  const trips = response?.data || [];
  const pagination = response?.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 };

  // Search-page council item 2 (K1 counts sourcing): ONE catalogue
  // fetch sits behind the destination group and supplies its counts.
  // The API clamps list responses to 50 rows, so the hard stop is
  // structural: when the catalogue total exceeds the fetched rows the
  // counts SUPPRESS (never truncate silently) and the facet falls back
  // to uncounted rows. Counts are computed with the same slug
  // derivation the API facet uses (lib/curation), from one snapshot.
  const { data: catalogueResponse } = useTripsQuery({
    status: TripStatus.Active,
    limit: 50,
    page: 1,
    locale: i18n.language,
  });
  const catalogueTrips = useMemo(() => catalogueResponse?.data ?? [], [catalogueResponse]);
  const countsKnown = Boolean(
    catalogueResponse && (catalogueResponse.pagination?.total ?? 0) <= catalogueTrips.length,
  );
  const destinationCounts = useMemo(
    () => (countsKnown ? countTripsByDestination(catalogueTrips as unknown as CurationTrip[]) : null),
    [countsKnown, catalogueTrips],
  );

  // #877: the zero-results state carries its own recovery — featured
  // trips to fall back on (same featured set the home rail draws from).
  const { data: featuredResponse } = useTripsQuery(
    { featured: true, status: TripStatus.Active, limit: 3, locale: i18n.language },
    { enabled: !isLoading && !isError && trips.length === 0 },
  );
  const featuredTrips = featuredResponse?.data || [];

  // #877: a dated search with zero results auto-strips the dates and
  // re-runs unfiltered under a banner, instead of dead-ending. The key
  // remembers the exact dated filter set already stripped, so the
  // strip fires once per dated search (a traveller who deliberately
  // re-picks the same empty dates gets the honest zero state, and the
  // banner never loops).
  // Search-page council item 8: the record also keeps the stripped
  // dates themselves — the banner NAMES them and offers one-action
  // restore (restoring lands on the honest dated zero, because the
  // key guard below refuses to strip the same set twice).
  const [strippedDates, setStrippedDates] = useState<{
    key: string;
    from: string;
    to: string;
    destination: string;
    query: string;
  } | null>(null);
  const datedFilterKey = `${filters.destination}|${filters.searchQuery}|${filters.dateFrom}|${filters.dateTo}`;
  useEffect(() => {
    if (isLoading || isError) return;
    if (trips.length > 0 || pagination.total > 0) return;
    if (!filters.dateFrom && !filters.dateTo) return;
    if (strippedDates?.key === datedFilterKey) return;
    setStrippedDates({
      key: datedFilterKey,
      from: filters.dateFrom,
      to: filters.dateTo,
      destination: filters.destination,
      query: filters.searchQuery,
    });
    updateFilters({ dateFrom: "", dateTo: "" });
  }, [isLoading, isError, trips.length, pagination.total, filters.dateFrom, filters.dateTo, strippedDates, datedFilterKey, updateFilters]);
  const showDatesRemovedBanner =
    strippedDates !== null &&
    !filters.dateFrom &&
    !filters.dateTo &&
    filters.destination === strippedDates.destination &&
    filters.searchQuery === strippedDates.query &&
    !isError;

  const clearAllFilters = () => {
    setSearchQueryInput("");
    setCurrentPage(1);
    router.replace("/search");
  };

  const activeFilterChips = useMemo(() => {
    const chips: { label: React.ReactNode; accessibleLabel?: string; onRemove: () => void }[] = [];
    // Item 1 (one destination expression in the URL at a time): the
    // text query carries its own chip — its × clears `q` alone, and
    // the pill re-derives from the URL in the same render.
    if (filters.searchQuery) {
      chips.push({
        label: `“${filters.searchQuery}”`,
        accessibleLabel: filters.searchQuery,
        onRemove: () => {
          setSearchQueryInput("");
          updateFilter("searchQuery", "");
        },
      });
    }
    if (filters.destination) {
      chips.push({ label: t(`search.destinationNames.${filters.destination}`), onRemove: () => updateFilter("destination", "") });
    }
    if (filters.duration) {
      const label = t(`search.durationBuckets.${filters.duration}`);
      chips.push({
        label: <bdi dir="ltr">{label}</bdi>,
        accessibleLabel: label,
        onRemove: () => updateFilter("duration", ""),
      });
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
    if (filters.freeCancellationOnly) chips.push({ label: t('search.cancellationTerms'), onRemove: () => updateFilter("freeCancellationOnly", false) });
    if (filters.ratingMin > 0) chips.push({ label: `Rating: ${filters.ratingMin}+`, onRemove: () => updateFilter("ratingMin", 0) });
    return chips;
  }, [filters, updateFilter, updateFilters, t]);

  // Search-page council item 4 (#960): the results-head state line —
  // the page's single role="status" live region. Built ONLY from
  // Content's hand-authored per-slot fragments (debate/content-l10n.md),
  // joined by ' · ', slot order identical in every locale. If any slot
  // lacks a safe fragment for the current combination (an unknown
  // category is the named risk), the line is NOT shown in part — the
  // caller falls back to the counts fragment alone, which is Content's
  // part-(c) counts line carrying the state instead.
  const stateLine = useMemo<string | null>(() => {
    const fragment = (key: string, options?: Record<string, unknown>): string | null => {
      const value = t(key, options as never);
      return value === key ? null : value;
    };
    const formatDate = (iso: string) =>
      new Intl.DateTimeFormat(i18n.language || "en", { day: "numeric", month: "short" }).format(
        new Date(`${iso}T00:00:00`),
      );
    const formatPrice = (raw: string) =>
      new Intl.NumberFormat(i18n.language || "en").format(Number(raw));

    let place: string | null;
    if (filters.destination) {
      place = fragment(`search.statePlaceFrom.${filters.destination}`);
    } else if (filters.searchQuery) {
      // K1 head rule: a text place is 'Results for X', never 'from X'.
      place = fragment("search.stateResultsFor", { query: filters.searchQuery });
    } else {
      place = fragment("search.statePlaceAnywhere");
    }

    let dates: string | null;
    if (filters.dateFrom && filters.dateTo) {
      dates = fragment("search.stateDatesRange", { from: formatDate(filters.dateFrom), to: formatDate(filters.dateTo) });
    } else if (filters.dateFrom) {
      dates = fragment("search.stateDatesFrom", { from: formatDate(filters.dateFrom) });
    } else if (filters.dateTo) {
      dates = fragment("search.stateDatesTo", { to: formatDate(filters.dateTo) });
    } else {
      dates = fragment("search.stateDatesAny");
    }

    const style = filters.category
      ? fragment(`search.stateStyle.${filters.category.toLowerCase()}`)
      : fragment("search.stateStyleAny");

    const duration = filters.duration
      ? t(`search.durationBuckets.${filters.duration}`)
      : fragment("search.stateDurationAny");

    let price: string | null;
    if (filters.priceMin && filters.priceMax) {
      price = fragment("search.statePriceRange", { min: formatPrice(filters.priceMin), max: formatPrice(filters.priceMax) });
    } else if (filters.priceMax) {
      price = fragment("search.statePriceUpTo", { price: formatPrice(filters.priceMax) });
    } else if (filters.priceMin) {
      price = fragment("search.statePriceFrom", { price: formatPrice(filters.priceMin) });
    } else {
      price = fragment("search.statePriceAny");
    }

    if (!place || !dates || !style || !duration || !price) return null;
    return [t('search.stateTrips', { count: pagination.total }), place, dates, style, duration, price].join(" · ");
  }, [filters, pagination.total, t, i18n.language]);

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

  // Search-page council item 1 (K1 + K6c): the destination facet is
  // the beta cluster ONLY. Places with live trips are radio rows with
  // sourced counts (item 2); a place with ZERO trips is never a
  // control — it is disclosed in a separated zone under its own
  // heading as plain text (Tétouan: 'disclosed, never offered'). When
  // the counts are unknown (fetch pending/failed, or the catalogue
  // outgrew the fetched rows and counts suppressed), every cluster
  // slug renders as an uncounted row: the page never asserts a zero
  // it has not measured.
  const renderDestinationGroup = () => {
    const clusterSlugs = BETA_DESTINATIONS.map((destination) => destination.slug as string);
    const selectableSlugs = destinationCounts
      ? clusterSlugs.filter((slug) => (destinationCounts[slug] ?? 0) > 0)
      : clusterSlugs;
    const zeroSlugs = destinationCounts
      ? clusterSlugs.filter((slug) => (destinationCounts[slug] ?? 0) === 0)
      : [];
    return (
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase">{t('search.destination')}</p>
        <div className="grid gap-2" role="radiogroup" aria-label={t('search.destination')}>
          <button
            type="button"
            role="radio"
            aria-checked={filters.destination === ""}
            onClick={() => updateFilter("destination", "")}
            className={cn(
              "px-3 py-2 rounded-lg text-sm text-left",
              filters.destination === "" ? "bg-sunset-orange/10 text-sunset-orange-dark" : "bg-muted",
            )}
          >
            {t('search.destinationAnywhere')}
          </button>
          {selectableSlugs.map((slug) => (
            <button
              key={slug}
              type="button"
              role="radio"
              aria-checked={filters.destination === slug}
              onClick={() => updateFilter("destination", slug)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm text-left flex items-baseline justify-between gap-2",
                filters.destination === slug ? "bg-sunset-orange/10 text-sunset-orange-dark" : "bg-muted",
              )}
            >
              <span>{t(`search.destinationNames.${slug}`)}</span>
              {destinationCounts ? (
                <span className="text-xs text-muted-foreground">{t('search.facetCount', { count: destinationCounts[slug] ?? 0 })}</span>
              ) : null}
            </button>
          ))}
        </div>
        {zeroSlugs.length > 0 && (
          <div className="space-y-1 border-t border-border pt-3">
            <p className="text-xs font-bold text-muted-foreground uppercase">{t('search.noTripsYetPlaces')}</p>
            {zeroSlugs.map((slug) => (
              <p key={slug} className="text-sm text-foreground">
                {t('search.destinationNoTripsYet', { place: t(`search.destinationNames.${slug}`) })}
              </p>
            ))}
          </div>
        )}
        {/* K1 disclosure: two mechanisms, two meanings — the note sits
            in the group itself, at full contrast (never in the greyed
            styling of the zero zone). */}
        <p className="text-xs leading-relaxed text-foreground/80">{t('search.destinationNote')}</p>
        {destinationCounts ? (
          <p className="text-xs text-muted-foreground">{t('search.countsProvenance')}</p>
        ) : null}
      </div>
    );
  };

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
              {/* Numeric ranges must establish an LTR island inside the
                  Arabic document; otherwise 2–3 is rendered as 3–2. */}
              <bdi dir="ltr">{t(`search.durationBuckets.${bucket.key}`)}</bdi>
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
          <Input type="number" min="0" aria-label={t('search.minPrice')} placeholder={t('search.min')} value={priceMinInput} onChange={(event) => setPriceMinInput(event.target.value)} onBlur={commitPriceInputs} />
          <Input type="number" min="0" aria-label={t('search.maxPrice')} placeholder={t('search.max')} value={priceMaxInput} onChange={(event) => setPriceMaxInput(event.target.value)} onBlur={commitPriceInputs} />
        </div>
      </div>
  );

  const renderAvailabilityGroup = () => (
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase">{t('search.availability')}</p>
        <button type="button" onClick={() => updateFilter("availabilityOnly", !filters.availabilityOnly)} aria-pressed={filters.availabilityOnly} className={cn("px-3 py-2 rounded-lg w-full", filters.availabilityOnly ? "bg-success/10 text-success" : "bg-muted")}>{t('search.availabilityOnly')}</button>
        {/* Item 9 / Trust T2: the filter's label is the neutral
            'Cancellation terms' — bare 'Free cancellation' is a
            promise this control cannot date (Veto 1). */}
        <button type="button" onClick={() => updateFilter("freeCancellationOnly", !filters.freeCancellationOnly)} aria-pressed={filters.freeCancellationOnly} className={cn("px-3 py-2 rounded-lg w-full mt-2", filters.freeCancellationOnly ? "bg-success/10 text-success" : "bg-muted")} data-testid="filter-free-cancellation">{t('search.cancellationTerms')}</button>
      </div>
  );

  // 'Classic Rail, completed': EVERY group is unburied in the rail —
  // the old 'More filters' collapse (which hid Dates/Price/
  // Availability behind a toggle) is gone on desktop, and the mobile
  // drawer carries the identical set. Sort is NOT here: item 5 moved
  // it to one direction-named select at the results head.
  const renderFilterControls = () => (
    <div className="space-y-6">
      {renderCategoryGroup()}
      {renderDestinationGroup()}
      {renderDurationGroup()}
      {renderDatesGroup()}
      {renderPriceGroup()}
      {renderAvailabilityGroup()}
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
                {/* Item 3: the drawer applies instantly like the rail —
                    nothing is staged, so the footer is a truthful
                    Done with the APPLIED total, not a commit. */}
                <Button type="button" onClick={() => setFilterDrawerOpen(false)}>{t('search.drawerDone', { count: pagination.total })}</Button>
              </div>
            )}
          >
            {renderFilterControls()}
          </MobileFilterDrawer>
          <span className="text-sm text-muted-foreground">{t('search.stateTrips', { count: pagination.total })}</span>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="bg-card p-5 rounded-2xl border border-border space-y-6 sticky top-28">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> {t('search.filters')}</h3>
                {activeFiltersCount > 0 && <button onClick={clearAllFilters} aria-label={t('search.clearAll')} className="text-sm text-muted-foreground">{t('search.clear')}</button>}
              </div>

              {renderFilterControls()}
            </div>
          </aside>

          <section className="flex-1" aria-label="Search results">
            {activeFilterChips.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {activeFilterChips.map((c, i) => (
                  <Badge key={i} className="px-3 py-1 flex items-center gap-2">{c.label} <button onClick={c.onRemove} aria-label={`Remove filter ${c.accessibleLabel ?? (typeof c.label === 'string' ? c.label : '')}`}><X className="h-3 w-3" /></button></Badge>
                ))}
              </div>
            )}

            {/* Item 4 + item 5: the results head is the state line
                (the page's single live region) and the one
                direction-named sort select. The old bar's inert
                count text and the asc/desc toggle are deleted. */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div role="status" aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground">
                {stateLine ?? t('search.stateTrips', { count: pagination.total })}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t('search.sort')}</span>
                <select
                  aria-label={t('search.sort')}
                  value={sortKey}
                  onChange={(event) => updateSort(event.target.value as SearchSortKey)}
                  className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-foreground"
                >
                  <option value="newest">{t('search.newest')}</option>
                  <option value="price-asc">{t('search.sortPriceAsc')}</option>
                  <option value="price-desc">{t('search.sortPriceDesc')}</option>
                </select>
              </label>
            </div>

            {isError && (
              <div className="p-6 bg-danger/10 border border-danger/20 rounded-lg text-center">
                <p className="font-semibold text-danger">{t('search.failedToLoad')}</p>
                <p className="text-sm text-danger/80 mt-1">{error instanceof Error ? error.message : 'Please try again'}</p>
                <div className="mt-3"><Button onClick={() => window.location.reload()}>{t('search.retry')}</Button></div>
              </div>
            )}

            {/* #877 + item 8: after the dated auto-strip, the banner
                NAMES the stripped dates and offers one-action
                restore; the results below are NOT date-filtered. */}
            {!isLoading && trips.length > 0 && showDatesRemovedBanner && strippedDates && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sunset-orange/40 bg-sunset-orange/10 p-3 text-sm text-foreground">
                <span>
                  {t('search.datesRemovedBanner', {
                    place: strippedDates.destination
                      ? t(`search.destinationNames.${strippedDates.destination}`)
                      : t('search.everywhere'),
                    dates: [strippedDates.from, strippedDates.to]
                      .filter(Boolean)
                      .map((iso) => new Intl.DateTimeFormat(i18n.language || "en", { day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`)))
                      .join(" – "),
                  })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updateFilters({ dateFrom: strippedDates.from, dateTo: strippedDates.to })}
                >
                  {t('search.restoreDates')}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {isLoading ? (
                <TripCardSkeletonGrid count={4} className="md:col-span-2 sm:grid-cols-2 lg:grid-cols-2 gap-8" />
              ) : trips.length > 0 ? (
                trips.map((trip) => (
                  <div key={trip.id}>
                    {/* Search council punch item 9 (#886): result
                        cards render a single static photo — no
                        per-card carousel tab stops inside grids.
                        Item 7 (animation diet): no entrance
                        re-animation on filter updates. */}
                    <TripCard trip={trip} staticPhoto />
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4"><Compass className="h-6 w-6" /></div>
                  <h3 className="text-lg font-semibold">{t('search.noTrips')}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{t('search.noTripsHint', 'Try adjusting your filters or clearing them.')}</p>
                  {/* #877: the zero state carries its own one-tap
                      recovery — previously the copy advised clearing
                      filters the page gave no single control for. */}
                  <div className="mt-5">
                    <Button type="button" onClick={clearAllFilters}>{t('search.clearAllShowAll')}</Button>
                  </div>
                  {featuredTrips.length > 0 && (
                    <div className="mt-12 text-start">
                      <h4 className="mb-6 text-center text-base font-semibold">{t('search.zeroStateFeaturedTitle')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {featuredTrips.map((trip) => (
                          <TripCard key={trip.id} trip={trip} />
                        ))}
                      </div>
                    </div>
                  )}
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
