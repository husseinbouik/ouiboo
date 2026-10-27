'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  MapPin,
  Clock,
  Users,
  Check,
  ChevronLeft,
  Banknote,
  Star,
  X,
  ClipboardList
} from 'lucide-react';
import { Button, Badge, TripDetailSkeleton, ShareTripButton, SafeImage } from '@ouiboo/ui';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { useAuth } from '@/components/AuthContext';
import { ReviewList } from '@/components/ReviewList';
import SellerIdentity from '@/components/SellerIdentity';
import { TRAVELER_URL } from '@/lib/site';
import { SessionStatus, type CancellationScaleSnapshot, type SessionStatusType } from '@ouiboo/types';
import { formatCurrency } from '@ouiboo/utils';
import { CancellationScaleCard } from '@/components/CancellationScaleCard';

type TripDay = {
  dayNumber: number;
  title?: string;
  description?: string;
  activities?: string[];
};

type TripSession = {
  id: string;
  startDate: string;
  endDate: string;
  price: number | string;
  deposit: number | string;
  currency: string;
  availableSeats: number;
  status: SessionStatusType;
  /** #369: staged-payment configuration (minimum-group trips). */
  minBookings?: number;
  confirmationDeadline?: string | null;
  groupStatus?: string;
};

/** #369: a session is staged when it needs a minimum group and a deposit. */
const isStagedSession = (session: TripSession) =>
  (session.minBookings ?? 1) > 1 && Number(session.deposit ?? 0) > 0;

type TripDetails = {
  id: string;
  title: string;
  category?: string;
  startLocation: string;
  durationDays: number;
  durationNights: number;
  description: string;
  images?: string[];
  /** #332: agency-provided alt text per image (index-aligned); may be absent. */
  imageAlts?: string[];
  /** #371: seller of record (legal name + verified licence) from GET /trips/:id. */
  agency?: {
    id?: string;
    companyName?: string | null;
    legalName?: string | null;
    travelLicenceNumber?: string | null;
    travelLicenceStatus?: string | null;
    licenceExpiry?: string | null;
    /** #413 (Council B10): what+when verification statement dates. */
    licenceVerifiedAt?: string | null;
    insuranceStatus?: string | null;
    insuranceVerifiedAt?: string | null;
  } | null;
  sessions?: TripSession[];
  itinerary?: TripDay[];
  /** #417: the resolved cancellation scale from GET /trips/:id (bands + floor). */
  cancellationScale?: CancellationScaleSnapshot | null;
  inclusions?: string[];
  exclusions?: string[];
  checklist?: string[];
};

type ReviewStats = {
  averageRating?: number;
  totalReviews: number;
  distribution?: Record<number, number>;
};

