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
  ArrowRight
} from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@ouiboo/ui';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';

export default function TripDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
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
      <p className="text-xl font-black text-foreground animate-pulse font-display">Preparing your adventure...</p>
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
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-7xl mx-auto px-6 pt-32">
        <Link href="/search" className="inline-flex items-center gap-3 text-[10px] font-black text-muted-foreground hover:text-sunset-orange dark:hover:text-sunset-orange uppercase tracking-[0.2em] transition-all mb-10 group bg-muted/30 px-6 py-3 rounded-2xl hover:bg-muted">
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Catalog
        </Link>

        {/* Dynamic Photo Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[600px] mb-12">
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-7 relative h-[400px] lg:h-full rounded-[2.5rem] overflow-hidden shadow-2xl group"
            >
                <img 
                    src={trip.images?.[activeImage] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    alt={trip.title} 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-8 left-8 flex gap-3">
                    {trip.images?.map((_: any, idx: number) => (
                        <button 
                            key={idx}
                            onClick={() => setActiveImage(idx)}
                            className={cn(
                                "w-3 h-3 rounded-full transition-all duration-300 shadow-sm",
                                activeImage === idx ? "bg-sunset-orange w-10" : "bg-white/50 hover:bg-white"
                            )}
                        />
                    ))}
                </div>
            </motion.div>
            
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-5 grid grid-cols-2 grid-rows-2 gap-6"
            >
                {trip.images?.slice(1, 4).map((img: string, idx: number) => (
                    <div key={idx} className="relative rounded-[2rem] overflow-hidden shadow-xl group cursor-pointer" onClick={() => setActiveImage(idx + 1)}>
                        <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                    </div>
                ))}
                {/* Fallback tiles if images are missing */}
                {(4 - (trip.images?.length || 0)) > 0 && Array.from({ length: Math.max(0, 5 - (trip.images?.length || 0)) }).map((_, i) => (
                    <div key={`fill-${i}`} className="bg-muted rounded-[2rem] flex items-center justify-center animate-pulse">
                        <Star className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                ))}
            </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 relative">
          {/* Left Side: Information */}
          <div className="lg:col-span-2 space-y-16">
             <div className="space-y-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="flex items-center gap-3 mb-4">
                        <Badge className="bg-sunset-orange text-white border-none px-4 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-orange-900/10">
                            {t(`categories.${trip.category.toLowerCase()}`)}
                        </Badge>
                        <div className="h-1 w-1 bg-muted-foreground/30 rounded-full" />
                        <div className="flex items-center text-sm font-black text-muted-foreground uppercase tracking-wider">
                            <MapPin className="h-3.5 w-3.5 mr-2 text-sunset-orange" />
                            {trip.startLocation}
                        </div>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-foreground leading-[1.05] font-display tracking-tight mb-8">
                        {trip.title}
                    </h1>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-5 w-5 fill-sunset-orange text-sunset-orange" />)}
                            <span className="font-black text-lg ml-2 text-foreground">5.0</span>
                            <span className="text-muted-foreground ml-1">(128 reviews)</span>
                        </div>
                        <div className="h-6 w-px bg-border" />
                        <div className="flex -space-x-3">
                            {[1,2,3].map(i => <img key={i} className="h-8 w-8 rounded-full ring-2 ring-background" src={`https://i.pravatar.cc/100?img=${i+20}`} alt="" />)}
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-black ring-2 ring-background">+42</div>
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-10 bg-muted/30 dark:bg-slate-900/50 rounded-[3rem] border border-border/50">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Duration</p>
                        <div className="flex items-center gap-3">
                            <Clock className="h-6 w-6 text-sunset-orange" />
                            <span className="text-lg font-black font-display">{trip.durationDays}D / {trip.durationNights}N</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Group Size</p>
                        <div className="flex items-center gap-3">
                            <Users className="h-6 w-6 text-sunset-orange" />
                            <span className="text-lg font-black font-display">6 - 15</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Level</p>
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-6 w-6 text-sunset-orange" />
                            <span className="text-lg font-black font-display">Moderate</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Certification</p>
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-6 w-6 text-sunset-orange" />
                            <span className="text-lg font-black font-display">Verified</span>
                        </div>
                    </div>
                </div>
             </div>

             <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-2 bg-sunset-orange rounded-full" />
                    <h2 className="text-3xl font-black text-foreground font-display">The Experience</h2>
                </div>
                <div className="text-muted-foreground leading-relaxed text-xl font-medium max-w-3xl whitespace-pre-wrap">
                    {trip.description}
                </div>
             </div>

             <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-2 bg-ocean rounded-full" />
                    <h2 className="text-3xl font-black text-foreground font-display">What's Included</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {trip.inclusions?.map((item: string, idx: number) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-4 p-6 bg-background rounded-[2rem] border border-border ring-1 ring-border/5 group hover:border-ocean transition-all"
                      >
                         <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                             <Check className="h-5 w-5 text-emerald-500 group-hover:text-white" />
                         </div>
                         <span className="font-bold text-lg text-foreground/80">{item}</span>
                      </motion.div>
                   ))}
                </div>
             </div>

             {/* Itinerary Section (Mock for UI) */}
             <div className="space-y-8">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-2 bg-purple-500 rounded-full" />
                    <h2 className="text-3xl font-black text-foreground font-display">Daily Schedule</h2>
                </div>
                <div className="space-y-10 pl-4 border-l-2 border-dashed border-border ml-2">
                    {[1, 2, 3].map(day => (
                        <div key={day} className="relative">
                            <div className="absolute -left-[1.35rem] top-0 h-6 w-6 rounded-full bg-background border-4 border-purple-500 z-10" />
                            <div className="pl-8">
                                <h4 className="text-xl font-black mb-2 flex items-center gap-3">
                                    Day {day}: <span className="text-muted-foreground font-bold">Exploration Phase</span>
                                </h4>
                                <p className="text-muted-foreground font-medium">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          </div>

          {/* Right Side: Booking Card */}
          <div className="relative h-full">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="sticky top-32"
            >
                <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] dark:shadow-none dark:ring-1 dark:ring-border rounded-[3.5rem] overflow-hidden p-12 space-y-10 bg-card ring-1 ring-border/50">
                    <div className="flex items-end justify-between gap-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] block">{t('featured.from')}</span>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-6xl font-black text-foreground font-display tracking-tight leading-none">
                                    {minPrice} 
                                </h3>
                                <span className="text-xl font-bold text-muted-foreground uppercase">MAD</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-5 py-3 bg-sunset-orange/10 rounded-[1.5rem] border border-sunset-orange/20">
                            <Star className="h-6 w-6 fill-sunset-orange text-sunset-orange" />
                            <span className="text-2xl font-black text-sunset-orange font-display">4.9</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <p className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Select Session</p>
                            <Info className="h-4 w-4 text-muted-foreground hover:text-sunset-orange transition-colors cursor-help" />
                        </div>
                        
                        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-3 custom-scrollbar">
                            {openSessions.length > 0 ? (
                                openSessions.map((session: any) => (
                                <motion.div 
                                    key={session.id}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setSelectedSession(session.id)}
                                    className={cn(
                                        "p-8 rounded-[2.5rem] border-2 transition-all cursor-pointer group relative overflow-hidden",
                                        selectedSession === session.id 
                                            ? "border-sunset-orange bg-sunset-orange/5 shadow-inner" 
                                            : "border-border/50 hover:border-sunset-orange/30 hover:bg-muted/30"
                                    )}
                                >
                                    <div className="flex justify-between items-center relative z-10">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-xl transition-colors", selectedSession === session.id ? "bg-sunset-orange text-white" : "bg-muted text-muted-foreground group-hover:bg-sunset-orange/20 group-hover:text-sunset-orange")}>
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <span className="font-black text-foreground text-xl font-display tracking-tight">
                                                    {new Date(session.startDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })} - 
                                                    {new Date(session.endDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 pl-1">
                                                <Badge className={cn("px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-widest border-none", session.availableSeats < 5 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600")}>
                                                    <Users className="h-3 w-3 mr-2 inline" /> {session.availableSeats} spots left
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-foreground font-display group-hover:text-sunset-orange transition-colors leading-none block">{session.price}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MAD</span>
                                        </div>
                                    </div>
                                </motion.div>
                                ))
                            ) : (
                                <div className="py-20 text-center bg-muted/20 rounded-[3rem] border-2 border-dashed border-border flex flex-col items-center gap-6">
                                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center text-4xl">🏜️</div>
                                    <div className="space-y-2">
                                        <p className="font-black text-foreground font-display text-xl">No upcoming sessions</p>
                                        <p className="text-sm text-muted-foreground px-8 font-medium">Contact agency for custom dates or upcoming schedule</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 space-y-8">
                        <Link href={`/booking/${id}?session=${selectedSession}`} className="block">
                            <Button 
                                disabled={!selectedSession}
                                className="w-full h-24 rounded-[2.5rem] text-2xl font-black bg-sunset-orange hover:bg-orange-600 text-white hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-orange-900/30 flex items-center justify-center gap-6 group disabled:opacity-50 disabled:scale-100 disabled:hover:scale-100 border-none px-12"
                            >
                                Book Adventure <ArrowRight className="h-8 w-8 group-hover:translate-x-3 transition-transform" />
                            </Button>
                        </Link>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-6 bg-muted/40 dark:bg-slate-900/40 rounded-[2rem] border border-border/50">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Policy</span>
                                <span className="text-sm font-black text-sunset-orange uppercase tracking-widest">Flexible Cancellation</span>
                            </div>
                            <div className="flex items-center justify-center gap-8 py-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Verified Agency</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Secure Payment</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <div className="flex items-center gap-6 p-8 rounded-[2.5rem] bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 shadow-sm relative overflow-hidden group">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700" />
                            <div className="h-16 w-16 rounded-[1.25rem] bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 shrink-0">
                                <ShieldCheck className="h-8 w-8" />
                            </div>
                            <div className="relative z-10">
                                <h5 className="text-lg font-black text-foreground font-display tracking-tight leading-tight">Ouiboo Protection</h5>
                                <p className="text-sm text-muted-foreground font-medium mt-1">100% money back if agency cancels the trip.</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
