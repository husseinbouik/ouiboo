'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Search, MapPin, Calendar, Star, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Button, Input, Card, CardContent } from '@ouiboo/ui';
import Link from 'next/link';

export default function SearchPage() {
  const [filters, setFilters] = useState({
    category: '',
    duration: '',
    priceMax: ''
  });

  const { data: trips, isLoading } = useQuery({
    queryKey: ['trips', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      // Backend doesn't support these yet, but we'll prepare the UI
      const response = await apiClient.get(`/trips?${params.toString()}`);
      return response.data;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header & Search */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-12 flex flex-col lg:flex-row gap-6 items-center">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by destination or experience..." 
              className="w-full h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-sunset-orange/20 outline-none"
            />
          </div>
          
          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
             <div className="relative min-w-[160px]">
                <select 
                  className="w-full h-14 pl-4 pr-10 bg-gray-50 border-none rounded-2xl outline-none appearance-none font-semibold text-gray-700"
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                >
                   <option value="">Any Category</option>
                   <option value="Adventure">Adventure</option>
                   <option value="Cultural">Cultural</option>
                   <option value="Luxury">Luxury</option>
                   <option value="Budget">Budget</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
             </div>
             
             <Button className="h-14 px-8 bg-sunset-orange hover:bg-orange-600 border-none">
                <SlidersHorizontal className="h-5 w-5 mr-2" /> Filters
             </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 space-y-6">
            <div className="flex justify-between items-center mb-6">
               <h1 className="text-2xl font-bold text-deep-blue">
                 {isLoading ? 'Searching...' : `${trips?.length || 0} adventures found`}
               </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isLoading ? (
                [1,2,3,4].map(i => <div key={i} className="h-96 bg-gray-200 rounded-3xl animate-pulse"></div>)
              ) : (
                trips?.map((trip: any) => (
                  <Link key={trip.id} href={`/trip/${trip.id}`}>
                    <Card className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-white flex flex-col h-full">
                       <div className="relative h-60 overflow-hidden">
                          <img 
                            src={trip.images?.[0] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            alt=""
                          />
                          <div className="absolute top-4 left-4">
                             <span className="px-3 py-1.5 bg-white/95 backdrop-blur-sm text-deep-blue text-xs font-black rounded-xl uppercase">
                               {trip.category}
                             </span>
                          </div>
                       </div>
                       <CardContent className="p-6 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-3">
                             <h3 className="text-xl font-bold text-deep-blue line-clamp-2 leading-tight flex-1">{trip.title}</h3>
                             <div className="flex items-center bg-sunset-orange/10 text-sunset-orange px-2 py-1 rounded-lg ml-2">
                                <Star className="h-3 w-3 fill-current" />
                                <span className="text-xs font-bold ml-1">4.9</span>
                             </div>
                          </div>
                          
                          <div className="flex items-center text-gray-500 text-sm mb-6">
                             <MapPin className="h-4 w-4 mr-1 text-sunset-orange" />
                             <span>{trip.startLocation}</span>
                          </div>

                          <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                             <div className="flex gap-4">
                                <div className="flex items-center text-xs text-gray-500 font-medium">
                                   <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                                   <span>{trip.durationDays}D/{trip.durationNights}N</span>
                                </div>
                             </div>
                             <div className="text-right">
                                <span className="text-2xl font-black text-deep-blue">{trip.sessions?.[0]?.price || '---'} MAD</span>
                             </div>
                          </div>
                       </CardContent>
                    </Card>
                  </Link>
                ))
              )}
            </div>
          </div>
          
          {/* Map Preview (Optional) */}
          <div className="hidden lg:block w-[400px]">
             <div className="sticky top-24 h-[calc(100vh-120px)] bg-gray-200 rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 flex-col gap-4">
                   <div className="w-16 h-16 bg-white/50 rounded-full flex items-center justify-center animate-bounce">
                      <MapPin className="h-8 w-8 text-sunset-orange" />
                   </div>
                   <p className="font-bold text-sm uppercase tracking-widest">Interactive Map coming soon</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