export default function TripDetailsClient({
  tripId,
  initialTrip,
  initialReviewStats,
}: {
  tripId: string;
  initialTrip: TripDetails | null;
  initialReviewStats: ReviewStats | null;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, setShowLoginModal } = useAuth();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeHandledRef = useRef(false);

  const { data: trip, isLoading, isError, refetch } = useQuery<TripDetails | null>({
    queryKey: ['trip', tripId],
    enabled: !!tripId,
    initialData: initialTrip ?? undefined,
    queryFn: async () => {
      // #546: trip text in the current UI language (the ISR server
      // payload is the canonical French; this refetch localizes it).
      const response = await apiClient.get(`/trips/${tripId}?locale=${i18n.language}`);
      return response.data;
    }
  });

  const { data: reviewStats } = useQuery<ReviewStats | null>({
    queryKey: ['trip-reviews-stats', tripId],
    enabled: !!tripId,
    initialData: initialReviewStats ?? undefined,
    queryFn: async () => {
      const response = await apiClient.get(`/trips/${tripId}/reviews/stats`);
      return response.data;
    }
  });

  if (isLoading) return (
    <div className="min-h-screen bg-background pb-32" role="status" aria-label="Preparing your adventure...">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32">
        <TripDetailSkeleton />
      </div>
      <span className="sr-only">Preparing your adventure...</span>
    </div>
  );

  if (isError) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-5 bg-background px-6 text-center">
      <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center">
        <X className="h-8 w-8 text-danger" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-foreground font-display">We could not load this trip</h1>
        <p className="text-muted-foreground">Check your connection and try again.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => void refetch()}>Try again</Button>
        <Button type="button" variant="outline" onClick={() => router.push('/search')}>Browse other trips</Button>
      </div>
    </div>
  );
  
  if (!trip) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-6 bg-background">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
          <MapPin className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-black text-foreground font-display">Adventure not found</h1>
        <Button onClick={() => router.push('/')} className="bg-sunset-orange hover:bg-orange-600 px-8 py-6 rounded-2xl font-bold">
            Explore other trips
        </Button>
    </div>
  );

  const openSessions = trip.sessions?.filter(
    (session) => session.status === SessionStatus.Open && new Date(session.startDate) > new Date(),
  ) || [];
  const lowestPricedSession = openSessions.reduce<TripSession | null>((lowest, session) => {
    if (!Number.isFinite(Number(session.price))) return lowest;
    return !lowest || Number(session.price) < Number(lowest.price) ? session : lowest;
  }, null);
  const minPriceLabel = lowestPricedSession
    ? formatCurrency(lowestPricedSession.price, lowestPricedSession.currency, i18n.language)
    : 'On request';

  // #417: refund amounts on the cancellation scale are computed on the
  // selected session's price, falling back to the lowest open price.
  const selectedSessionData = openSessions.find((session) => session.id === selectedSession) ?? null;
  const scaleBaseSession = selectedSessionData ?? lowestPricedSession;

  // Gallery tiles/thumbnails never include the photo currently shown in the
  // main viewer, so the same photo is never on screen twice. Indices are the
  // original positions in trip.images so clicks/dots keep their meaning.
  const galleryTiles = (trip.images ?? [])
    .map((src, index) => ({ src, index }))
    .filter(({ index }) => index !== activeImage);
  const desktopTiles = galleryTiles.slice(0, 3);
  const hiddenTileCount = galleryTiles.length - desktopTiles.length;
  const firstHiddenTileIndex = hiddenTileCount > 0 ? galleryTiles[desktopTiles.length].index : -1;
  // Session #3 P0-3 (#551): the desktop rail is a fixed 2-column grid.
  // With an odd number of cells the last cell must span both columns —
  // otherwise a lone tile (the common 2-image trip) renders as a narrow
  // full-height strip beside an empty pale column.
  const railCellCount = desktopTiles.length + (hiddenTileCount > 0 ? 1 : 0);
  const spanLastRailCell = railCellCount % 2 === 1;

  // Touch swipe support for the main gallery image (mobile): a horizontal
  // swipe changes the photo, while vertical gestures still scroll the page.
  // The container uses `touch-pan-y`, so the browser natively handles
  // vertical panning and only horizontal-dominant gestures reach these
  // handlers. Mirrors the TripCard carousel pattern (PR #306).
  const SWIPE_THRESHOLD_PX = 40;
  const imageCount = trip.images?.length ?? 0;

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeHandledRef.current = false;
    if (imageCount <= 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (imageCount <= 1 || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
    swipeHandledRef.current = true;
    window.setTimeout(() => {
      swipeHandledRef.current = false;
    }, 400);
    // In RTL the gallery is mirrored, so the swipe direction that advances
    // to the next image flips with it (same convention as TripCard).
    const advancesNext = i18n.dir() === 'rtl' ? dx > 0 : dx < 0;
    setActiveImage((prev) => advancesNext
      ? (prev + 1) % imageCount
      : (prev - 1 + imageCount) % imageCount);
  };

  // A real swipe is followed by a synthetic click on the touched element;
  // swallow it so a swipe ending on a dot never also jumps via that dot.
  // Plain taps are unaffected because the flag is only set after a swipe.
  const handleClickCapture = (e: React.MouseEvent) => {
    if (swipeHandledRef.current) {
      e.preventDefault();
      e.stopPropagation();
      swipeHandledRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32 font-sans text-foreground overflow-hidden relative">
      {/* Background Blobs */}
      <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 opacity-20 dark:opacity-10 pointer-events-none">
          <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-sunset-orange sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 top-[40rem] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[40rem] opacity-20 dark:opacity-10 pointer-events-none">
          <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative right-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] translate-x-1/2 rotate-[120deg] bg-blue-400 sm:right-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32">
        <Link href="/search" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all mb-5 sm:mb-8 group bg-card/50 backdrop-blur-sm px-4 sm:px-5 py-2.5 rounded-xl border border-border/50 hover:bg-card shadow-sm">
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Catalog
        </Link>

        {/* Dynamic Photo Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 h-auto lg:h-[600px] mb-8 sm:mb-12">
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "relative h-[280px] sm:h-[400px] lg:h-full rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden shadow-2xl shadow-black/5 dark:shadow-black/20 group border border-border/50 touch-pan-y",
                  (trip.images?.length ?? 0) > 1 ? "lg:col-span-7" : "lg:col-span-12",
                )}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onClickCapture={handleClickCapture}
            >
                <SafeImage
                    src={trip.images?.[activeImage] || 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={trip.imageAlts?.[activeImage]?.trim() || trip.title}
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-6 left-6 flex gap-2">
                    {trip.images?.map((_, idx: number) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImage(idx)}
                            aria-label={`View image ${idx + 1}`}
                            aria-current={activeImage === idx || undefined}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300 backdrop-blur-md",
                                activeImage === idx ? "bg-white w-8" : "bg-white/40 hover:bg-white/80 w-4"
                            )}
                        />
                    ))}
                </div>
            </motion.div>
            
            {(trip.images?.length ?? 0) > 1 ? (
              <div className="flex lg:hidden gap-3 overflow-x-auto pb-1" aria-label="Trip photos">
                  {galleryTiles.map(({ src, index }) => (
                      <button key={index} type="button" className="relative h-20 w-28 shrink-0 rounded-2xl overflow-hidden shadow-md border border-border/50" onClick={() => setActiveImage(index)} aria-label={`View image ${index + 1}`}>
                          <SafeImage src={src} className="w-full h-full object-cover" alt={trip.imageAlts?.[index]?.trim() || `${trip.title} - image ${index + 1}`} fill sizes="112px" />
                      </button>
                  ))}
              </div>
            ) : null}

            {(trip.images?.length ?? 0) > 1 ? (
              <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="hidden lg:grid lg:col-span-5 grid-cols-2 auto-rows-fr gap-4 md:gap-6"
              >
                  {desktopTiles.map(({ src, index }, tilePos) => (
                      <button key={index} type="button" className={cn("relative min-h-36 rounded-[1.5rem] overflow-hidden shadow-lg border border-border/50 group", spanLastRailCell && hiddenTileCount === 0 && tilePos === desktopTiles.length - 1 && "lg:col-span-2")} onClick={() => setActiveImage(index)} aria-label={`View image ${index + 1}`}>
                          <SafeImage src={src} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={trip.imageAlts?.[index]?.trim() || `${trip.title} - image ${index + 1}`} fill sizes="20vw" />
                          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </button>
                  ))}
                  {hiddenTileCount > 0 ? (
                    <button type="button" onClick={() => setActiveImage(firstHiddenTileIndex)} className={cn("bg-muted/50 rounded-[1.5rem] flex items-center justify-center hover:bg-muted transition-colors border border-border", spanLastRailCell && "lg:col-span-2")} aria-label={`View ${hiddenTileCount} more images`}>
                        <span className="flex flex-col items-center gap-2">
                            <span className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-foreground font-bold shadow-sm">
                                +{hiddenTileCount}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{t('tripDetails.morePhotos')}</span>
                        </span>
                    </button>
                  ) : null}
              </motion.div>
            ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16 relative">
          {/* Left Side: Information */}
          <div className="lg:col-span-2 space-y-12">
             <div className="space-y-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <Badge className="bg-sunset-orange/10 text-sunset-orange-dark border-sunset-orange/20 px-3 py-1 rounded-full font-bold uppercase text-[10px] tracking-wider">
                            {trip.category ? t(`categories.${trip.category.toLowerCase()}`) : t('categories.adventure')}
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
                    
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-1.5 bg-yellow-400/10 px-3 py-1.5 rounded-full border border-yellow-400/20">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-bold text-sm text-amber-700 dark:text-yellow-400">{reviewStats?.totalReviews ? (reviewStats.averageRating ?? 0).toFixed(1) : 'New'}</span>
                            <span className="text-xs text-amber-700 dark:text-yellow-400/70 font-medium">({reviewStats?.totalReviews || 0} reviews)</span>
                        </div>
                        {/* #468: share this trip (native sheet / intent menu).
                            allowRuntimeOriginFallback: this app serves the trip
                            pages, so its own origin is a safe share base if the
                            configured one is ever loopback in a deployed build. */}
                        <ShareTripButton tripId={trip.id} tripTitle={trip.title} travelerBaseUrl={TRAVELER_URL} allowRuntimeOriginFallback className="rounded-full" />
                    </div>

                    {/* #371: seller of record + verified travel licence */}
                    <SellerIdentity agency={trip.agency} className="mt-4" />
                </motion.div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Duration', value: `${trip.durationDays}D / ${trip.durationNights}N`, icon: Clock },
                        { label: 'Available dates', value: openSessions.length > 0 ? `${openSessions.length} open` : 'On request', icon: Users },
                        { label: t('tripDetails.payment'), value: t('tripDetails.directToAgency'), icon: Banknote },
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
                    {trip.itinerary.map((day, idx: number) => (
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
                            {day.description || 'The agency has not provided a description for this day.'}
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
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <ClipboardList className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">Flexible trip structure</h3>
                         <p className="text-xs text-muted-foreground mt-1 max-w-[320px]">
                           This experience is available for booking now. Use the description, inclusions, and session dates below to review the current trip scope.
                         </p>
                      </div>
                  </div>
               )}

             <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground font-display">What&apos;s Included</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {trip.inclusions?.map((item: string, idx: number) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 p-4 bg-success/10 rounded-2xl border border-success/20"
                      >
                         <div className="h-8 w-8 rounded-full bg-success/100/10 flex items-center justify-center shrink-0">
                             <Check className="h-4 w-4 text-emerald-500" />
                          </div>
                         <span className="font-semibold text-foreground text-sm">{item}</span>
                      </motion.div>
                   ))}
                </div>
             </div>

             {trip.exclusions && trip.exclusions.length > 0 && (
               <div className="space-y-6 pt-6">
                  <h2 className="text-2xl font-bold text-foreground font-display">What&apos;s Excluded</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {trip.exclusions.map((item: string, idx: number) => (
                        <motion.div 
                          key={idx} 
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-3 p-4 bg-danger/10 rounded-2xl border border-danger/20"
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

             {/* #417: the cancellation scale, shown before payment. */}
             <CancellationScaleCard
               scale={trip.cancellationScale}
               baseAmount={scaleBaseSession ? Number(scaleBaseSession.price) : null}
               currency={scaleBaseSession?.currency ?? trip.sessions?.[0]?.currency}
               className="pt-6"
             />

             {/* Reviews Section */}
             <div className="space-y-6 pt-6">
               <div className="flex items-center justify-between">
                 <h2 className="text-2xl font-bold text-foreground font-display">Reviews & Ratings</h2>
                 <Badge variant="outline" className="text-[10px] font-bold px-3 py-1 bg-muted/30">
                   {reviewStats?.totalReviews || 0} Reviews
                 </Badge>
               </div>
               
               {/* Rating Summary */}
               {reviewStats && reviewStats.totalReviews > 0 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Average Rating Display */}
                   <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 space-y-4">
                     <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Average Rating</p>
                     <div className="flex items-center gap-4">
                       <div className="flex flex-col">
                         <span className="text-5xl font-black text-foreground font-display">{reviewStats.totalReviews ? (reviewStats.averageRating ?? 0).toFixed(1) : '—'}</span>
                         <div className="flex gap-1 mt-2">
                           {[1, 2, 3, 4, 5].map((star) => (
                             <Star
                               key={star}
                               className={`h-5 w-5 ${
                                 star <= Math.round(reviewStats.averageRating || 0)
                                   ? 'fill-sunset-orange text-sunset-orange'
                                   : 'text-muted-foreground/40'
                               }`}
                             />
                           ))}
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Rating Distribution */}
                   <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 space-y-4">
                     <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Distribution</p>
                     <div className="space-y-2">
                       {[5, 4, 3, 2, 1].map((rating) => {
                         const count = reviewStats.distribution?.[rating] || 0;
                         const percentage = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews * 100) : 0;
                         return (
                           <div key={rating} className="flex items-center gap-2">
                             <span className="text-xs font-bold text-muted-foreground w-6">{rating}?</span>
                             <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                               <div
                                 className="h-full bg-gradient-to-r from-sunset-orange to-orange-600"
                                 style={{ width: `${percentage}%` }}
                               />
                             </div>
                             <span className="text-xs font-medium text-muted-foreground w-8 text-right">{count}</span>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 </div>
               )}
               
                {/* Reviews List */}
               {tripId ? <ReviewList tripId={tripId} /> : null}
              </div>
           </div>

          {/* Right Side: Booking Card */}
          <div id="booking-options" className="relative h-full scroll-mt-24">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sticky top-32"
            >
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden">
                    
                    {/* Price Header */}
                    <div className="space-y-1 text-center pb-6 border-b border-border">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('featured.from')}</span>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-black text-foreground font-display">{minPriceLabel}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label id="session-select-label" className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Select Date</label>
                        <div
                            role="radiogroup"
                            aria-labelledby="session-select-label"
                            className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar"
                        >
                           {openSessions.length > 0 ? (
                                openSessions.map((session) => (
                                <div 
                                    key={session.id}
                                    role="radio"
                                    aria-checked={selectedSession === session.id}
                                    tabIndex={0}
                                    onClick={() => setSelectedSession(session.id)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                                            event.preventDefault();
                                            setSelectedSession(session.id);
                                        }
                                    }}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all cursor-pointer group space-y-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-orange focus-visible:ring-offset-2",
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
                                          <span className={cn("text-[10px] font-bold mt-1", session.availableSeats < 5 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
                                              {session.availableSeats} spots left
                                          </span>
                                      </div>
                                      <div className="w-5 h-5 rounded-full border-2 border-border dark:border-slate-600 flex items-center justify-center group-hover:border-sunset-orange">
                                          {selectedSession === session.id && <div className="w-2.5 h-2.5 rounded-full bg-sunset-orange" />}
                                      </div>
                                    </div>
                                    
                                    {selectedSession === session.id && (
                                      <div className="pt-3 border-t border-sunset-orange/20 flex flex-col gap-1.5">
                                        {isStagedSession(session) ? (
                                          <>
                                            <div className="flex justify-between text-[11px] font-bold">
                                              <span className="text-sunset-orange uppercase tracking-tighter">Deposit due at checkout</span>
                                              <span className="text-foreground">{formatCurrency(session.deposit, session.currency, i18n.language)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-bold">
                                              <span className="text-muted-foreground uppercase tracking-tighter">Balance after confirmation</span>
                                              <span className="text-foreground">{formatCurrency(Number(session.price) - Number(session.deposit), session.currency, i18n.language)}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                              This trip needs at least {session.minBookings} participants to run.
                                              {session.confirmationDeadline
                                                ? ` Confirmed by ${new Date(session.confirmationDeadline).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })} — if the minimum is not reached, your deposit is refunded.`
                                                : ' If the minimum is not reached, your deposit is refunded.'}
                                            </p>
                                          </>
                                        ) : (
                                          <>
                                            <div className="flex justify-between text-[11px] font-bold">
                                              <span className="text-sunset-orange uppercase tracking-tighter">Total due at checkout</span>
                                              <span className="text-foreground">{formatCurrency(session.price, session.currency, i18n.language)}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                              The full amount is required at checkout.
                                            </p>
                                          </>
                                        )}
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
                                    router.push(`/checkout/${tripId}?session=${selectedSession}`);
                                }
                            }}
                            className="w-full h-14 rounded-xl text-lg font-bold bg-deep-blue dark:bg-sunset-orange hover:bg-blue-900 dark:hover:bg-orange-600 text-white shadow-lg shadow-blue-900/20 dark:shadow-orange-900/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            Book Now
                        </Button>
                        <p className="text-center text-xs text-muted-foreground mt-4 font-medium">
                            {t('tripDetails.directPaymentNote')}
                        </p>
                    </div>
                </div>
            </motion.div>
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 pb-safe-3 shadow-2xl backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">From</p>
            <p className="truncate text-xl font-black text-foreground">{minPriceLabel}</p>
          </div>
          <Button asChild className="shrink-0 px-6">
            <a href="#booking-options">{openSessions.length > 0 ? 'Choose a date' : 'View availability'}</a>
          </Button>
        </div>
      </div>
    </div>
  );
}



