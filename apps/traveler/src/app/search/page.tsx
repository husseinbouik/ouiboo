"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import {
  Search,
  Filter,
  Compass,
  Zap,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, Input, Badge } from "@ouiboo/ui";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@ouiboo/ui/utils";
import { TripCard } from "@/components/TripCard";

export default function SearchPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQueryInput, setSearchQueryInput] = useState("");
  const [sortBy, setSortBy] = useState<"price" | "rating" | "popularity" | "createdAt">(
    "createdAt"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [filters, setFilters] = useState({
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

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Debounce local input -> sync to filters.searchQuery
  useEffect(() => {
    const t = setTimeout(() => {
      updateFilter("searchQuery", searchQueryInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQueryInput]);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    // backend expects status=APPROVED
    params.append("status", "APPROVED");
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

  const { data: response, isLoading, error, isError } = useQuery({
    queryKey: ["trips", filters, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      const params = buildQueryParams();
      const res = await apiClient.get(`/trips?${params.toString()}`);
      return res.data;
    },
    keepPreviousData: true,
  });

  const trips = response?.data || [];
  const pagination = response?.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 };

  const updateFilter = (key: string, value: string | boolean | number) => {
    const newFilters = { ...filters, [key]: value } as any;
    setFilters(newFilters);
    setCurrentPage(1);

    const count = Object.entries(newFilters).filter(([k, v]) => {
      if (k === "searchQuery") return false;
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v > 0;
      return v !== "";
    }).length;
    setActiveFiltersCount(count);

    // update shallow URL for shareability (keeps it light)
    const params = new URLSearchParams();
    if (newFilters.searchQuery) params.append("q", newFilters.searchQuery);
    if (newFilters.category) params.append("cat", newFilters.category);
    if (newFilters.priceMin) params.append("priceMin", newFilters.priceMin);
    if (newFilters.priceMax) params.append("priceMax", newFilters.priceMax);
    router.push(`/search?${params.toString()}`);
  };

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
      const max = filters.priceMax || "∞";
      chips.push({ label: `Price: ${min}-${max} MAD`, onRemove: () => { updateFilter("priceMin", ""); updateFilter("priceMax", ""); } });
    }
    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom ? new Date(filters.dateFrom).toLocaleDateString() : "any";
      const to = filters.dateTo ? new Date(filters.dateTo).toLocaleDateString() : "any";
      chips.push({ label: `Dates: ${from} → ${to}`, onRemove: () => { updateFilter("dateFrom", ""); updateFilter("dateTo", ""); } });
    }
    if (filters.availabilityOnly) chips.push({ label: "Available Only", onRemove: () => updateFilter("availabilityOnly", false) });
    if (filters.ratingMin > 0) chips.push({ label: `Rating: ${filters.ratingMin}+ ★`, onRemove: () => updateFilter("ratingMin", 0) });
    return chips;
  }, [filters]);

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
                <Input type="date" value={filters.dateFrom} onChange={(e:any)=> updateFilter('dateFrom', e.target.value)} />
                <Input type="date" value={filters.dateTo} onChange={(e:any)=> updateFilter('dateTo', e.target.value)} />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase">Price (MAD)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Min" value={filters.priceMin} onChange={(e:any)=> updateFilter('priceMin', e.target.value)} />
                  <Input type="number" placeholder="Max" value={filters.priceMax} onChange={(e:any)=> updateFilter('priceMax', e.target.value)} />
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
                    <button key={opt.value} onClick={() => setSortBy(opt.value as any)} className={cn('px-3 py-2 rounded-lg', sortBy === opt.value ? 'bg-sunset-orange/10' : 'bg-muted')}>{opt.label}</button>
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
                <button onClick={() => setSortOrder(s => s==='asc'?'desc':'asc')} className="px-3 py-1 rounded-lg bg-muted">{sortOrder==='asc'?'↑ Asc':'↓ Desc'}</button>
              </div>
            </div>

            {isError && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                <p className="font-semibold text-red-700">Failed to load trips</p>
                <p className="text-sm text-red-600 mt-1">{(error as any)?.message || 'Please try again'}</p>
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
                  {trips.map((t:any, idx:number) => (
                    <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                      <TripCard trip={t} />
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
'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { 
  Search, MapPin, Calendar, Star, SlidersHorizontal, ChevronDown, 
  Map as MapIcon, Filter, Layers, Navigation, ArrowRight, Heart,
  Compass, Zap, Mountain, Camera, Coffee, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button, Input, Card, CardContent, Badge } from '@ouiboo/ui';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';
import { TripCard } from "@/components/TripCard";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQueryInput, setSearchQueryInput] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'popularity' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [filters, setFilters] = useState({
    category: '',
    duration: '',
    priceMax: '',
    searchQuery: '',
    dateFrom: '',
    dateTo: '',
    priceMin: '',
    availabilityOnly: false,
    ratingMin: 0,
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Debounced search query
  const debouncedSearchQuery = useCallback(() => {
    const timer = setTimeout(() => {
      updateFilter('searchQuery', searchQueryInput);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQueryInput]);

  useEffect(() => {
    const cleanup = debouncedSearchQuery();
    return cleanup;
  }, [debouncedSearchQuery]);

  // Build comprehensive query parameters for backend API
  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    params.append('status', 'APPROVED');
    
    if (filters.searchQuery) params.append('q', filters.searchQuery);
    if (filters.category) params.append('category', filters.category);
    if (filters.priceMin) params.append('priceMin', filters.priceMin);
    if (filters.priceMax) params.append('priceMax', filters.priceMax);
    if (filters.dateFrom) params.append('startDateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('startDateTo', filters.dateTo);
    if (filters.availabilityOnly) params.append('available', 'true');
    if (filters.ratingMin > 0) params.append('ratingMin', filters.ratingMin.toString());
    
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);
    params.append('page', currentPage.toString());
    params.append('limit', '20');
    
    return params;
  }, [filters, sortBy, sortOrder, currentPage]);

  // Query API with full filter support
  const { data: response, isLoading, error, isError } = useQuery({
    queryKey: ['trips', filters, sortBy, sortOrder, currentPage],
    queryFn: async () => {
      const params = buildQueryParams();
      const result = await apiClient.get(`/trips?${params.toString()}`);
      return result.data;
    },
    keepPreviousData: true,
  });

  // Extract data and pagination info from response
  const trips = response?.data || [];
  const pagination = response?.pagination || {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };

  const updateFilter = (key: string, value: string | boolean | number) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1); // Reset to page 1 when filters change
    
    // Calculate active filters
    const count = Object.entries(newFilters).filter(([k, v]) => {
      if (k === 'searchQuery') return false;
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v > 0;
      return v !== '';
    }).length;
    setActiveFiltersCount(count);

    // Update URL with filter params for shareability
    const params = new URLSearchParams();
    if (newFilters.searchQuery) params.append('q', newFilters.searchQuery);
    if (newFilters.category) params.append('cat', newFilters.category);
    if (newFilters.priceMin) params.append('priceMin', newFilters.priceMin);
    if (newFilters.priceMax) params.append('priceMax', newFilters.priceMax);
    router.push(`/search?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setFilters({
      category: '',
      duration: '',
      priceMax: '',
      searchQuery: '',
      dateFrom: '',
      dateTo: '',
      priceMin: '',
      availabilityOnly: false,
      ratingMin: 0,
    });
    setSearchQueryInput('');
    setCurrentPage(1);
    setSortBy('createdAt');
    setSortOrder('desc');
    router.push('/search');
  };

  // Build active filters display chips
  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.priceMin || filters.priceMax) {
      const min = filters.priceMin || '0';
      const max = filters.priceMax || '∞';
      chips.push({
        label: `Price: ${min}-${max} MAD`,
        onRemove: () => {
          updateFilter('priceMin', '');
          updateFilter('priceMax', '');
        }
      });
    }
    if (filters.dateFrom || filters.dateTo) {
      const from = filters.dateFrom ? new Date(filters.dateFrom).toLocaleDateString() : 'any';
      const to = filters.dateTo ? new Date(filters.dateTo).toLocaleDateString() : 'any';
      chips.push({
        label: `Dates: ${from} to ${to}`,
        onRemove: () => {
          updateFilter('dateFrom', '');
          updateFilter('dateTo', '');
        }
      });
    }
    if (filters.availabilityOnly) {
      chips.push({
        label: 'Available Only',
        onRemove: () => updateFilter('availabilityOnly', false)
      });
    }
    if (filters.ratingMin > 0) {
      chips.push({
        label: `Rating: ${filters.ratingMin}+ ★`,
        onRemove: () => updateFilter('ratingMin', 0)
      });
    }
    return chips;
  }, [filters]);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground overflow-hidden">
      {/* Background Blobs (Consistent with Landing Page) */}
      <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 opacity-20 dark:opacity-10 pointer-events-none">
          <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-sunset-orange sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 top-[40rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[40rem] opacity-20 dark:opacity-10 pointer-events-none">
          <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative right-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] translate-x-1/2 rotate-[120deg] bg-blue-400 sm:right-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
      </div>

      {/* Header Section */}
      <div className="relative pt-32 pb-10 px-6">
        <div className="max-w-7xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
               <span className="rounded-full bg-sunset-orange/10 px-3 py-1 text-sm font-semibold text-sunset-orange ring-1 ring-inset ring-sunset-orange/20 mb-6 inline-block">
                  Directory
               </span>
               <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground font-display mb-4">
                 Find your next <span className="text-sunset-orange">Adventure</span>
               </h1>
               <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                 Explore our curated collection of unique trips and experiences.
               </p>
            </motion.div>

           {/* Integrated Search Bar */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="max-w-3xl mx-auto"
           >
              <div className="bg-card p-2 rounded-2xl shadow-xl border border-border flex flex-col md:flex-row gap-2">
                 <div className="flex-1 flex items-center px-4 py-3 bg-muted rounded-xl border border-transparent focus-within:bg-card focus-within:border-border transition-all">
                    <Search className="h-5 w-5 text-sunset-orange mr-3 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Destination, activity, or keyword..." 
                      className="bg-transparent border-none focus:outline-none text-foreground w-full placeholder:text-muted-foreground font-medium h-10"
                      value={searchQueryInput}
                      onChange={(e) => setSearchQueryInput(e.target.value)}
                    />
                 </div>
                 <Button className="h-16 md:h-auto px-8 rounded-xl bg-deep-blue dark:bg-sunset-orange hover:bg-blue-900 dark:hover:bg-orange-600 text-white font-semibold text-lg shadow-md transition-all shrink-0">
                    Search
                 </Button>
              </div>
           </motion.div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Filters Sidebar */}
          <aside className="lg:w-72 shrink-0 space-y-8">
            <div className="bg-card/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-sm border border-border sticky top-28">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Filter className="h-4 w-4 text-sunset-orange" />
                        Filters
                    </h3>
                    {activeFiltersCount > 0 && (
                        <button 
                            onClick={clearAllFilters}
                            className="text-xs font-semibold text-muted-foreground hover:text-red-500 transition-colors"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Category Filter */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Travel Styles</p>
                        <div className="grid grid-cols-1 gap-2">
                            {['Adventure', 'Cultural', 'Luxury', 'Budget', 'Nature'].map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => updateFilter('category', filters.category === cat ? '' : cat)}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all border",
                                        filters.category === cat 
                                            ? "bg-sunset-orange/10 border-sunset-orange/20 text-sunset-orange" 
                                            : "bg-muted border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                    )}
                                >
                                    {cat}
                                    {filters.category === cat && <Zap className="h-3.5 w-3.5" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Filter */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dates</p>
                        <div className="grid grid-cols-1 gap-3">
                            <Input
                              type="date"
                              value={filters.dateFrom}
                              onChange={(e) => updateFilter('dateFrom', e.target.value)}
                              className="rounded-xl border-border bg-muted text-sm font-medium"
                            />
                            <Input
                              type="date"
                              value={filters.dateTo}
                              onChange={(e) => updateFilter('dateTo', e.target.value)}
                              className="rounded-xl border-border bg-muted text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Price Filter */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Price Range (MAD)</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                              type="number"
                              min="0"
                              placeholder="Min"
                              value={filters.priceMin}
                              onChange={(e) => updateFilter('priceMin', e.target.value)}
                              className="rounded-xl border-border bg-muted text-sm font-medium"
                            />
                            <Input
                              type="number"
                              min="0"
                              placeholder="Max"
                              value={filters.priceMax}
                              onChange={(e) => updateFilter('priceMax', e.target.value)}
                              className="rounded-xl border-border bg-muted text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Rating Filter */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Minimum Rating</p>
                        <div className="flex gap-2">
                            {[0, 3.5, 4, 4.5].map(rating => (
                                <button
                                  key={rating}
                                  onClick={() => updateFilter('ratingMin', filters.ratingMin === rating ? 0 : rating)}
                                  className={cn(
                                    "px-3 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1",
                                    filters.ratingMin === rating
                                      ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600"
                                      : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
                                  )}
                                >
                                  {rating === 0 ? 'Any' : `${rating}★`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Availability Filter */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Availability</p>
                        <button
                          onClick={() => updateFilter('availabilityOnly', !filters.availabilityOnly)}
                          className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all border w-full",
                            filters.availabilityOnly
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                              : "bg-muted border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/80"
                          )}
                        >
                          Only show available dates
                          {filters.availabilityOnly && <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">On</Badge>}
                        </button>
                    </div>

                    {/* Sort Options */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sort By</p>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                              { value: 'createdAt', label: 'Newest' },
                              { value: 'price', label: 'Price' },
                              { value: 'rating', label: 'Rating' },
                              { value: 'popularity', label: 'Popularity' }
                            ].map(option => (
                                <button
                                  key={option.value}
                                  onClick={() => setSortBy(option.value as any)}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-semibold transition-all border text-left",
                                    sortBy === option.value
                                      ? "bg-sunset-orange/10 border-sunset-orange/20 text-sunset-orange"
                                      : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80"
                                  )}
                                >
                                  {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
          </aside>

          {/* Results Area */}
          <main className="flex-1 space-y-8">
            {/* Active Filters Display */}
            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeFilterChips.map((chip, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <Badge className="bg-sunset-orange/10 border-sunset-orange/20 text-sunset-orange px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-sunset-orange/20 transition-colors">
                      {chip.label}
                      <button onClick={chip.onRemove} className="ml-1">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-muted/50 backdrop-blur-sm p-3 rounded-2xl border border-border">
               <div className="px-4 py-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Showing <span className="font-bold text-foreground">{(pagination.page - 1) * 20 + trips.length}</span> of <span className="font-bold text-foreground">{pagination.total}</span> results
                  </p>
               </div>
               <div className="flex items-center gap-2 mt-3 sm:mt-0">
                  <span className="text-xs text-muted-foreground">Sort Order:</span>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-semibold transition-colors"
                  >
                    {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                  </button>
               </div>
            </div>

            {/* Error State */}
            {isError && (
              <div className="col-span-full py-12 text-center bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-red-600 font-semibold">Failed to load trips</p>
                <p className="text-sm text-red-500/70 mt-1">{error?.message || 'Please try again'}</p>
              </div>
            )}

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {isLoading ? (
                [1,2,3,4].map(i => (
                    <div key={i} className="rounded-[2rem] border border-border bg-card/80 overflow-hidden">
                      <div className="h-52 bg-muted animate-pulse" />
                      <div className="p-6 space-y-4">
                        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                        <div className="h-10 w-full bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                ))
              ) : (
                <AnimatePresence mode="popLayout">
                    {trips.length > 0 ? trips.map((trip: any, idx: number) => (
                      <motion.div 
                          key={trip.id} 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                      >
                          <TripCard trip={trip} />
                      </motion.div>
                    )) : null}
                </AnimatePresence>
              )}
              {!isLoading && !isError && trips.length === 0 && (
                 <div className="col-span-full py-20 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Compass className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">No trips match your filters</h3>
                    <p className="text-muted-foreground mt-2">Adjust dates, price, or availability to explore more options.</p>
                    <button
                      onClick={clearAllFilters}
                      className="mt-4 px-4 py-2 rounded-lg bg-sunset-orange/10 hover:bg-sunset-orange/20 text-sunset-orange text-sm font-semibold transition-colors"
                    >
                      Clear all filters
                    </button>
                 </div>
              )}
            </div>

            {/* Pagination Controls */}
            {!isLoading && pagination.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 border-t border-border">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all",
                    currentPage === 1
                      ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show current page ±2
                      return Math.abs(page - currentPage) <= 2 || page === 1 || page === pagination.totalPages;
                    })
                    .map((page, idx, arr) => {
                      // Add ellipsis between gaps
                      if (idx > 0 && arr[idx - 1] !== page - 1) {
                        return (
                          <React.Fragment key={`ellipsis-${page}`}>
                            <span className="px-2 py-1 text-muted-foreground">...</span>
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "px-3 py-1 rounded-lg text-sm font-semibold transition-all",
                                currentPage === page
                                  ? "bg-sunset-orange text-white"
                                  : "bg-muted hover:bg-muted/80 text-foreground"
                              )}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-sm font-semibold transition-all",
                            currentPage === page
                              ? "bg-sunset-orange text-white"
                              : "bg-muted hover:bg-muted/80 text-foreground"
                          )}
                        >
                          {page}
                        </button>
                      );
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all",
                    currentPage === pagination.totalPages
                      ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-background font-sans text-foreground overflow-hidden">
      {/* Background Blobs (Consistent with Landing Page) */}
      <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 opacity-20 dark:opacity-10 pointer-events-none">
          <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-sunset-orange sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 top-[40rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[40rem] opacity-20 dark:opacity-10 pointer-events-none">
          <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative right-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] translate-x-1/2 rotate-[120deg] bg-blue-400 sm:right-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
      </div>

      {/* Header Section */}
      <div className="relative pt-32 pb-10 px-6">
        <div className="max-w-7xl mx-auto text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10"
            >
               <span className="rounded-full bg-sunset-orange/10 px-3 py-1 text-sm font-semibold text-sunset-orange ring-1 ring-inset ring-sunset-orange/20 mb-6 inline-block">
                  Directory
               </span>
               <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground font-display mb-4">
                 Find your next <span className="text-sunset-orange">Adventure</span>
               </h1>
               <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                 Explore our curated collection of unique trips and experiences.
               </p>
            </motion.div>

           {/* Integrated Search Bar */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="max-w-3xl mx-auto"
           >
              <div className="bg-card p-2 rounded-2xl shadow-xl border border-border flex flex-col md:flex-row gap-2">
                 <div className="flex-1 flex items-center px-4 py-3 bg-muted rounded-xl border border-transparent focus-within:bg-card focus-within:border-border transition-all">
                    <Search className="h-5 w-5 text-sunset-orange mr-3 shrink-0" />
                    <input 
                      type="text" 
                      placeholder="Destination, activity, or keyword..." 
                      className="bg-transparent border-none focus:outline-none text-foreground w-full placeholder:text-muted-foreground font-medium h-10"
                      value={filters.searchQuery}
                      onChange={(e) => updateFilter('searchQuery', e.target.value)}
                    />
                 </div>
                 <Button className="h-16 md:h-auto px-8 rounded-xl bg-deep-blue dark:bg-sunset-orange hover:bg-blue-900 dark:hover:bg-orange-600 text-white font-semibold text-lg shadow-md transition-all shrink-0">
                    Search
                 </Button>
              </div>
           </motion.div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Filters Sidebar */}
          <aside className="lg:w-72 shrink-0 space-y-8">
            <div className="bg-card/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-sm border border-border sticky top-28">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Filter className="h-4 w-4 text-sunset-orange" />
                        Filters
                    </h3>
                    {activeFiltersCount > 0 && (
                        <button 
                            onClick={() => setFilters({ category: '', duration: '', priceMax: '', searchQuery: filters.searchQuery, dateFrom: '', dateTo: '', priceMin: '', availabilityOnly: false })}
                            className="text-xs font-semibold text-muted-foreground hover:text-red-500 transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Category Filter */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Travel Styles</p>
                        <div className="grid grid-cols-1 gap-2">
                            {['Adventure', 'Cultural', 'Luxury', 'Budget', 'Nature'].map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => updateFilter('category', filters.category === cat ? '' : cat)}
                                    className={cn(
                                        "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all border",
                                        filters.category === cat 
                                            ? "bg-sunset-orange/10 border-sunset-orange/20 text-sunset-orange" 
                                            : "bg-muted border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/80"
                                    )}
                                >
                                    {cat}
                                    {filters.category === cat && <Zap className="h-3.5 w-3.5" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Filter */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dates</p>
                        <div className="grid grid-cols-1 gap-3">
                            <Input
                              type="date"
                              value={filters.dateFrom}
                              onChange={(e) => updateFilter('dateFrom', e.target.value)}
                              className="rounded-xl border-border bg-muted text-sm font-medium"
                            />
                            <Input
                              type="date"
                              value={filters.dateTo}
                              onChange={(e) => updateFilter('dateTo', e.target.value)}
                              className="rounded-xl border-border bg-muted text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Price Filter */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Price Range (MAD)</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                              type="number"
                              min="0"
                              placeholder="Min"
                              value={filters.priceMin}
                              onChange={(e) => updateFilter('priceMin', e.target.value)}
                              className="rounded-xl border-border bg-muted text-sm font-medium"
                            />
                            <Input
                              type="number"
                              min="0"
                              placeholder="Max"
                              value={filters.priceMax}
                              onChange={(e) => updateFilter('priceMax', e.target.value)}
                              className="rounded-xl border-border bg-muted text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Availability Filter */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Availability</p>
                        <button
                          onClick={() => updateFilter('availabilityOnly', !filters.availabilityOnly)}
                          className={cn(
                            "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all border w-full",
                            filters.availabilityOnly
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                              : "bg-muted border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/80"
                          )}
                        >
                          Only show available dates
                          {filters.availabilityOnly && <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">On</Badge>}
                        </button>
                    </div>
                </div>
            </div>
          </aside>

          {/* Results Area */}
          <main className="flex-1 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-muted/50 backdrop-blur-sm p-1 rounded-2xl border border-border">
               <div className="px-4 py-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Showing <span className="font-bold text-foreground">{filteredTrips.length}</span> results
                  </p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {isLoading ? (
                [1,2,3,4].map(i => (
                    <div key={i} className="rounded-[2rem] border border-border bg-card/80 overflow-hidden">
                      <div className="h-52 bg-muted animate-pulse" />
                      <div className="p-6 space-y-4">
                        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                        <div className="h-10 w-full bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                ))
              ) : (
                <AnimatePresence mode="popLayout">
                    {filteredTrips.map((trip: any, idx: number) => (
                      <motion.div 
                          key={trip.id} 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                      >
                          <TripCard trip={trip} />
                      </motion.div>
                    ))}
                </AnimatePresence>
              )}
              {!isLoading && filteredTrips.length === 0 && (
                 <div className="col-span-full py-20 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Compass className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">No trips match your filters</h3>
                    <p className="text-muted-foreground mt-2">Adjust dates, price, or availability to explore more options.</p>
                 </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

