"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  Search,
  Filter,
  Compass,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, Input, Badge } from "@ouiboo/ui";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@ouiboo/ui/utils";
import { TripCard } from "@/components/TripCard";
import { TripStatus, type SessionStatusType, type VerificationStatusType } from "@ouiboo/types";

type SearchFilters = {
  category: string;
  duration: string;
  priceMax: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  priceMin: string;
  availabilityOnly: boolean;
  ratingMin: number;
};

type SearchTrip = {
  id: string;
  title: string;
  category?: string;
  startLocation?: string;
  durationDays: number;
  images?: string[];
  agency?: {
    verificationStatus?: VerificationStatusType;
  };
  sessions?: Array<{
    id: string;
    status: SessionStatusType;
    availableSeats: number;
    price: number;
    startDate: string;
  }>;
};

type TripsSearchResponse = {
  data: SearchTrip[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

type FilterKey = keyof SearchFilters;
type SortBy = "price" | "rating" | "popularity" | "createdAt";
type SortOrder = "asc" | "desc";

export default function SearchPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQueryInput, setSearchQueryInput] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [filters, setFilters] = useState<SearchFilters>({
    category: "",
    duration: "",
    priceMax: "",
    searchQuery: "",
    dateFrom: "",
    dateTo: "",
    priceMin: "",
    availabilityOnly: false,
    ratingMin: 0,
  });

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

  const updateFilter = useCallback((key: FilterKey, value: SearchFilters[FilterKey]) => {
    setFilters((currentFilters) => {
      const nextFilters = { ...currentFilters, [key]: value };
      const params = new URLSearchParams();
      if (nextFilters.searchQuery) params.append("q", nextFilters.searchQuery);
      if (nextFilters.category) params.append("category", nextFilters.category);
      if (nextFilters.priceMin) params.append("priceMin", nextFilters.priceMin);
      if (nextFilters.priceMax) params.append("priceMax", nextFilters.priceMax);
      router.push(`/search?${params.toString()}`);
      return nextFilters;
    });
    setCurrentPage(1);
  }, [router]);

  // Debounce local input -> sync to filters.searchQuery
  useEffect(() => {
    const t = setTimeout(() => {
      updateFilter("searchQuery", searchQueryInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQueryInput, updateFilter]);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.append("status", TripStatus.Active);
    if (filters.searchQuery) params.append("q", filters.searchQuery);
    if (filters.category) params.append("category", filters.category);
    if (filters.priceMin) params.append("priceMin", filters.priceMin);
    if (filters.priceMax) params.append("priceMax", filters.priceMax);
    if (filters.dateFrom) params.append("startDateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("startDateTo", filters.dateTo);
    if (filters.availabilityOnly) params.append("available", "true");
    if (filters.ratingMin > 0) params.append("ratingMin", String(filters.ratingMin));
    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);
    params.append("page", String(currentPage));
    params.append("limit", "20");
    return params;
  }, [filters, sortBy, sortOrder, currentPage]);

  const { data: response, isLoading, error, isError } = useQuery<TripsSearchResponse>({
    queryKey: ["trips", filters, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      const params = buildQueryParams();
      const res = await apiClient.get(`/trips?${params.toString()}`);
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const trips = response?.data || [];
  const pagination = response?.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 };

  const clearAllFilters = () => {
    setFilters({
      category: "",
      duration: "",
      priceMax: "",
      searchQuery: "",
      dateFrom: "",
      dateTo: "",
      priceMin: "",
      availabilityOnly: false,
      ratingMin: 0,
    });
    setSearchQueryInput("");
    setCurrentPage(1);
    setSortBy("createdAt");
    setSortOrder("desc");
    router.push("/search");
  };

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; onRemove: () => void }[] = [];
    if (filters.priceMin || filters.priceMax) {
      const min = filters.priceMin || "0";
      const max = filters.priceMax || "8";
      chips.push({ label: `Price: ${min}-${max} MAD`, onRemove: () => { updateFilter("priceMin", ""); updateFilter("priceMax", ""); } });
    }
    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom ? new Date(filters.dateFrom).toLocaleDateString() : "any";
      const to = filters.dateTo ? new Date(filters.dateTo).toLocaleDateString() : "any";
      chips.push({ label: `Dates: ${from} - ${to}`, onRemove: () => { updateFilter("dateFrom", ""); updateFilter("dateTo", ""); } });
    }
    if (filters.availabilityOnly) chips.push({ label: "Available Only", onRemove: () => updateFilter("availabilityOnly", false) });
    if (filters.ratingMin > 0) chips.push({ label: `Rating: ${filters.ratingMin}+`, onRemove: () => updateFilter("ratingMin", 0) });
    return chips;
  }, [filters, updateFilter]);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="pt-28 pb-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold">Find your next Adventure</motion.h1>
          <div className="mt-6 max-w-3xl mx-auto">
            <div className="flex gap-3 bg-card p-2 rounded-2xl items-center">
              <div className="flex-1 flex items-center gap-3 px-4">
                <Search className="h-5 w-5 text-muted-foreground" />
                <input value={searchQueryInput} onChange={(e) => setSearchQueryInput(e.target.value)} placeholder="Destination, activity or keyword" className="bg-transparent w-full outline-none" />
              </div>
              <Button onClick={() => updateFilter('searchQuery', searchQueryInput)}>Search</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex gap-8">
          <aside className="w-72 shrink-0">
            <div className="bg-card p-5 rounded-2xl border border-border space-y-6 sticky top-28">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</h3>
                {activeFiltersCount > 0 && <button onClick={clearAllFilters} className="text-sm text-muted-foreground">Clear</button>}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Travel Styles</p>
                <div className="grid gap-2">
                  {['Adventure', 'Cultural', 'Luxury', 'Budget', 'Nature'].map((cat) => (
                    <button key={cat} onClick={() => updateFilter('category', filters.category === cat ? '' : cat)} className={cn('px-3 py-2 rounded-lg text-sm text-left', filters.category === cat ? 'bg-sunset-orange/10 text-sunset-orange' : 'bg-muted')}>{cat}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Dates</p>
                <Input type="date" value={filters.dateFrom} onChange={(event) => updateFilter('dateFrom', event.target.value)} />
                <Input type="date" value={filters.dateTo} onChange={(event) => updateFilter('dateTo', event.target.value)} />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Price (MAD)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Min" value={filters.priceMin} onChange={(event) => updateFilter('priceMin', event.target.value)} />
                  <Input type="number" placeholder="Max" value={filters.priceMax} onChange={(event) => updateFilter('priceMax', event.target.value)} />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Availability</p>
                <button onClick={() => updateFilter('availabilityOnly', !filters.availabilityOnly)} className={cn('px-3 py-2 rounded-lg w-full', filters.availabilityOnly ? 'bg-emerald-100' : 'bg-muted')}>Only show available dates</button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Sort</p>
                <div className="grid gap-2">
                  {[
                    { value: 'createdAt', label: 'Newest' },
                    { value: 'price', label: 'Price' },
                    { value: 'rating', label: 'Rating' },
                    { value: 'popularity', label: 'Popularity' },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => setSortBy(opt.value as SortBy)} className={cn('px-3 py-2 rounded-lg', sortBy === opt.value ? 'bg-sunset-orange/10' : 'bg-muted')}>{opt.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1">
            {activeFilterChips.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {activeFilterChips.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Badge className="px-3 py-1 flex items-center gap-2">{c.label} <button onClick={c.onRemove}><X className="h-3 w-3" /></button></Badge>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="mb-4 flex items-center justify-between bg-muted/50 p-3 rounded-lg border border-border">
              <div className="text-sm text-muted-foreground">Showing <strong className="text-foreground">{(pagination.page - 1) * pagination.limit + trips.length}</strong> of <strong>{pagination.total}</strong></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSortOrder((state) => state === 'asc' ? 'desc' : 'asc')} className="px-3 py-1 rounded-lg bg-muted">{sortOrder === 'asc' ? 'Asc' : 'Desc'}</button>
              </div>
            </div>

            {isError && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                <p className="font-semibold text-red-700">Failed to load trips</p>
                <p className="text-sm text-red-600 mt-1">{error instanceof Error ? error.message : 'Please try again'}</p>
                <div className="mt-3"><Button onClick={() => window.location.reload()}>Retry</Button></div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {isLoading ? (
                [1,2,3,4].map(i => (
                  <div key={i} className="rounded-2xl border border-border bg-card p-4">
                    <div className="h-40 bg-muted animate-pulse rounded-md" />
                    <div className="h-4 bg-muted rounded mt-4 w-1/2 animate-pulse" />
                  </div>
                ))
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
                  <h3 className="text-lg font-semibold">No trips match your filters</h3>
                  <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or clearing them.</p>
                </div>
              )}
            </div>

            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="px-3 py-1 rounded-lg bg-muted"><ChevronLeft /></button>
                {Array.from({ length: pagination.totalPages }, (_,i)=>i+1).filter(p=>Math.abs(p-currentPage)<=2||p===1||p===pagination.totalPages).map(p=> (
                  <button key={p} onClick={()=>setCurrentPage(p)} className={cn('px-3 py-1 rounded-lg', p===currentPage?'bg-sunset-orange text-white':'bg-muted')}>{p}</button>
                ))}
                <button onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p+1))} disabled={currentPage===pagination.totalPages} className="px-3 py-1 rounded-lg bg-muted"><ChevronRight /></button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
