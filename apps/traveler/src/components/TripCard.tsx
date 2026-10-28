'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Badge, Button, SafeImage } from '@ouiboo/ui';
import { MapPin, Star, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@ouiboo/ui/utils';
import { formatCurrency } from '@ouiboo/utils';
import { SessionStatus, type SessionStatusType, VerificationStatus, type VerificationStatusType } from '@ouiboo/types';
import { WishlistButton } from './WishlistButton';
import { tripCoverViewTransitionName } from '@/lib/view-transition';

export interface TripCardTrip {
  id: string;
  title: string;
  category?: string;
  /** #498: authoritative trip currency. The API enforces a single currency
   * per trip (every session must match the template currency), and the trip
   * payload already carries it — the card type just never declared it. */
  currency?: string;
  startLocation?: string;
  durationDays?: number;
  images?: string[];
  /** #332: agency-provided alt text per image (index-aligned); may be absent. */
  imageAlts?: string[];
  /** #486: stored blur placeholders per image (index-aligned data-URLs);
   * may be absent/null per image — SafeImage falls back to the shared
   * palette placeholder, so existing media renders correctly. */
  imageBlurDataURLs?: (string | null)[];
  averageRating?: number | null;
  reviewCount?: number;
  sessions?: Array<{
    id: string;
    status: SessionStatusType | string;
    availableSeats: number;
    price: number | string;
    currency?: string;
    startDate: string;
  }>;
  agency?: {
    verificationStatus?: VerificationStatusType;
    /** #413 (Council B10): what+when verification statement fields. */
    travelLicenceStatus?: string;
    licenceVerifiedAt?: string | null;
    insuranceStatus?: string;
    insuranceVerifiedAt?: string | null;
  } | null;
}

interface TripCardProps {
  trip: TripCardTrip;
}

export function TripCard({ trip }: TripCardProps) {
  const { t, i18n } = useTranslation();
  const [currentImage, setCurrentImage] = useState(0);
  const images = trip.images && trip.images.length > 0 
    ? trip.images 
    : ['https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'];
  const sessions = trip.sessions || [];
  const openSessions = sessions.filter(
    (session) => session.status === SessionStatus.Open && session.availableSeats > 0
  );
  const nextSession = [...openSessions].sort((a, b) => {
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  })[0];
  const minPrice = sessions.length
    ? Math.min(...sessions.map((session) => Number(session.price || 0)))
    : null;
  // #498: format the price in the currency of the session that set it (which,
  // per the API invariant, is the trip currency). Fall back to the trip-level
  // currency, then to the formatter default when neither is present.
  const cheapestSession =
    minPrice === null
      ? null
      : (sessions.find((session) => Number(session.price || 0) === minPrice) ?? null);
  const priceCurrency = cheapestSession?.currency ?? trip.currency;
  const isAgencyVerified = trip.agency?.verificationStatus === VerificationStatus.Verified;

  // #413 (Council B10): the what+when verification statement. Each part is
  // present only when that check actually passed and carries its real date;
  // with no dated check on record the card falls back to the plain
  // disclaimer text (never a shield, never a bare "verified" claim).
  const formatCheckDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? null
      : new Intl.DateTimeFormat(i18n.language || 'en', { dateStyle: 'medium' }).format(date);
  };
  const licenceCheckedDate =
    trip.agency?.travelLicenceStatus === 'VERIFIED'
      ? formatCheckDate(trip.agency?.licenceVerifiedAt)
      : null;
  const insuranceEvidencedDate =
    trip.agency?.insuranceStatus === 'VERIFIED'
      ? formatCheckDate(trip.agency?.insuranceVerifiedAt)
      : null;
  const verificationChecks = [
    licenceCheckedDate ? t('tripCard.licenceChecked', { date: licenceCheckedDate }) : null,
    insuranceEvidencedDate ? t('tripCard.insuranceEvidenced', { date: insuranceEvidencedDate }) : null,
  ].filter((part): part is string => Boolean(part));

  // #333: warm the trip-detail query on hover/focus/press so tapping a card
  // paints instantly instead of starting a cold request chain. Uses the exact
  // query key + fetcher of TripDetailsClient; prefetch is cached and
  // deduplicated by React Query, so repeated triggers are free.
  const queryClient = useQueryClient();
  const prefetchTrip = () => {
    void queryClient.prefetchQuery({
      // Content-language audit (#546): the key carries the UI locale,
      // exactly matching TripDetailsClient — prefetching into a
      // locale-less key warmed a stale-language entry for the detail
      // page to serve after a language switch.
      queryKey: ['trip', trip.id, (i18n.language || 'en').split('-')[0]],
      queryFn: async () => {
        // #546: warm the detail in the current UI language, matching
        // TripDetailsClient's fetcher below.
        const response = await apiClient.get(`/trips/${trip.id}?locale=${i18n.language}`);
        return response.data;
      },
      staleTime: 60 * 1000,
    });
  };

  const goToNextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const goToPrevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    goToNextImage();
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    goToPrevImage();
  };

  // Touch swipe support for the image carousel (mobile): a horizontal swipe
  // changes the image, while vertical gestures still scroll the page. The
  // container uses `touch-pan-y`, so the browser natively handles vertical
  // panning and only horizontal-dominant gestures reach these handlers.
  const SWIPE_THRESHOLD_PX = 40;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeHandledRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeHandledRef.current = false;
    if (images.length <= 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (images.length <= 1 || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
    swipeHandledRef.current = true;
    window.setTimeout(() => {
      swipeHandledRef.current = false;
    }, 400);
    // In RTL the carousel is mirrored (next sits on the left), so the swipe
    // direction that advances to the next image flips with it.
    const advancesNext = i18n.dir() === 'rtl' ? dx > 0 : dx < 0;
    if (advancesNext) {
      goToNextImage();
    } else {
      goToPrevImage();
    }
  };

  // A real swipe is followed by a synthetic click on the touched element;
  // swallow it so a swipe never toggles the wishlist or follows a link.
  // Plain taps are unaffected because the flag is only set after a swipe.
  const handleClickCapture = (e: React.MouseEvent) => {
    if (swipeHandledRef.current) {
      e.preventDefault();
      e.stopPropagation();
      swipeHandledRef.current = false;
    }
  };

  return (
    <Card onMouseEnter={prefetchTrip} onFocus={prefetchTrip} onPointerDown={prefetchTrip} className="group border-border shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-card h-full flex flex-col">
      <div
        className="relative h-64 overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClickCapture={handleClickCapture}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <SafeImage
              src={images[currentImage]}
              className="w-full h-full object-cover"
              alt={trip.imageAlts?.[currentImage]?.trim() || (trip.startLocation ? `${trip.title} · ${trip.startLocation}` : trip.title)}
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              blurDataURL={trip.imageBlurDataURLs?.[currentImage] ?? undefined}
              style={{ viewTransitionName: tripCoverViewTransitionName(trip.id) }}
            />
          </motion.div>
        </AnimatePresence>
        
        {/* #571: the photo previously carried five overlay layers and
            the price appeared twice (badge here + footer). What remains:
            this legibility gradient (indicators only), the category
            badge, ONE availability badge, the wishlist button and the
            carousel controls — the footer is the single price surface.
            #573: the crossfade above is opacity-only; the image no
            longer also scales on hover (double transform). */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent opacity-50" />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              aria-label={t('tripCard.previousImage')}
              className="absolute start-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-foreground opacity-70 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 transition-all hover:scale-110 hit-slop"
            >
              <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button
              onClick={nextImage}
              aria-label={t('tripCard.nextImage')}
              className="absolute end-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm shadow-sm flex items-center justify-center text-foreground opacity-70 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 transition-all hover:scale-110 hit-slop"
            >
              <ChevronRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </>
        )}

        {/* Indicators — real buttons (Session #3 P0-1): keyboard/touch
            reachable, not decorative divs. */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_: string, i: number) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setCurrentImage(i);
              }}
              aria-label={t('tripCard.viewImage', { count: i + 1 })}
              aria-current={currentImage === i || undefined}
              className="p-1 -m-0.5 flex items-center justify-center"
            >
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 shadow-sm block",
                  currentImage === i ? "w-6 bg-white" : "w-1.5 bg-white/60"
                )}
              />
            </button>
          ))}
        </div>

        <div className="absolute top-3 start-3">
          <Badge className="bg-card/95 text-foreground text-[10px] font-bold rounded-lg uppercase px-3 py-1 shadow-md tracking-wider border-none">
            {trip.category || t('tripCard.defaultCategory')}
          </Badge>
        </div>

        <div className="absolute top-3 end-14 flex flex-col items-end gap-2">
          <Badge className={cn(
            "text-[10px] font-bold rounded-lg uppercase px-3 py-1 shadow-md tracking-wider border-none flex items-center gap-1",
            nextSession ? "bg-success/15 text-success-dark" : "bg-warning/15 text-warning-dark"
          )}>
            <Zap className="h-3 w-3" />
            {nextSession ? t('tripCard.spots', { count: nextSession.availableSeats }) : t('tripCard.soldOut')}
          </Badge>
        </div>

          <WishlistButton tripId={trip.id} className="absolute top-3 end-3" />
      </div>

      <Link href={`/trip/${trip.id}`} className="flex-1 flex flex-col p-6">
        <div className="space-y-3 flex-1">
          <div className="flex justify-between items-start gap-3">
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">{trip.title}</h3>
            <div className="flex items-center gap-1 shrink-0 bg-warning/10 px-2 py-0.5 rounded-md">
              <Star className={cn("h-3.5 w-3.5 text-warning", trip.reviewCount ? "fill-warning" : "fill-none")} />
              <span className="text-xs font-bold text-warning-dark">
                {trip.reviewCount ? Number(trip.averageRating || 0).toFixed(1) : t('tripCard.new')}
              </span>
            </div>
          </div>

          {/* #317: public cards never display an internal approval state.
              #413 (Council B10): no ShieldCheck beside disclaimer text and
              no bare "verified" badge — the dated what+when statement when
              the checks are on record, else the plain disclaimer as text. */}
          {verificationChecks.length > 0 ? (
            <p className="text-[11px] font-medium text-muted-foreground">
              {verificationChecks.join(' · ')}
            </p>
          ) : isAgencyVerified ? (
            <p className="text-[11px] font-medium text-muted-foreground">
              {t('tripCard.verifiedAgency')}
            </p>
          ) : null}
          
          <div className="flex items-center gap-3 text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {trip.startLocation}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {trip.durationDays ? t('tripCard.days', { count: trip.durationDays }) : ''}</span>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t('tripCard.from')}</span>
            <div className="flex items-baseline gap-1">
                <span className="oui-numeric text-xl font-bold text-foreground">
                   {minPrice !== null ? formatCurrency(minPrice, priceCurrency, i18n.language) : '---'}
                </span>
            </div>
          </div>
          <span className="rounded-xl px-4 py-2 h-auto text-sm font-semibold bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-none group-hover:shadow-md inline-flex items-center justify-center">
            {t('tripCard.viewDetails')}
          </span>
        </div>
      </Link>
    </Card>
  );
}

