'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Star,
  Info,
  ArrowRight,
  X,
  ClipboardList
} from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@ouiboo/ui';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { useAuth } from '@/components/AuthContext';

export default function TripDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, setShowLoginModal } = useAuth();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${id}`);
      return response.data;
    }
  });

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-background">
      <div className="w-16 h-16 border-4 border-sunset-orange border-t-transparent rounded-full animate-spin" />
      <p className="text-xl font-bold text-foreground animate-pulse font-display">Preparing your adventure...</p>
    </div>
  );
  
  if (!trip) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-6 bg-background">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-4xl">🏜️</div>
        <h1 className="text-3xl font-black text-foreground font-display">Adventure not found</h1>
        <Button onClick={() => router.push('/')} className="bg-sunset-orange hover:bg-orange-600 px-8 py-6 rounded-2xl font-bold">
            Explore other trips
        </Button>
    </div>
  );

  const openSessions = trip.sessions?.filter((s: any) => s.status === 'OPEN' && new Date(s.startDate) > new Date()) || [];
  const minPrice = openSessions.length > 0 ? Math.min(...openSessions.map((s: any) => s.price)) : '---';

  return (
    <div className="min-h-screen bg-background pb-32 font-sans text-foreground overflow-hidden relative">
      {/* Background Blobs */}
      <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 opacity-20 dark:opacity-10 pointer-events-none">
          <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-sunset-orange sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 top-[40rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[40rem] opacity-20 dark:opacity-10 pointer-events-none">
          <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative right-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] translate-x-1/2 rotate-[120deg] bg-blue-400 sm:right-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-32">
        <Link href="/search" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all mb-8 group bg-card/50 backdrop-blur-sm px-5 py-2.5 rounded-xl border border-border/50 hover:bg-card shadow-sm">
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Catalog
        </Link>

        {/* Dynamic Photo Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 h-auto lg:h-[600px] mb-12">
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="lg:col-span-7 relative h-[400px] lg:h-full rounded-[2rem] overflow-hidden shadow-2xl shadow-black/5 dark:shadow-black/20 group border border-border/50"
            >
                <img 
                    src={trip.images?.[activeImage] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    alt={trip.title} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-6 left-6 flex gap-2">
                    {trip.images?.map((_: any, idx: number) => (
                        <button 
                            key={idx}
                            onClick={() => setActiveImage(idx)}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300 backdrop-blur-md",
                                activeImage === idx ? "bg-white w-8" : "bg-white/40 hover:bg-white/80 w-4"
                            )}
                        />
                    ))}
                </div>
            </motion.div>
            
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-5 grid grid-cols-2 grid-rows-2 gap-4 md:gap-6"
            >
                {trip.images?.slice(1, 4).map((img: string, idx: number) => (
                    <div key={idx} className="relative rounded-[1.5rem] overflow-hidden shadow-lg border border-border/50 group cursor-pointer" onClick={() => setActiveImage(idx + 1)}>
                        <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                ))}
                {/* View All / Fallback */}
                <div className="bg-muted/50 rounded-[1.5rem] flex items-center justify-center cursor-pointer hover:bg-muted transition-colors border border-border">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-foreground font-bold shadow-sm">
                            +{trip.images?.length > 4 ? trip.images.length - 4 : 0}
                        </div>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">View Gallery</span>
                    </div>
                </div>
            </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16 relative">
          {/* Left Side: Information */}
          <div className="lg:col-span-2 space-y-12">
             <div className="space-y-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <Badge className="bg-sunset-orange/10 text-sunset-orange border-sunset-orange/20 px-3 py-1 rounded-full font-bold uppercase text-[10px] tracking-wider">
                            {t(`categories.${trip.category.toLowerCase()}`)}
                        </Badge>
                        <span className="text-border mx-1">|</span>
                        <div className="flex items-center text-sm font-semibold text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-1.5 text-sunset-orange" />
                            {trip.startLocation}
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-foreground leading-[1.1] font-display tracking-tight mb-6">
                        {trip.title}
                    </h1>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1.5 bg-yellow-400/10 px-3 py-1.5 rounded-full border border-yellow-400/20">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-bold text-sm text-yellow-600 dark:text-yellow-400">5.0</span>
                            <span className="text-xs text-yellow-600/70 dark:text-yellow-400/70 font-medium">(128 reviews)</span>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Duration', value: `${trip.durationDays}D / ${trip.durationNights}N`, icon: Clock },
                        { label: 'Group Size', value: '6 - 15', icon: Users },
                        { label: 'Level', value: 'Moderate', icon: TrendingUp },
                        { label: 'Verified', value: 'Certified', icon: ShieldCheck },
                    ].map((stat, i) => (
                        <div key={i} className="p-5 bg-card rounded-2xl border border-border shadow-sm flex flex-col gap-3">
                            <stat.icon className="h-5 w-5 text-sunset-orange" />
                            <div>
                                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{stat.label}</p>
                                <p className="text-base font-bold text-foreground mt-0.5">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
             </div>

             <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground font-display">The Experience</h2>
                <div className="text-muted-foreground leading-relaxed text-lg font-medium whitespace-pre-wrap">
                    {trip.description}
                </div>
             </div>

             {trip.itinerary && trip.itinerary.length > 0 ? (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground font-display">Daily Plan</h2>
                    <Badge variant="outline" className="text-[10px] font-bold px-3 py-1 bg-muted/30">
                        {trip.itinerary.length} Days
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {trip.itinerary.map((day: any, idx: number) => (
                      <div key={idx} className="relative pl-12 pb-10 last:pb-0 group">
                        {/* Timeline Connector */}
                        <div className="absolute left-4 top-2 bottom-0 w-0.5 bg-border/60 group-last:hidden" />
                        
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-card border-2 border-sunset-orange text-sunset-orange flex items-center justify-center font-bold text-xs z-10 shadow-sm transition-all group-hover:scale-110 group-hover:bg-sunset-orange group-hover:text-white">
                          {day.dayNumber}
                        </div>
                        
                        <div className="space-y-3 pt-0.5">
                          <div className="flex items-center gap-2">
                             {day.title ? (
                               <h3 className="text-xl font-bold text-foreground leading-tight font-display">{day.title}</h3>
                             ) : (
                               <h3 className="text-xl font-bold text-foreground leading-tight font-display">Day {day.dayNumber}</h3>
                             )}
                          </div>
                          
                          <p className="text-muted-foreground leading-relaxed font-medium whitespace-pre-wrap text-base">
                            {day.description || "The agency has not provided a description for this day."}
                          </p>
                          
                          {day.activities && day.activities.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {day.activities.map((act: string, aIdx: number) => (
                                <Badge key={aIdx} variant="outline" className="text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                                  {act}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
             ) : (
                <div className="p-8 rounded-[2rem] bg-muted/30 border border-dashed border-border flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">ℹ️</div>
                    <div>
                        <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Itinerary coming soon</h3>
                        <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">The agency is finalizing the daily details for this experience.</p>
                    </div>
                </div>
             )}

             <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground font-display">What's Included</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {trip.inclusions?.map((item: string, idx: number) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 p-4 bg-emerald-50/30 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10"
                      >
                         <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                             <Check className="h-4 w-4 text-emerald-500" />
                          </div>
                         <span className="font-semibold text-foreground text-sm">{item}</span>
                      </motion.div>
                   ))}
                </div>
             </div>

             {trip.exclusions && trip.exclusions.length > 0 && (
               <div className="space-y-6 pt-6">
                  <h2 className="text-2xl font-bold text-foreground font-display">What's Excluded</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {trip.exclusions.map((item: string, idx: number) => (
                        <motion.div 
                          key={idx} 
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-3 p-4 bg-red-50/30 dark:bg-red-500/5 rounded-2xl border border-red-100/50 dark:border-red-500/10"
                        >
                           <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                               <X className="h-4 w-4 text-red-500" />
                            </div>
                           <span className="font-semibold text-foreground text-sm">{item}</span>
                        </motion.div>
                     ))}
                  </div>
               </div>
             )}

             {trip.checklist && trip.checklist.length > 0 && (
               <div className="space-y-6 pt-6">
                  <h2 className="text-2xl font-bold text-foreground font-display">Traveler Checklist</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {trip.checklist.map((item: string, idx: number) => (
                        <motion.div 
                          key={idx} 
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-3 p-4 bg-amber-50/30 dark:bg-amber-500/5 rounded-2xl border border-amber-100/50 dark:border-amber-500/10"
                        >
                           <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                               <ClipboardList className="h-4 w-4 text-amber-500" />
                            </div>
                           <span className="font-semibold text-foreground text-sm">{item}</span>
                        </motion.div>
                     ))}
                  </div>
               </div>
             )}
          </div>

          {/* Right Side: Booking Card */}
          <div className="relative h-full">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sticky top-32"
            >
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden">
                    
                    {/* Price Header */}
                    <div className="space-y-1 text-center pb-6 border-b border-gray-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('featured.from')}</span>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-black text-foreground font-display">{minPrice}</span>
                            <span className="text-sm font-bold text-muted-foreground">MAD</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Select Date</label>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                           {openSessions.length > 0 ? (
                                openSessions.map((session: any) => (
                                <div 
                                    key={session.id}
                                    onClick={() => setSelectedSession(session.id)}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all cursor-pointer group space-y-3",
                                        selectedSession === session.id 
                                            ? "border-sunset-orange bg-sunset-orange/5" 
                                            : "border-border hover:border-sunset-orange/50 hover:bg-muted"
                                    )}
                                >
                                    <div className="flex justify-between items-center">
                                      <div className="flex flex-col">
                                          <span className="font-bold text-foreground text-sm">
                                              {new Date(session.startDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })} - {new Date(session.endDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })}
                                          </span>
                                          <span className={cn("text-[10px] font-bold mt-1", session.availableSeats < 5 ? "text-amber-500" : "text-emerald-500")}>
                                              {session.availableSeats} spots left
                                          </span>
                                      </div>
                                      <div className="w-5 h-5 rounded-full border-2 border-gray-200 dark:border-slate-600 flex items-center justify-center group-hover:border-sunset-orange">
                                          {selectedSession === session.id && <div className="w-2.5 h-2.5 rounded-full bg-sunset-orange" />}
                                      </div>
                                    </div>
                                    
                                    {selectedSession === session.id && session.deposit > 0 && (
                                      <div className="pt-3 border-t border-sunset-orange/20 flex flex-col gap-1.5">
                                        <div className="flex justify-between text-[11px] font-bold">
                                          <span className="text-muted-foreground uppercase tracking-tighter">Total Price</span>
                                          <span className="text-foreground">{session.price} MAD</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] font-bold">
                                          <span className="text-sunset-orange uppercase tracking-tighter">Due Now (Avance)</span>
                                          <span className="text-sunset-orange">{session.deposit} MAD</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] font-bold">
                                          <span className="text-muted-foreground uppercase tracking-tighter">Remaining (Reliquat)</span>
                                          <span className="text-foreground">{session.price - session.deposit} MAD</span>
                                        </div>
                                      </div>
                                    )}
                                </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm font-medium">
                                    No available dates currently.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button 
                            disabled={!selectedSession}
                            onClick={() => {
                                if (!user) {
                                    setShowLoginModal(true);
                                } else {
                                    router.push(`/booking/${id}?session=${selectedSession}`);
                                }
                            }}
                            className="w-full h-14 rounded-xl text-lg font-bold bg-deep-blue dark:bg-sunset-orange hover:bg-blue-900 dark:hover:bg-orange-600 text-white shadow-lg shadow-blue-900/20 dark:shadow-orange-900/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            Book Now
                        </Button>
                        <p className="text-center text-xs text-muted-foreground mt-4 font-medium flex items-center justify-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Secure Payment & Verified Agency
                        </p>
                    </div>
                </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
