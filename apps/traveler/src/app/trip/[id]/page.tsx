'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { 
  MapPin, 
  Clock, 
  Users, 
  Check, 
  ChevronLeft, 
  Share2, 
  Heart,
  Calendar,
  ShieldCheck,
  TrendingUp,
  Star
} from 'lucide-react';
import { Button, Card, CardContent } from '@ouiboo/ui';
import Link from 'next/link';

export default function TripDetailsPage() {
  const { id } = useParams();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${id}`);
      return response.data;
    }
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading Adventure...</div>;
  if (!trip) return <div className="min-h-screen flex items-center justify-center">Adventure not found.</div>;

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Photo Gallery Hero */}
      <div className="max-w-7xl mx-auto px-4 pt-24">
        <div className="flex items-center justify-between mb-6">
           <Link href="/search" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-deep-blue transition-colors">
              <ChevronLeft className="h-4 w-4" />
              Back to search
           </Link>
           <div className="flex gap-4">
              <Button variant="outline" className="rounded-full h-10 w-10 p-0">
                 <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="rounded-full h-10 w-10 p-0">
                 <Heart className="h-4 w-4" />
              </Button>
           </div>
        </div>

        <div className="grid grid-cols-4 grid-rows-2 gap-4 h-[600px] rounded-3xl overflow-hidden shadow-2xl">
           <div className="col-span-2 row-span-2 relative overflow-hidden">
              <img src={trip.images?.[0] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'} className="w-full h-full object-cover" alt="" />
           </div>
           <div className="col-span-1 row-span-1 relative overflow-hidden">
              <img src={trip.images?.[1] || 'https://images.unsplash.com/photo-1548013146-72479768bbaa'} className="w-full h-full object-cover" alt="" />
           </div>
           <div className="col-span-1 row-span-1 relative overflow-hidden bg-gray-100 flex items-center justify-center">
               <img src={trip.images?.[2] || 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3'} className="w-full h-full object-cover" alt="" />
           </div>
           <div className="col-span-2 row-span-1 relative overflow-hidden">
              <img src={trip.images?.[3] || 'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6'} className="w-full h-full object-cover" alt="" />
              <Button className="absolute bottom-6 right-6 bg-white text-deep-blue hover:bg-gray-100 rounded-xl px-6 font-bold shadow-lg">
                 Show all photos
              </Button>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Side: Info */}
        <div className="lg:col-span-2 space-y-12">
           <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <span className="px-3 py-1 bg-sunset-orange/10 text-sunset-orange text-xs font-black rounded-lg uppercase">
                    {trip.category}
                 </span>
                 <span className="text-gray-400">•</span>
                 <div className="flex items-center text-sm font-bold text-gray-500">
                    <MapPin className="h-4 w-4 mr-1 text-sunset-orange" />
                    {trip.startLocation}
                 </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-deep-blue leading-tight">
                {trip.title}
              </h1>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-gray-100">
              <div className="space-y-1">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Duration</p>
                 <p className="font-black text-deep-blue flex items-center gap-2">
                    <Clock className="h-5 w-5 text-sunset-orange" />
                    {trip.durationDays}D/{trip.durationNights}N
                 </p>
              </div>
              <div className="space-y-1">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Group Size</p>
                 <p className="font-black text-deep-blue flex items-center gap-2">
                    <Users className="h-5 w-5 text-sunset-orange" />
                    Max 15
                 </p>
              </div>
              <div className="space-y-1">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Guide</p>
                 <p className="font-black text-deep-blue flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-sunset-orange" />
                    Certified
                 </p>
              </div>
              <div className="space-y-1">
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Difficulty</p>
                 <p className="font-black text-deep-blue flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-sunset-orange" />
                    Moderate
                 </p>
              </div>
           </div>

           <div className="space-y-6">
              <h2 className="text-2xl font-black text-deep-blue">The Experience</h2>
              <div className="text-gray-600 leading-relaxed text-lg prose max-w-none">
                 {trip.description}
              </div>
           </div>

           <div className="space-y-6">
              <h2 className="text-2xl font-black text-deep-blue">What's Included</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {trip.inclusions?.map((item: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-4 bg-green-50/50 rounded-2xl border border-green-100">
                       <Check className="h-5 w-5 text-green-600 bg-green-100 p-1 rounded-full" />
                       <span className="font-medium text-green-900">{item}</span>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Right Side: Booking Card */}
        <div className="relative">
           <Card className="sticky top-24 border-none shadow-2xl shadow-deep-blue/10 rounded-3xl overflow-hidden p-8 space-y-8 bg-white border border-gray-50">
              <div className="flex items-end justify-between">
                 <div>
                    <span className="text-sm font-bold text-gray-400 uppercase">Per person</span>
                    <h3 className="text-4xl font-black text-deep-blue">
                      {trip.sessions?.[0]?.price || '---'} MAD
                    </h3>
                 </div>
                 <div className="flex items-center text-sunset-orange mb-1">
                    <Star className="h-5 w-5 fill-current" />
                    <span className="text-lg font-black ml-1">4.9</span>
                 </div>
              </div>

              <div className="space-y-4">
                 <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">Select your dates</p>
                 <div className="space-y-3">
                    {trip.sessions?.map((session: any) => (
                       <div 
                        key={session.id}
                        onClick={() => setSelectedSession(session.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${
                          selectedSession === session.id 
                            ? "border-sunset-orange bg-orange-50/30" 
                            : "border-gray-100 hover:border-gray-200"
                        }`}
                       >
                          <div className="flex items-center gap-3">
                             <Calendar className="h-5 w-5 text-gray-400" />
                             <span className="font-bold text-deep-blue">
                                {new Date(session.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                             </span>
                          </div>
                          <span className="text-xs font-bold text-gray-500 uppercase">{session.availableSeats} LEFT</span>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="pt-4 space-y-4">
                 <Link href={`/booking/${id}?session=${selectedSession}`} className="w-full">
                    <Button 
                      disabled={!selectedSession}
                      className="w-full h-16 bg-sunset-orange hover:bg-orange-600 border-none rounded-2xl text-xl font-black shadow-xl shadow-orange-900/20 transition-all active:scale-95"
                    >
                      Book Now
                    </Button>
                 </Link>
                 <p className="text-center text-xs text-gray-400 font-medium">You won't be charged yet</p>
              </div>

              <div className="pt-8 border-t border-gray-50 space-y-4">
                 <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 underline">Price per person</span>
                    <span className="font-bold text-deep-blue">{trip.sessions?.[0]?.price} MAD</span>
                 </div>
                 <div className="flex items-center justify-between text-lg pt-2 border-t border-gray-50">
                    <span className="font-black text-deep-blue">Total</span>
                    <span className="font-black text-deep-blue">{trip.sessions?.[0]?.price} MAD</span>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
