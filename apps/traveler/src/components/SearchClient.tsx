"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";import {
  Search,
  Filter,
  Calendar,
  Check,
  Compass,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, Input, MobileFilterDrawer, TripCardSkeletonGrid } from "@ouiboo/ui";
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
import { normalizeDestinationText, resolveDestinationSlug } from "@/lib/hero-search";

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
  /** #975 fidelity: the rail's "I'm flexible" switch — while on, the
   * date range is ignored (toggling it on clears the dates). */
  flexibleDates?: boolean;
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
    flexibleDates: searchParams.get("flexible") === "true",
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
  if (filters.flexibleDates) params.set("flexible", "true");
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
      limit: 9,
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
    if (!filters.flexibleDates) {
      if (filters.dateFrom) params.startDateFrom = filters.dateFrom;
      if (filters.dateTo) params.startDateTo = filters.dateTo;
    }
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
    filters.ratingMin === initialFilters.ratingMin &&
    Boolean(filters.flexibleDates) === Boolean(initialFilters.flexibleDates);

  const { data: response, isLoading, error, isError } = useTripsQuery(queryParams, {
    placeholderData: keepPreviousData,
    // Seed from server-side fetch so first paint shows results without a loading flash.
    // React Query refetches when queryParams change (filters/pagination/sort).
    initialData: isInitialQuery ? (initialResponse as never) : undefined,
  });

  const trips = response?.data || [];
  const pagination = response?.pagination || { total: 0, page: 1, limit: 9, totalPages: 0 };

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

  // #975 fidelity: the slim segmented bar under the header (adopted
  // drawing). The destination segment reuses the echo + debounce; its
  // dropdown offers the cluster places with trips (facet navigation),
  // discloses zero-trip places as text, and commits typed text through
  // the same resolveDestinationSlug discipline as the home hero — a
  // known place name becomes the facet, anything else becomes `q`.
  const [barDirty, setBarDirty] = useState(false);
  const [barOpen, setBarOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [datesFocus, setDatesFocus] = useState<"from" | "to">("from");
  useEffect(() => {
    setBarDirty(false);
  }, [filters.destination]);
  const fmtNum = useCallback(
    (n: number) => new Intl.NumberFormat(i18n.language || "en").format(n),
    [i18n.language],
  );
  const localizedDestinationNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const d of BETA_DESTINATIONS) {
      const slug = d.slug as string;
      names[slug] = t(`search.destinationNames.${slug}`);
    }
    return names;
  }, [t]);
  const barSuggestions = useMemo(() => {
    const slugs = BETA_DESTINATIONS.map((d) => d.slug as string);
    const needle = normalizeDestinationText(searchQueryInput);
    const matches = (slug: string) =>
      !needle ||
      normalizeDestinationText(localizedDestinationNames[slug] ?? slug).includes(needle) ||
      slug.includes(needle);
    return {
      rows: destinationCounts
        ? slugs.filter((slug) => (destinationCounts[slug] ?? 0) > 0 && matches(slug))
        : slugs.filter(matches),
      zero: destinationCounts
        ? slugs.filter((slug) => (destinationCounts[slug] ?? 0) === 0 && matches(slug))
        : [],
    };
  }, [destinationCounts, searchQueryInput, localizedDestinationNames]);
  const barHref = (patch: Partial<SearchFilters>) => {
    const params = buildSearchParams({ ...filters, ...patch });
    if (sortKey !== "newest") params.set("sort", sortKey);
    const query = params.toString();
    return query ? `/search?${query}` : "/search";
  };
  const commitBarSearch = () => {
    setBarOpen(false);
    if (!barDirty && filters.destination) return;
    const raw = searchQueryInput.trim();
    const slug = raw ? resolveDestinationSlug(raw, localizedDestinationNames) : null;
    if (slug) {
      setSearchQueryInput("");
      updateFilters({ destination: slug, searchQuery: "" });
    } else {
      updateFilters({ searchQuery: raw, destination: "" });
    }
    setBarDirty(false);
  };
  const barInputValue = !barDirty && filters.destination
    ? (localizedDestinationNames[filters.destination] ?? filters.destination)
    : searchQueryInput;
  const formatBarDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language || "en", { day: "numeric", month: "short" }).format(
      new Date(`${iso}T00:00:00`),
    );
  const barDatesLabel = filters.flexibleDates
    ? t('search.flexible')
    : filters.dateFrom || filters.dateTo
      ? [filters.dateFrom, filters.dateTo].filter(Boolean).map((iso) => formatBarDate(iso as string)).join(" – ")
      : t('search.barAnyDates');
  const provenanceParts = t('search.countsProvenance').split(" · ");

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
      const fmt = (raw: string) => new Intl.NumberFormat(i18n.language || "en").format(Number(raw));
      const label = filters.priceMin && filters.priceMax
        ? t('search.chipPriceRange', { min: fmt(filters.priceMin), max: fmt(filters.priceMax) })
        : filters.priceMax
          ? t('search.chipPriceUpTo', { max: fmt(filters.priceMax) })
          : t('search.chipPriceFrom', { min: fmt(filters.priceMin) });
      chips.push({ label, onRemove: () => updateFilters({ priceMin: "", priceMax: "" }) });
    }
    if (filters.dateFrom || filters.dateTo) {
      const fmt = (iso: string) => new Intl.DateTimeFormat(i18n.language || "en", { day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`));
      const from = filters.dateFrom ? fmt(filters.dateFrom) : t('search.chipAnyDate');
      const to = filters.dateTo ? fmt(filters.dateTo) : t('search.chipAnyDate');
      chips.push({ label: t('search.chipDates', { from, to }), onRemove: () => updateFilters({ dateFrom: "", dateTo: "" }) });
    }
    if (filters.flexibleDates) chips.push({ label: t('search.flexible'), onRemove: () => updateFilter("flexibleDates", false) });
    if (filters.availabilityOnly) chips.push({ label: t('search.availabilityOnly'), onRemove: () => updateFilter("availabilityOnly", false) });
    if (filters.freeCancellationOnly) chips.push({ label: t('search.cancellationTerms'), onRemove: () => updateFilter("freeCancellationOnly", false) });
    if (filters.ratingMin > 0) chips.push({ label: t('search.chipRating', { rating: filters.ratingMin }), onRemove: () => updateFilter("ratingMin", 0) });
    return chips;
  }, [filters, updateFilter, updateFilters, t, i18n.language]);

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
      const value = t(key, options as never) as unknown as string;
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

  // #975 fidelity: the rail rebuilt to the adopted Classic Rail
  // drawing — Destination FIRST as radio rows with quiet right-aligned
  // counts (the catalogue total beside Anywhere), Trip style as
  // checkboxes with counts and an "All styles" reset row, Duration as
  // wrap pills including "Any length", Dates with the "I'm flexible"
  // switch beside the inputs, Price with preset pills, and
  // Availability & terms as switches. Sort stays at the results head
  // (council item 5), never in the rail.
  const groupTitle = (text: string) => (
    <p className="text-xs font-bold uppercase tracking-wide text-deep-blue dark:text-foreground">{text}</p>
  );

  const renderDestinationGroup = () => {
    const clusterSlugs = BETA_DESTINATIONS.map((destination) => destination.slug as string);
    const selectableSlugs = destinationCounts
      ? clusterSlugs.filter((slug) => (destinationCounts[slug] ?? 0) > 0)
      : clusterSlugs;
    const zeroSlugs = destinationCounts
      ? clusterSlugs.filter((slug) => (destinationCounts[slug] ?? 0) === 0)
      : [];
    const total = catalogueResponse?.pagination?.total ?? 0;
    const radioRow = (slug: string, name: string, count: number | null) => {
      const checked = slug === "" ? filters.destination === "" : filters.destination === slug;
      return (
        <label
          key={slug || "anywhere"}
          className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-sand/50 dark:hover:bg-muted"
        >
          <input
            type="radio"
            name="search-destination"
            className="sr-only"
            checked={checked}
            onChange={() => updateFilter("destination", slug)}
          />
          <span
            aria-hidden="true"
            className={cn(
              "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2",
              checked ? "border-sunset-orange" : "border-deep-blue/30 dark:border-muted-foreground/50",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full bg-sunset-orange", checked ? "opacity-100" : "opacity-0")} />
          </span>
          <span className="flex-1 text-sm text-foreground">{name}</span>
          {count !== null && (
            <>
              <span aria-hidden="true" className="text-xs tabular-nums text-muted-foreground">{fmtNum(count)}</span>
              <span className="sr-only">{t('search.facetCount', { count })}</span>
            </>
          )}
        </label>
      );
    };
    return (
      <div className="space-y-2">
        {groupTitle(t('search.destination'))}
        <div role="radiogroup" aria-label={t('search.destination')} className="grid gap-0.5">
          {radioRow("", t('search.destinationAnywhere'), destinationCounts ? total : null)}
          {selectableSlugs.map((slug) =>
            radioRow(slug, t(`search.destinationNames.${slug}`), destinationCounts ? (destinationCounts[slug] ?? 0) : null),
          )}
        </div>
        {zeroSlugs.length > 0 && (
          <div className="space-y-1 px-2 pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t('search.noTripsYetPlaces')}</p>
            {zeroSlugs.map((slug) => (
              <p key={slug} className="text-sm text-muted-foreground">
                {t('search.destinationNoTripsYet', { place: t(`search.destinationNames.${slug}`) })}
              </p>
            ))}
          </div>
        )}
        {/* K1 disclosure: what the counts cover sits in the group
            itself, at full contrast. */}
        <p className="px-2 pt-1 text-xs leading-relaxed text-foreground/80">{t('search.destinationNote')}</p>
      </div>
    );
  };

  const renderCategoryGroup = () => {
    const categoryCounts = countsKnown
      ? TRIP_CATEGORIES.map((category) => ({
          ...category,
          count: catalogueTrips.filter(
            (trip) => ((trip as { category?: string }).category ?? "").toUpperCase() === category.value,
          ).length,
        }))
      : null;
    const checkboxRow = (
      key: string,
      label: string,
      count: number | null,
      checked: boolean,
      onChange: () => void,
    ) => (
      <label
        key={key}
        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-sand/50 dark:hover:bg-muted"
      >
        <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
        <span
          aria-hidden="true"
          className={cn(
            "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-2",
            checked ? "border-sunset-orange bg-sunset-orange text-deep-blue" : "border-deep-blue/30 dark:border-muted-foreground/50",
          )}
        >
          {checked && <Check className="h-3 w-3" strokeWidth={3.5} />}
        </span>
        <span className="flex-1 text-sm text-foreground">{label}</span>
        {count !== null && (
          <>
            <span aria-hidden="true" className="text-xs tabular-nums text-muted-foreground">{fmtNum(count)}</span>
            <span className="sr-only">{t('search.facetCount', { count })}</span>
          </>
        )}
      </label>
    );
    return (
      <div className="space-y-2">
        {groupTitle(t('search.tripStyle'))}
        <div className="grid gap-0.5">
          {checkboxRow("__all__", t('search.allStyles'), null, filters.category === "", () =>
            updateFilter("category", ""),
          )}
          {(categoryCounts ?? TRIP_CATEGORIES.map((category) => ({ ...category, count: null }))).map((category) =>
            checkboxRow(
              category.value,
              category.label,
              category.count,
              filters.category === category.value,
              () => updateFilter("category", filters.category === category.value ? "" : category.value),
            ),
          )}
        </div>
      </div>
    );
  };

  const renderDurationGroup = () => {
    const pill = (key: string, label: React.ReactNode, selected: boolean, onClick: () => void) => (
      <button
        key={key || "any-length"}
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={cn(
          "rounded-full px-3 py-1.5 text-sm transition-colors",
          selected
            ? "bg-deep-blue font-medium text-white dark:bg-sunset-orange dark:text-deep-blue"
            : "bg-muted text-foreground hover:bg-sand dark:hover:bg-muted/70",
        )}
      >
        {label}
      </button>
    );
    return (
      <div className="space-y-3">
        {groupTitle(t('search.duration'))}
        <div className="flex flex-wrap gap-2">
          {pill("", t('search.anyLength'), filters.duration === "", () => updateFilter("duration", ""))}
          {DURATION_BUCKETS.map((bucket) =>
            pill(
              bucket.key,
              // Numeric ranges keep an LTR island inside the Arabic
              // document; otherwise 2–3 renders as 3–2 (#746).
              <bdi dir="ltr">{t(`search.durationBuckets.${bucket.key}`)}</bdi>,
              filters.duration === bucket.key,
              () => updateFilter("duration", filters.duration === bucket.key ? "" : bucket.key),
            ),
          )}
        </div>
      </div>
    );
  };

  const renderDatesGroup = () => (
    <div className="space-y-3">
      {groupTitle(t('search.dates'))}
      <div className="space-y-2">
        <div>
          <span className="mb-1 block text-xs text-muted-foreground">{t('search.dateFrom')}</span>
          <Input
            type="date"
            aria-label={t('search.startDate')}
            value={filters.dateFrom}
            disabled={Boolean(filters.flexibleDates)}
            onChange={(event) => updateFilter("dateFrom", event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-orange disabled:opacity-50 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
        <div>
          <span className="mb-1 block text-xs text-muted-foreground">{t('search.dateTo')}</span>
          <Input
            type="date"
            aria-label={t('search.endDate')}
            value={filters.dateTo}
            disabled={Boolean(filters.flexibleDates)}
            onChange={(event) => updateFilter("dateTo", event.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-orange disabled:opacity-50 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>
      </div>
      <div
        className="flex cursor-pointer items-start justify-between gap-3 px-0.5"
        onClick={() =>
          filters.flexibleDates
            ? updateFilter("flexibleDates", false)
            : updateFilters({ flexibleDates: true, dateFrom: "", dateTo: "" })
        }
      >
        <span>
          <span className="block text-sm font-medium text-foreground">{t('search.flexible')}</span>
          <span className="block text-xs text-muted-foreground">{t('search.flexibleHint')}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(filters.flexibleDates)}
          aria-label={t('search.flexible')}
          onClick={(event) => {
            event.stopPropagation();
            if (filters.flexibleDates) updateFilter("flexibleDates", false);
            else updateFilters({ flexibleDates: true, dateFrom: "", dateTo: "" });
          }}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            filters.flexibleDates ? "bg-success" : "bg-muted-foreground/30",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
              filters.flexibleDates ? "start-[22px]" : "start-0.5",
            )}
          />
        </button>
      </div>
    </div>
  );

  const PRICE_PRESETS = [500, 1500, 2500];
  const renderPriceGroup = () => (
    <div className="space-y-3">
      {groupTitle(t('search.pricePerPerson'))}
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" min="0" aria-label={t('search.minPrice')} placeholder={t('search.priceMinPlaceholder')} value={priceMinInput} onChange={(event) => setPriceMinInput(event.target.value)} onBlur={commitPriceInputs} />
        <Input type="number" min="0" aria-label={t('search.maxPrice')} placeholder={t('search.priceMaxPlaceholder')} value={priceMaxInput} onChange={(event) => setPriceMaxInput(event.target.value)} onBlur={commitPriceInputs} />
      </div>
      <div className="flex flex-wrap gap-2">
        {PRICE_PRESETS.map((preset) => {
          const selected = filters.priceMax === String(preset) && !filters.priceMin;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              onClick={() =>
                selected
                  ? updateFilters({ priceMax: "", priceMin: "" })
                  : updateFilters({ priceMax: String(preset), priceMin: "" })
              }
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                selected
                  ? "bg-deep-blue font-medium text-white dark:bg-sunset-orange dark:text-deep-blue"
                  : "bg-muted text-foreground hover:bg-sand dark:hover:bg-muted/70",
              )}
            >
              <bdi dir="ltr">{t('search.pricePresetUnder', { price: fmtNum(preset) })}</bdi>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSwitchRow = (
    label: string,
    hint: string | null,
    checked: boolean,
    onToggle: () => void,
    testId?: string,
  ) => (
    <div className="flex cursor-pointer items-start justify-between gap-3" onClick={onToggle}>
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        data-testid={testId}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-success" : "bg-muted-foreground/30",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "start-[22px]" : "start-0.5",
          )}
        />
      </button>
    </div>
  );

  const renderAvailabilityGroup = () => (
    <div className="space-y-3">
      {groupTitle(t('search.availabilityTerms'))}
      {renderSwitchRow(
        t('search.availabilityOnly'),
        t('search.availabilityOnlyHint'),
        filters.availabilityOnly,
        () => updateFilter("availabilityOnly", !filters.availabilityOnly),
      )}
      {/* Item 9 / Trust T2: the filter's label is the neutral
          'Cancellation terms' — bare 'Free cancellation' is a
          promise this control cannot date (Veto 1). */}
      {renderSwitchRow(
        t('search.cancellationTerms'),
        null,
        filters.freeCancellationOnly,
        () => updateFilter("freeCancellationOnly", !filters.freeCancellationOnly),
        "filter-free-cancellation",
      )}
    </div>
  );

  // 'Classic Rail, completed': EVERY group is unburied in the rail —
  // the old 'More filters' collapse (which hid Dates/Price/
  // Availability behind a toggle) is gone on desktop, and the mobile
  // drawer carries the identical set. Sort is NOT here: item 5 moved
  // it to one direction-named select at the results head.
  const renderFilterControls = () => (
    <div className="space-y-6">
      {renderDestinationGroup()}
      {renderCategoryGroup()}
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
        <div className="mx-auto w-full max-w-3xl">
          <div className="relative">
          {/* #975 fidelity: the adopted drawing's head — a slim
              segmented bar (destination | dates | Search) directly
              under the header, replacing the marketing H1 + single
              field pill; the provenance strip sits beneath it. */}
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              commitBarSearch();
            }}
            className="flex items-center gap-1 rounded-full border border-border bg-card p-1.5 shadow-sm"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5 ps-3">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                value={barInputValue}
                onChange={(event) => {
                  setSearchQueryInput(event.target.value);
                  setBarDirty(true);
                  setBarOpen(true);
                }}
                onFocus={() => setBarOpen(true)}
                onBlur={() => setTimeout(() => setBarOpen(false), 150)}
                aria-label={t('search.placeholder')}
                placeholder={t('search.placeholder')}
                role="combobox"
                aria-expanded={barOpen}
                aria-controls="search-destination-suggestions"
                className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {barInputValue && (
                <button
                  type="button"
                  aria-label={t('search.clear')}
                  onClick={() => {
                    setSearchQueryInput("");
                    setBarDirty(true);
                    updateFilters({ searchQuery: "", destination: "" });
                  }}
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
            <button
              type="button"
              onClick={() => {
                setDatesOpen((value) => !value);
                setBarOpen(false);
              }}
              aria-expanded={datesOpen}
              className="hidden shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm text-foreground transition-colors hover:bg-sand/60 dark:hover:bg-muted sm:flex"
            >
              <Calendar className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span className="whitespace-nowrap">{barDatesLabel}</span>
            </button>
            <button
              type="submit"
              className="flex shrink-0 items-center gap-2 rounded-full bg-sunset-orange px-4 py-2.5 text-sm font-semibold text-deep-blue transition-colors hover:bg-sunset-orange-dark hover:text-white sm:px-5"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {t('search.barSearch')}
            </button>
          </form>
          {barOpen && (barSuggestions.rows.length > 0 || barSuggestions.zero.length > 0) && (
            <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-card text-start shadow-xl">
              {barSuggestions.rows.length > 0 && (
                <ul id="search-destination-suggestions" role="listbox" aria-label={t('search.destination')} className="max-h-72 overflow-y-auto py-2">
                  {barSuggestions.rows.map((slug) => (
                    <li key={slug} role="option" aria-selected={filters.destination === slug}>
                      <a
                        href={barHref({ destination: slug, searchQuery: "" })}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-sand/60 dark:hover:bg-muted"
                      >
                        <span className="font-medium text-foreground">{localizedDestinationNames[slug]}</span>
                        {destinationCounts && (
                          <span className="text-xs text-muted-foreground">{t('search.facetCount', { count: destinationCounts[slug] ?? 0 })}</span>
                        )}
                      </a>
                    </li>
                  ))}
                  {searchQueryInput.trim() && !resolveDestinationSlug(searchQueryInput.trim(), localizedDestinationNames) && (
                    <li role="option" aria-selected={false}>
                      <a
                        href={barHref({ searchQuery: searchQueryInput.trim(), destination: "" })}
                        className="block px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-sand/60 dark:hover:bg-muted"
                      >
                        {t('search.barSearchFor', { query: searchQueryInput.trim() })}
                      </a>
                    </li>
                  )}
                </ul>
              )}
              {barSuggestions.zero.length > 0 && (
                <div className="border-t border-border px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{t('search.noTripsYetPlaces')}</p>
                  {barSuggestions.zero.map((slug) => (
                    <p key={slug} className="pt-1 text-sm text-muted-foreground">
                      {t('search.destinationNoTripsYet', { place: localizedDestinationNames[slug] })}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          {datesOpen && (
            <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-border bg-card p-4 text-start shadow-xl sm:inset-x-auto sm:end-0 sm:w-80">
              {(
                [
                  { key: "from", label: t('search.dateFrom'), value: filters.dateFrom, aria: t('search.startDate'), set: (value: string) => updateFilter("dateFrom", value) },
                  { key: "to", label: t('search.dateTo'), value: filters.dateTo, aria: t('search.endDate'), set: (value: string) => updateFilter("dateTo", value) },
                ] as const
              ).map((row) => (
                <div
                  key={row.key}
                  onClick={() => setDatesFocus(row.key)}
                  className={cn(
                    "mb-2 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors",
                    datesFocus === row.key ? "border-sunset-orange bg-sunset-orange/5" : "border-border",
                  )}
                >
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                  <input
                    type="date"
                    aria-label={row.aria}
                    value={row.value}
                    onFocus={() => setDatesFocus(row.key)}
                    onChange={(event) => row.set(event.target.value)}
                    className="bg-transparent text-sm text-foreground outline-none [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              ))}
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => updateFilters({ dateFrom: "", dateTo: "" })}
                  className="text-sm font-medium text-sunset-orange-dark underline underline-offset-2"
                >
                  {t('search.clearAll')}
                </button>
                <button
                  type="button"
                  onClick={() => setDatesOpen(false)}
                  className="rounded-full bg-deep-blue px-4 py-2 text-sm font-semibold text-white transition-colors dark:bg-sunset-orange dark:text-deep-blue"
                >
                  {t('search.drawerDone', { count: pagination.total })}
                </button>
              </div>
            </div>
          )}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {provenanceParts[0]}
            {provenanceParts.length > 1 && (
              <>
                {" · "}
                <span className="font-semibold text-deep-blue dark:text-foreground">{provenanceParts.slice(1).join(" · ")}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="bg-card p-5 rounded-2xl border border-border space-y-6 sticky top-28">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> {t('search.filters')}</h3>
                {activeFiltersCount > 0 && <button onClick={clearAllFilters} aria-label={t('search.clearAll')} className="text-sm font-medium text-sunset-orange-dark">{t('search.clear')}</button>}
              </div>

              {renderFilterControls()}
            </div>
          </aside>

          <section className="flex-1" aria-label="Search results">
            {activeFilterChips.length > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {activeFilterChips.map((c, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-full border border-sand bg-sand/40 py-1 pe-1.5 ps-3 text-xs font-medium text-foreground dark:border-border dark:bg-muted">
                    {c.label}
                    <button
                      onClick={c.onRemove}
                      aria-label={`Remove filter ${c.accessibleLabel ?? (typeof c.label === 'string' ? c.label : '')}`}
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-sunset-orange text-white transition-transform hover:scale-110"
                    >
                      <X className="h-3 w-3" strokeWidth={3} />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-sunset-orange-dark underline underline-offset-2"
                >
                  {t('search.clearAll')}
                </button>
              </div>
            )}

            {/* Item 4 + item 5 + #975 fidelity toolbar: the state
                line (the page's single live region) and the one
                direction-named sort select. On mobile the SAME row
                carries the navy filled Filters button beside the sort
                select, with the state line beneath — the trip count
                appears ONCE, inside the state line. The drawer opens
                from the logical start (left in LTR, right in RTL). */}
            <div className="mb-4 flex flex-wrap items-center gap-2 lg:gap-3">
              <MobileFilterDrawer
                hideAt="lg"
                side="left"
                open={filterDrawerOpen}
                onOpenChange={setFilterDrawerOpen}
                description="Choose travel style, dates, budget, availability, and sorting."
                trigger={
                  <span className="flex items-center gap-2 rounded-full bg-deep-blue px-4 py-2 text-sm font-semibold text-white shadow-sm">
                    <Filter className="h-4 w-4" aria-hidden="true" />
                    {t('search.filters')}
                    {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
                  </span>
                }
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
              <div role="status" aria-live="polite" aria-atomic="true" className="order-3 w-full text-sm text-muted-foreground lg:order-2 lg:w-auto lg:flex-1">
                {stateLine ?? t('search.stateTrips', { count: pagination.total })}
              </div>
              <label className="order-2 ms-auto flex items-center gap-2 text-sm lg:order-3 lg:ms-0">
                <span className="hidden text-muted-foreground sm:block">{t('search.orderLabel')}</span>
                <span className="relative block">
                  <select
                    aria-label={t('search.sort')}
                    value={sortKey}
                    onChange={(event) => updateSort(event.target.value as SearchSortKey)}
                    className="appearance-none rounded-full border border-border bg-card py-2 pe-9 ps-4 text-sm font-medium text-foreground shadow-sm"
                  >
                    <option value="newest">{t('search.newest')}</option>
                    <option value="price-asc">{t('search.sortPriceAsc')}</option>
                    <option value="price-desc">{t('search.sortPriceDesc')}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                </span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {isLoading ? (
                <TripCardSkeletonGrid count={6} className="col-span-full sm:grid-cols-2 lg:grid-cols-3 gap-5" />
              ) : trips.length > 0 ? (
                trips.map((trip) => (
                  <div key={trip.id}>
                    {/* Search council punch item 9 (#886): result
                        cards render a single static photo — no
                        per-card carousel tab stops inside grids.
                        Item 7 (animation diet): no entrance
                        re-animation on filter updates. */}
                    <TripCard trip={trip} staticPhoto variant="search" />
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
                          <TripCard key={trip.id} trip={trip} variant="search" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {pagination.totalPages > 1 && (
              <nav aria-label={t('search.paginationLabel')} className="mt-10 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label={t('search.paginationPrevious')}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-sand/60 disabled:opacity-40 dark:hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === pagination.totalPages)
                  .map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      aria-label={t('search.paginationPage', { page: p })}
                      aria-current={p === currentPage ? "page" : undefined}
                      className={cn(
                        "h-9 min-w-9 rounded-lg border px-2 text-sm transition-colors",
                        p === currentPage
                          ? "border-deep-blue bg-deep-blue font-semibold text-white dark:border-sunset-orange dark:bg-sunset-orange dark:text-deep-blue"
                          : "border-border bg-card text-foreground hover:bg-sand/60 dark:hover:bg-muted",
                      )}
                    >
                      {fmtNum(p)}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  aria-label={t('search.paginationNext')}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-sand/60 disabled:opacity-40 dark:hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                </button>
              </nav>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
