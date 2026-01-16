'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { 
  Search, MapPin, Calendar, Star, SlidersHorizontal, ChevronDown, 
  Map as MapIcon, Filter, Layers, Navigation, ArrowRight, Heart,
  Compass, Zap, Mountain, Camera, Coffee
} from 'lucide-react';
import { Button, Input, Card, CardContent, Badge } from '@ouiboo/ui';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';
import { TripCard } from "@/components/TripCard";

export default function SearchPage() {
  const [filters, setFilters] = useState({
    category: '',
    duration: '',
    priceMax: '',
    searchQuery: '',
    dateFrom: '',
    dateTo: '',
    priceMin: '',
    availabilityOnly: false
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.searchQuery) params.append('q', filters.searchQuery);
      const response = await apiClient.get(`/trips?status=ACTIVE&${params.toString()}`);
      return response.data;
    }
  });

  const updateFilter = (key: string, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Calculate active filters (excluding searchQuery)
    const count = Object.entries(newFilters).filter(([k, v]) => {
      if (k === 'searchQuery') return false;
      if (typeof v === 'boolean') return v;
      return v !== '';
    }).length;
    setActiveFiltersCount(count);
  };

  const filteredTrips = useMemo(() => {
    if (!trips) return [];
    return trips.filter((trip: any) => {
      const sessions = trip.sessions || [];
      const sessionDates = sessions.map((session: any) => new Date(session.startDate));
      const minPrice = sessions.length
        ? Math.min(...sessions.map((session: any) => Number(session.price || 0)))
        : null;

      if (filters.priceMin && minPrice !== null && minPrice < Number(filters.priceMin)) {
        return false;
      }
      if (filters.priceMax && minPrice !== null && minPrice > Number(filters.priceMax)) {
        return false;
      }

      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (!sessionDates.some((date: Date) => date >= fromDate)) {
          return false;
        }
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (!sessionDates.some((date: Date) => date <= toDate)) {
          return false;
        }
      }

      if (filters.availabilityOnly) {
        const hasAvailability = sessions.some(
          (session: any) => session.status === 'OPEN' && session.availableSeats > 0
        );
        if (!hasAvailability) return false;
      }

      return true;
    });
  }, [filters, trips]);

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
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🧭</div>
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
