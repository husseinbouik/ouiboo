'use client';

import React, { useState } from 'react';
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
    searchQuery: ''
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

  const updateFilter = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Calculate active filters (excluding searchQuery)
    const count = Object.entries(newFilters).filter(([k, v]) => k !== 'searchQuery' && v !== '').length;
    setActiveFiltersCount(count);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Search Header - Immersive */}
      <div className="relative bg-slate-950 pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sunset-orange/20 blur-[150px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-ocean/10 blur-[150px] rounded-full" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Badge className="bg-white/10 text-white border-white/20 px-4 py-1.5 rounded-full mb-6 text-[10px] font-black uppercase tracking-[0.3em]">
                Directory
            </Badge>
            <h1 className="text-5xl md:text-7xl font-black text-white font-display tracking-tighter mb-4">
              Find your next <span className="text-sunset-orange">Story</span>
            </h1>
          </motion.div>

          {/* Integrated Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-white/5 backdrop-blur-3xl p-2 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 group-focus-within:text-sunset-orange transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Destination, activity, or keyword..." 
                        className="w-full h-16 pl-16 pr-6 bg-transparent border-none rounded-3xl focus:ring-0 outline-none text-white font-bold text-lg placeholder:text-white/20"
                        value={filters.searchQuery}
                        onChange={(e) => updateFilter('searchQuery', e.target.value)}
                    />
                </div>
                <div className="hidden md:block w-px h-10 self-center bg-white/10" />
                <div className="px-4 flex items-center gap-4">
                    <button className="h-16 px-8 rounded-[1.5rem] bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all font-bold flex items-center gap-3">
                        <Calendar className="h-5 w-5" />
                        <span>Anytime</span>
                    </button>
                    <Button className="h-16 px-10 rounded-[1.5rem] bg-sunset-orange hover:bg-orange-600 text-white font-black text-lg shadow-xl shadow-orange-900/40 border-none transition-all hover:scale-105 active:scale-95">
                        Search
                    </Button>
                </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
        <div className="flex flex-col lg:flex-row gap-10">
          
          {/* Filters Sidebar */}
          <aside className="lg:w-80 shrink-0 space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-border sticky top-28">
                <div className="flex items-center justify-between mb-10">
                    <h3 className="text-xl font-black text-foreground font-display tracking-tight flex items-center gap-3">
                        <Filter className="h-5 w-5 text-sunset-orange" />
                        Filters
                    </h3>
                    {activeFiltersCount > 0 && (
                        <button 
                            onClick={() => setFilters({ category: '', duration: '', priceMax: '', searchQuery: filters.searchQuery })}
                            className="text-[10px] font-black text-muted-foreground hover:text-red-500 uppercase tracking-widest transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>

                <div className="space-y-10">
                    {/* Category Filter */}
                    <div className="space-y-5">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Travel Styles</p>
                        <div className="grid grid-cols-1 gap-2">
                            {['Adventure', 'Cultural', 'Luxury', 'Budget', 'Nature'].map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => updateFilter('category', filters.category === cat ? '' : cat)}
                                    className={cn(
                                        "flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-bold transition-all border",
                                        filters.category === cat 
                                            ? "bg-sunset-orange/10 border-sunset-orange text-sunset-orange shadow-sm" 
                                            : "bg-muted/30 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                                    )}
                                >
                                    {cat}
                                    {filters.category === cat && <Zap className="h-4 w-4" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
          </aside>

          {/* Results Area */}
          <main className="flex-1 space-y-12">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-border">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-muted flex items-center justify-center">
                        <Navigation className="h-6 w-6 text-sunset-orange" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-foreground font-display leading-none">
                            {isLoading ? 'Scanning Atlas...' : `${trips?.length || 0} Trips Available`}
                        </h2>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mt-1">Found in North Africa</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {isLoading ? (
                [1,2,3,4].map(i => (
                    <div key={i} className="h-[480px] bg-muted/20 rounded-[3rem] animate-pulse relative overflow-hidden ring-1 ring-border" />
                ))
              ) : (
                <AnimatePresence mode="popLayout">
                    {trips?.map((trip: any, idx: number) => (
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
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
