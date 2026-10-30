'use client';

import React, { useState } from 'react';
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
  Languages,
  Star,
  X,
  Zap,
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
import VerificationRecord from '@/components/VerificationRecord';
import { TRAVELER_URL } from '@/lib/site';
import { tripCoverViewTransitionName } from '@/lib/view-transition';
import { SessionStatus, type CancellationScaleSnapshot, type SessionStatusType } from '@ouiboo/types';
import { formatCurrency } from '@ouiboo/utils';
import { CancellationScaleCard } from '@/components/CancellationScaleCard';
import { CancellationOneLiner } from '@/components/CancellationOneLiner';
import { TripFaqSection, pickFaqText } from '@/components/TripFaqSection';
import type { CancellationSummary, PickupPoint, TripFaqEntry } from '@ouiboo/types';
import { QuoteRequestPanel } from '@/components/QuoteRequestPanel';
import { RatingDistribution } from '@/components/RatingDistribution';
import { SnapRail } from '@/components/SnapRail';
import { PhotoViewer } from '@/components/PhotoViewer';
import { TripMosaic } from '@/components/TripMosaic';
import { useDisplayAmountConverter } from '@/lib/display-currency';
import { MIN_REVIEWS_FOR_RATING, ratingDisplayState } from '@/lib/review-display';

type TripDay = {
  dayNumber: number;
  title?: string;
  description?: string;
  activities?: string[];
  /** #676: language-neutral slice (numbers / enums / proper noun). */
  distanceKm?: number | null;
  driveTimeMinutes?: number | null;
  mealsIncluded?: string[];
  accommodationName?: string | null;
  accommodationType?: string | null;
  /** #701: itinerary phase 2. */
  accommodationTier?: string | null;
  stops?: Array<{ name: Record<string, string>; durationMinutes?: number | null; admissionNote?: Record<string, string> | null }> | null;
  notes?: Record<string, string> | null;
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
  /** Batch F: #694 private kind, #696 pay-later election. */
  sessionKind?: string;
  allowPayLater?: boolean;
  payLaterHoldHours?: number | null;
};

/** #369: a session is staged when it needs a minimum group and a deposit. */
const isStagedSession = (session: TripSession) =>
  (session.minBookings ?? 1) > 1 && Number(session.deposit ?? 0) > 0;

type TripDetails = {
  id: string;
  title: string;
  /** Session #3 P0-11 (#546): language the API actually resolved the
   * title/description in — the page says so when it is not the reader's. */
  contentLanguage?: string;
  category?: string;
  startLocation: string;
  durationDays: number;
  durationNights: number;
  description: string;
  images?: string[];
  /** #332: agency-provided alt text per image (index-aligned); may be absent. */
  imageAlts?: string[];
  /** #486: stored blur placeholders per image (index-aligned data-URLs);
   * may be absent/null per image — SafeImage falls back to the shared
   * palette placeholder, so existing media renders correctly. */
  imageBlurDataURLs?: (string | null)[];
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
    /** #688/#700 (Council S6): Verification Record + seller block. */
    travelLicenceType?: string | null;
    licenceIssuedAt?: string | null;
    licenceIssuingAuthority?: string | null;
    insuranceInsurer?: string | null;
    insuranceExpiry?: string | null;
    verificationStatus?: string | null;
    businessAddress?: string | null;
    businessPhone?: string | null;
    rc?: string | null;
    taxId?: string | null;
  } | null;
  sessions?: TripSession[];
  itinerary?: TripDay[];
  /** #676: public meeting point — AREA ONLY (the API never sends the
   * exact address/maps link on this pre-booking surface). */
  meetingPoint?: { area: string | null; pickupAvailable: boolean } | null;
  /** #417: the resolved cancellation scale from GET /trips/:id (bands + floor). */
  cancellationScale?: CancellationScaleSnapshot | null;
  /** Batch F payloads from GET /trips/:id. */
  cancellationSummary?: CancellationSummary | null;
  faqs?: TripFaqEntry[] | null;
  generatedFaqs?: TripFaqEntry[];
  faqJsonLd?: Record<string, unknown> | null;
  payOnArrivalEnabled?: boolean;
  privateTourEnabled?: boolean;
  pickupPoints?: PickupPoint[] | null;
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
  // Batch F booking-box elections (#696/#697/#701).
  const [pickupPointId, setPickupPointId] = useState<string>('');
  // Batch F: render-stable "now" for the pay-later deadline preview
  // (lazy initial state — the purity lint forbids Date.now in render).
  const [nowMs] = useState(() => Date.now());
  const [payLater, setPayLater] = useState(false);
  const [payOnArrival, setPayOnArrival] = useState(false);
  // #623: full-screen photo viewer — opened at the tapped photo from
  // either gallery surface (mobile rail or desktop mosaic).
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Content-language audit (2026-10-27, #546): the server fetch sends
  // no locale, so the ISR payload is canonical French. It previously
  // seeded a locale-less query entry (['trip', tripId]) that the
  // switcher never invalidated — content stayed in whichever language
  // the last fetch used, French by default. The key now carries the UI
  // locale: a language switch mounts a different entry and fetches in
  // the new language immediately, and the persisted cache (keyed the
  // same way) can only restore a snapshot in the language it was
  // fetched in.
  const uiLocale = (i18n.language || 'en').split('-')[0];
  const { data: trip, isLoading, isError, refetch } = useQuery<TripDetails | null>({
    queryKey: ['trip', tripId, uiLocale],
    enabled: !!tripId,
    // Seed from the ISR payload only when it already matches the UI
    // locale (P0-11's contentLanguage says which) — never a
    // stale-language first render after a switch.
    initialData:
      initialTrip && (initialTrip.contentLanguage ?? 'fr') === uiLocale
        ? initialTrip
        : undefined,
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

  // #615: every price on this page honours the traveller's display
  // currency, exactly like the cards. All of a trip's sessions share
  // the trip currency (API invariant), so one converter bound to the
  // first session's currency covers the price header, the session
  // rows and the cancellation scale. Display only — checkout still
  // charges the session currency.
  const convertDisplayAmount = useDisplayAmountConverter(trip?.sessions?.[0]?.currency);

  if (isLoading) return (
    <div className="min-h-screen bg-background pb-32" role="status" aria-label={t('tripDetails.loading')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32">
        <TripDetailSkeleton />
      </div>
      <span className="sr-only">{t('tripDetails.loading')}</span>
    </div>
  );

  if (isError) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-5 bg-background px-6 text-center">
      <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center">
        <X className="h-8 w-8 text-danger" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-foreground font-display">{t('tripDetails.loadErrorTitle')}</h1>
        <p className="text-muted-foreground">{t('tripDetails.loadErrorBody')}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={() => void refetch()}>{t('common.tryAgain')}</Button>
        <Button type="button" variant="outline" onClick={() => router.push('/search')}>{t('tripDetails.browseOtherTrips')}</Button>
      </div>
    </div>
  );
  
  if (!trip) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-6 bg-background">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
          <MapPin className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-black text-foreground font-display">{t('tripDetails.notFoundTitle')}</h1>
        <Button onClick={() => router.push('/')} className="bg-sunset-orange hover:bg-orange-600 px-8 py-6 rounded-2xl font-bold">
            {t('tripDetails.exploreOtherTrips')}
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
  // #615: the "from" price renders in the display currency (converted
  // through the MAD-base rates), not the session currency.
  const formatDisplayAmount = (amount: number | string | null | undefined): string => {
    const converted = convertDisplayAmount(amount);
    return converted ? formatCurrency(converted.amount, converted.currency, i18n.language) : '—';
  };
  const minPriceLabel = lowestPricedSession
    ? formatDisplayAmount(lowestPricedSession.price)
    : t('tripDetails.onRequest');

  // #417: refund amounts on the cancellation scale are computed on the
  // selected session's price, falling back to the lowest open price.
  // #615: the scale's base is converted to the display currency too,
  // so the refund amounts it derives match the cards.
  const selectedSessionData = openSessions.find((session) => session.id === selectedSession) ?? null;
  const scaleBaseSession = selectedSessionData ?? lowestPricedSession;
  const scaleBaseConverted = scaleBaseSession ? convertDisplayAmount(scaleBaseSession.price) : null;

  // #571 rework: prominent trip-level spots indicator (previously the
  // count existed only as 10px text inside session-picker rows).
  const nextDepartureSession = [...openSessions].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  )[0] ?? null;

  const galleryImages = trip.images && trip.images.length > 0 ? trip.images : [''];

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
            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 rtl:rotate-180 transition-transform" />
            {t('tripDetails.backToCatalog')}
        </Link>

        {/* #490 — Option A "Snap Rail": the shared rail component.
            Round 2 extracted it from this file (where it passed
            witnessed verification) so the home/search cards render
            the identical component and behaviour — see SnapRail.tsx.
            Round 3: dragAdvanceOnRelease — this gallery's slides are
            a full page width (~3x a card's), so the same drag that
            advances a card fell short of this rail's halfway snap
            point and settled back onto the starting photo; a moved
            drag now settles one slide over. Cards keep the native
            settle (they do not pass the flag).
            #625 (design batch): below desktop the rail runs
            FULL-BLEED — the negative margins cancel this container's
            px-4 / sm:px-6 so the photo touches both screen edges,
            with no card frame or rounding on the outer edges; the
            counter pill + caption keep their scrims. #624: at lg+
            the mosaic below replaces the rail entirely. #623:
            tapping a photo on either surface opens the full-screen
            viewer at that photo. */}
        <div className="-mx-4 sm:-mx-6 lg:hidden">
          <SnapRail
            dragAdvanceOnRelease
            testId="trip-gallery-snap-rail"
            counterTestId="trip-gallery-counter"
            images={galleryImages}
            imageAlts={trip.imageAlts}
            imageBlurDataURLs={trip.imageBlurDataURLs}
            captionFallback={trip.title}
            ariaLabel={t('tripDetails.photosLabel')}
            rootClassName="mb-8 sm:mb-12 overflow-hidden border-y border-border/50 shadow-2xl shadow-black/5 dark:shadow-black/20"
            viewportClassName="h-[280px] sm:h-[400px]"
            sizes="100vw"
            onSlideClick={(idx) => setViewerIndex(idx)}
            slideStyle={(idx, isActive) =>
              isActive ? { viewTransitionName: tripCoverViewTransitionName(trip.id) } : undefined
            }
          />
        </div>

        {/* #624: desktop mosaic (1 large + up to 4 small). */}
        <div className="mb-12 hidden lg:block">
          <TripMosaic
            images={galleryImages}
            imageAlts={trip.imageAlts}
            imageBlurDataURLs={trip.imageBlurDataURLs}
            captionFallback={trip.title}
            onPhotoClick={(idx) => setViewerIndex(idx)}
            coverStyle={{ viewTransitionName: tripCoverViewTransitionName(trip.id) }}
          />
        </div>

        {viewerIndex !== null ? (
          <PhotoViewer
            images={galleryImages}
            imageAlts={trip.imageAlts}
            imageBlurDataURLs={trip.imageBlurDataURLs}
            captionFallback={trip.title}
            initialIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        ) : null}

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
                            <MapPin className="h-4 w-4 me-1.5 text-sunset-orange" />
                            {trip.startLocation}
                        </div>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-foreground leading-[1.1] font-display tracking-tight mb-6">
                        {trip.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-1.5 bg-yellow-400/10 px-3 py-1.5 rounded-full border border-yellow-400/20">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {/* #681 (Council S6): the average renders only
                                at/above the 5-review threshold; below it the
                                count is published without an average, and at
                                zero the localised "No reviews yet" (#579). */}
                            <span className="font-bold text-sm text-amber-700 dark:text-yellow-400">{ratingDisplayState(reviewStats?.totalReviews) === 'rated' ? (reviewStats?.averageRating ?? 0).toFixed(1) : ratingDisplayState(reviewStats?.totalReviews) === 'below-threshold' ? t('tripDetails.reviewsCount', { count: reviewStats?.totalReviews ?? 0 }) : t('tripDetails.newTrip')}</span>
                            <span className="text-xs text-amber-700 dark:text-yellow-400/70 font-medium">{reviewStats?.totalReviews ? t('tripDetails.reviewsCount', { count: reviewStats.totalReviews }) : t('reviews.noReviewsYet')}</span>
                        </div>
                        {/* #468: share this trip (native sheet / intent menu).
                            allowRuntimeOriginFallback: this app serves the trip
                            pages, so its own origin is a safe share base if the
                            configured one is ever loopback in a deployed build. */}
                        <ShareTripButton tripId={trip.id} tripTitle={trip.title} travelerBaseUrl={TRAVELER_URL} allowRuntimeOriginFallback className="rounded-full" />
                    </div>

                    {/* #571 rework: prominent trip-level spots indicator —
                        solid fill, white bold 14px text; amber when the
                        next departure has fewer than 5 seats, dark red
                        when there is no open departure left. */}
                    <button
                      type="button"
                      data-testid="trip-spots-indicator"
                      data-state={!nextDepartureSession ? 'sold-out' : nextDepartureSession.availableSeats < 5 ? 'low' : 'available'}
                      disabled={!nextDepartureSession}
                      aria-pressed={nextDepartureSession ? selectedSession === nextDepartureSession.id : undefined}
                      onClick={() => {
                        if (nextDepartureSession) setSelectedSession(nextDepartureSession.id);
                      }}
                      className={cn(
                        "mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md",
                        !nextDepartureSession
                          ? "bg-rose-800"
                          : nextDepartureSession.availableSeats < 5
                            ? "bg-amber-600"
                            : "bg-emerald-700"
                      )}
                    >
                      <Zap className="h-4 w-4" />
                      {nextDepartureSession
                        ? t('tripDetails.spotsLeft', { count: nextDepartureSession.availableSeats })
                        : t('tripDetails.spotsBannerSoldOut')}
                    </button>

                    {/* Session #3 P0-11 (#546): when the content resolved
                        in a language other than the reader's UI language,
                        say so — French-only content previously failed
                        silently for Arabic/English readers. */}
                    {trip.contentLanguage && trip.contentLanguage !== uiLocale ? (
                      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Languages className="h-4 w-4 text-sunset-orange shrink-0" />
                        {t('tripDetails.contentLanguageNotice', { language: t(`languageNames.${trip.contentLanguage}`) })}
                      </p>
                    ) : null}

                    {/* #371: seller of record + verified travel licence */}
                    <SellerIdentity agency={trip.agency} className="mt-4" />

                    {/* #688 (Council S6): the checkable Public Verification
                        Record for this agency (metadata only). */}
                    <VerificationRecord agency={trip.agency} className="mt-4" />

                    {/* #676: meeting AREA only before booking — the
                        exact address + map link appear on the booking
                        view once the traveller holds a booking. */}
                    {(trip.meetingPoint?.area || trip.meetingPoint?.pickupAvailable) ? (
                      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" data-testid="trip-meeting-area">
                        <MapPin className="h-4 w-4 text-sunset-orange shrink-0" />
                        {trip.meetingPoint.area ? t('tripDetails.meetingArea', { area: trip.meetingPoint.area }) : null}
                        {trip.meetingPoint.pickupAvailable ? (
                          <span>{trip.meetingPoint.area ? ' · ' : ''}{t('tripDetails.meetingPickup')}</span>
                        ) : null}
                      </p>
                    ) : null}

                    {/* #687: one-line cancellation summary in the hero,
                        agency named as refund obligor. */}
                    <CancellationOneLiner
                      summary={trip.cancellationSummary}
                      agencyName={trip.agency?.legalName ?? trip.agency?.companyName}
                      className="mt-4 text-sm"
                    />
                    {(trip.payOnArrivalEnabled || trip.privateTourEnabled) ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {trip.payOnArrivalEnabled ? (
                          <span className="rounded-lg bg-sky-700 px-2.5 py-1 text-[11px] font-bold text-white">{t('batchF.payOnArrivalBadge')}</span>
                        ) : null}
                        {trip.privateTourEnabled ? (
                          <span className="rounded-lg bg-violet-700 px-2.5 py-1 text-[11px] font-bold text-white">{t('batchF.privateBadge')}</span>
                        ) : null}
                      </div>
                    ) : null}
                </motion.div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                        { label: t('tripDetails.durationLabel'), value: t('tripDetails.durationValue', { days: trip.durationDays, nights: trip.durationNights }), icon: Clock },
                        { label: t('tripDetails.availableDatesLabel'), value: openSessions.length > 0 ? t('tripDetails.openDates', { count: openSessions.length }) : t('tripDetails.onRequest'), icon: Users },
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
                <h2 className="text-2xl font-bold text-foreground font-display">{t('tripDetails.experienceTitle')}</h2>
                <div className="text-muted-foreground leading-relaxed text-lg font-medium whitespace-pre-wrap">
                    {trip.description}
                </div>
             </div>

             {trip.itinerary && trip.itinerary.length > 0 ? (
               <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-foreground font-display">{t('tripDetails.dailyPlanTitle')}</h2>
                    <Badge variant="outline" className="text-[10px] font-bold px-3 py-1 bg-muted/30">
                        {t('tripCard.days', { count: trip.itinerary.length })}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {trip.itinerary.map((day, idx: number) => (
                      <div key={idx} className="relative ps-12 pb-10 last:pb-0 group">
                        {/* Timeline Connector */}
                        <div className="absolute start-4 top-2 bottom-0 w-0.5 bg-border/60 group-last:hidden" />
                        
                        <div className="absolute start-0 top-0 w-8 h-8 rounded-full bg-card border-2 border-sunset-orange text-sunset-orange flex items-center justify-center font-bold text-xs z-10 shadow-sm transition-all group-hover:scale-110 group-hover:bg-sunset-orange group-hover:text-white">
                          {day.dayNumber}
                        </div>
                        
                        <div className="space-y-3 pt-0.5">
                          <div className="flex items-center gap-2">
                             {day.title ? (
                               <h3 className="text-xl font-bold text-foreground leading-tight font-display">{day.title}</h3>
                             ) : (
                               <h3 className="text-xl font-bold text-foreground leading-tight font-display">{t('tripDetails.dayLabel', { number: day.dayNumber })}</h3>
                             )}
                          </div>
                          
                          <p className="text-muted-foreground leading-relaxed font-medium whitespace-pre-wrap text-base">
                            {day.description || t('tripDetails.dayNoDescription')}
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

                          {/* #676: the language-neutral day facts —
                              distance / drive time (numbers), meals +
                              accommodation type (enum labels), and the
                              accommodation name (proper noun, shown
                              as-is in every language). */}
                          {(day.distanceKm != null || day.driveTimeMinutes != null || (day.mealsIncluded && day.mealsIncluded.length > 0) || day.accommodationName || day.accommodationType || day.accommodationTier) && (
                            <div className="flex flex-wrap gap-2 pt-2" data-testid={`itinerary-day-facts-${day.dayNumber}`}>
                              {day.distanceKm != null && (
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 border-border bg-muted/30">
                                  {t('tripDetails.distanceKm', { count: day.distanceKm })}
                                </Badge>
                              )}
                              {day.driveTimeMinutes != null && (
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 border-border bg-muted/30">
                                  {day.driveTimeMinutes >= 60
                                    ? t('tripDetails.driveTimeHM', { hours: Math.floor(day.driveTimeMinutes / 60), minutes: day.driveTimeMinutes % 60 })
                                    : t('tripDetails.driveTimeM', { minutes: day.driveTimeMinutes })}
                                </Badge>
                              )}
                              {day.mealsIncluded?.map((meal) => (
                                <Badge key={meal} variant="outline" className="text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 border-border bg-muted/30">
                                  {t(`tripDetails.meals.${meal}`)}
                                </Badge>
                              ))}
                              {(day.accommodationName || day.accommodationType) && (
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 border-border bg-muted/30">
                                  {day.accommodationName
                                    ? day.accommodationType
                                      ? `${day.accommodationName} · ${t(`tripDetails.accommodationTypes.${day.accommodationType}`)}`
                                      : day.accommodationName
                                    : t(`tripDetails.accommodationTypes.${day.accommodationType}`)}
                                </Badge>
                              )}
                              {/* #701: the night's tier, "or similar". */}
                              {day.accommodationTier && (
                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider py-1 px-2.5 border-border bg-muted/30" data-testid={`itinerary-day-tier-${day.dayNumber}`}>
                                  {t('batchF.accommodationTierLabel', { tier: t(`batchF.tiers.${day.accommodationTier}`) })}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* #701: per-stop detail (durations + admission notes). */}
                          {day.stops && day.stops.length > 0 && (
                            <ul className="space-y-1.5 pt-1" data-testid={`itinerary-day-stops-${day.dayNumber}`}>
                              {day.stops.map((stop, stopIdx) => (
                                <li key={stopIdx} className="text-sm text-muted-foreground">
                                  <span className="font-semibold text-foreground">{pickFaqText(stop.name, i18n.language)}</span>
                                  {stop.durationMinutes != null ? <span> · {t('batchF.stopDuration', { count: stop.durationMinutes })}</span> : null}
                                  {stop.admissionNote ? <span> · {pickFaqText(stop.admissionNote, i18n.language)}</span> : null}
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* #701: free-text day notes (language-keyed). */}
                          {day.notes && pickFaqText(day.notes, i18n.language) ? (
                            <p className="text-sm text-muted-foreground italic" data-testid={`itinerary-day-notes-${day.dayNumber}`}>
                              {pickFaqText(day.notes, i18n.language)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
              ) : (
                 <div className="p-8 rounded-3xl bg-muted/30 border border-dashed border-border flex flex-col items-center justify-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <ClipboardList className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">{t('tripDetails.flexibleTitle')}</h3>
                         <p className="text-xs text-muted-foreground mt-1 max-w-[320px]">
                           {t('tripDetails.flexibleBody')}
                         </p>
                      </div>
                  </div>
               )}

             <div className="space-y-6">
                <h2 className="text-2xl font-bold text-foreground font-display">{t('tripDetails.includedTitle')}</h2>
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
                  <h2 className="text-2xl font-bold text-foreground font-display">{t('tripDetails.excludedTitle')}</h2>
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
                  <h2 className="text-2xl font-bold text-foreground font-display">{t('tripDetails.checklistTitle')}</h2>
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

             {/* #417: the cancellation scale, shown before payment.
                 #615: base + currency arrive already converted to the
                 display currency, so the refund amounts match the
                 cards; the card itself keeps formatting them. */}
             <CancellationScaleCard
               scale={trip.cancellationScale}
               baseAmount={scaleBaseConverted ? scaleBaseConverted.amount : null}
               currency={scaleBaseConverted?.currency ?? scaleBaseSession?.currency ?? trip.sessions?.[0]?.currency}
               className="pt-6"
             />

             {/* #686: per-trip FAQ — generated from structured data +
                 capped agency Q&As, with FAQPage JSON-LD. */}
             <TripFaqSection generatedFaqs={trip.generatedFaqs} faqs={trip.faqs} faqJsonLd={trip.faqJsonLd} />

             {/* Reviews Section */}
             <div className="space-y-6 pt-6">
               <div className="flex items-center justify-between">
                 <h2 className="text-2xl font-bold text-foreground font-display">{t('tripDetails.reviewsTitle')}</h2>
                 <Badge variant="outline" className="text-[10px] font-bold px-3 py-1 bg-muted/30">
                   {/* #579: zero reviews reads "No reviews yet", not "0 Reviews". */}
                   {reviewStats?.totalReviews ? t('tripDetails.reviewsBadge', { count: reviewStats.totalReviews }) : t('reviews.noReviewsYet')}
                 </Badge>
               </div>
               
               {/* #681 (Council S6): below the 5-review threshold the
                   count is published with an explicit note, but NO
                   average and NO distribution are displayed. */}
               {reviewStats && reviewStats.totalReviews > 0 && ratingDisplayState(reviewStats.totalReviews) === 'below-threshold' && (
                 <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6" data-testid="reviews-below-threshold">
                   <p className="text-sm text-muted-foreground">
                     {t('reviews.belowThreshold', { count: reviewStats.totalReviews, min: MIN_REVIEWS_FOR_RATING })}
                   </p>
                 </div>
               )}

               {/* Rating Summary */}
               {reviewStats && ratingDisplayState(reviewStats.totalReviews) === 'rated' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Average Rating Display */}
                   <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 space-y-4">
                     <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t('tripDetails.averageRating')}</p>
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

                   {/* Rating Distribution (#587: extracted so the row
                       labels are pinned by RatingDistribution.test.tsx) */}
                   <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 space-y-4">
                     <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t('tripDetails.distribution')}</p>
                     <RatingDistribution distribution={reviewStats.distribution} totalReviews={reviewStats.totalReviews} />
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
                <div className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl rounded-4xl p-8 space-y-8 relative overflow-hidden">
                    
                    {/* Price Header */}
                    <div className="space-y-1 text-center pb-6 border-b border-border">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('featured.from')}</span>
                        <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-black text-foreground font-display">{minPriceLabel}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label id="session-select-label" className="text-xs font-bold text-foreground uppercase tracking-wider ms-1">{t('tripDetails.selectDate')}</label>
                        <div
                            role="radiogroup"
                            aria-labelledby="session-select-label"
                            className="space-y-3 max-h-[300px] overflow-y-auto pe-2 custom-scrollbar"
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
                                          <span className={cn("text-xs font-bold mt-1", session.availableSeats < 5 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
                                              {t('tripDetails.spotsLeft', { count: session.availableSeats })}
                                          </span>
                                          {(session.sessionKind === 'PRIVATE' || session.allowPayLater) ? (
                                            <span className="mt-1 flex gap-1">
                                              {session.sessionKind === 'PRIVATE' ? (
                                                <span className="rounded bg-violet-700 px-1.5 py-0.5 text-[10px] font-bold text-white">{t('batchF.privateBadge')}</span>
                                              ) : null}
                                              {session.allowPayLater ? (
                                                <span className="rounded bg-sky-700 px-1.5 py-0.5 text-[10px] font-bold text-white">{t('batchF.payLaterBadge')}</span>
                                              ) : null}
                                            </span>
                                          ) : null}
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
                                              <span className="text-sunset-orange uppercase tracking-tighter">{t('tripDetails.depositDue')}</span>
                                              <span className="text-foreground">{formatDisplayAmount(session.deposit)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] font-bold">
                                              <span className="text-muted-foreground uppercase tracking-tighter">{t('tripDetails.balanceAfterConfirmation')}</span>
                                              <span className="text-foreground">{formatDisplayAmount(Number(session.price) - Number(session.deposit))}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                              {t('tripDetails.minParticipants', { count: session.minBookings })}
                                              {session.confirmationDeadline
                                                ? ` ${t('tripDetails.confirmedByRefund', { date: new Date(session.confirmationDeadline).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }) })}`
                                                : ` ${t('tripDetails.minNotReachedRefund')}`}
                                            </p>
                                          </>
                                        ) : (
                                          <>
                                            <div className="flex justify-between text-[11px] font-bold">
                                              <span className="text-sunset-orange uppercase tracking-tighter">{t('tripDetails.totalDue')}</span>
                                              <span className="text-foreground">{formatDisplayAmount(session.price)}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                              {t('tripDetails.fullAmountRequired')}
                                            </p>
                                          </>
                                        )}
                                        {/* Batch F session notes (#694/#696/#697). */}
                                        {session.sessionKind === 'PRIVATE' ? (
                                          <p className="text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                                            {t('batchF.privateSessionNote')} {t('batchF.privatePriceNote')}
                                          </p>
                                        ) : null}
                                        {session.allowPayLater ? (
                                          <p className="text-[10px] text-muted-foreground">
                                            {t('batchF.payLaterNote', {
                                              agency: trip.agency?.legalName ?? trip.agency?.companyName ?? t('batchF.theAgency'),
                                              date: new Date(Math.min(nowMs + (session.payLaterHoldHours ?? 48) * 3600_000, new Date(session.startDate).getTime())).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }),
                                            })}
                                          </p>
                                        ) : null}
                                        {trip.payOnArrivalEnabled ? (
                                          <p className="text-[10px] text-muted-foreground">
                                            {t('batchF.payOnArrivalNote', { agency: trip.agency?.legalName ?? trip.agency?.companyName ?? t('batchF.theAgency') })}
                                          </p>
                                        ) : null}
                                      </div>
                                    )}
                                </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground text-sm font-medium">
                                    {t('tripDetails.noDates')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Batch F: pickup selection + payment-shape elections. */}
                    {trip.pickupPoints && trip.pickupPoints.length > 0 ? (
                      <div className="space-y-2">
                        <label htmlFor="pickup-point-select" className="text-xs font-bold text-foreground uppercase tracking-wider ms-1">{t('batchF.pickupTitle')}</label>
                        <select
                          id="pickup-point-select"
                          value={pickupPointId}
                          onChange={(event) => setPickupPointId(event.target.value)}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
                        >
                          <option value="">{t('batchF.pickupNone')}</option>
                          {trip.pickupPoints.map((point) => (
                            <option key={point.id} value={point.id}>{point.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    {selectedSessionData?.allowPayLater ? (
                      <label className="flex items-start gap-2 text-sm text-foreground">
                        <input type="checkbox" checked={payLater} onChange={(event) => { setPayLater(event.target.checked); if (event.target.checked) setPayOnArrival(false); }} className="mt-1" />
                        <span>{t('batchF.payLaterBook', { agency: trip.agency?.legalName ?? trip.agency?.companyName ?? t('batchF.theAgency') })}</span>
                      </label>
                    ) : null}
                    {trip.payOnArrivalEnabled && selectedSessionData && selectedSessionData.sessionKind !== 'PRIVATE' ? (
                      <label className="flex items-start gap-2 text-sm text-foreground">
                        <input type="checkbox" checked={payOnArrival} onChange={(event) => { setPayOnArrival(event.target.checked); if (event.target.checked) setPayLater(false); }} className="mt-1" />
                        <span>{t('batchF.payOnArrivalBook', { agency: trip.agency?.legalName ?? trip.agency?.companyName ?? t('batchF.theAgency') })}</span>
                      </label>
                    ) : null}
                    <CancellationOneLiner summary={trip.cancellationSummary} agencyName={trip.agency?.legalName ?? trip.agency?.companyName} />

                    <div className="pt-2">
                        <Button 
                            disabled={!selectedSession}
                            onClick={() => {
                                if (!user) {
                                    setShowLoginModal(true);
                                } else {
                                    const params = new URLSearchParams(selectedSession ? { session: selectedSession } : {});
                                    if (pickupPointId) params.set('pickup', pickupPointId);
                                    if (payLater) params.set('payLater', '1');
                                    if (payOnArrival) params.set('payOnArrival', '1');
                                    router.push(`/checkout/${tripId}?${params.toString()}`);
                                }
                            }}
                            className="w-full h-14 rounded-xl text-lg font-bold bg-deep-blue dark:bg-sunset-orange hover:bg-blue-900 dark:hover:bg-orange-600 text-white shadow-lg shadow-blue-900/20 dark:shadow-orange-900/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {t('tripDetails.bookNow')}
                        </Button>
                        <p className="text-center text-xs text-muted-foreground mt-4 font-medium">
                            {t('tripDetails.directPaymentNote')}
                        </p>
                    </div>
                </div>

                {/* #682 (Council S6): firm-quote for other dates — the
                    traveller asks, the agency answers with a firm MAD
                    TTC total + its cancellation scale. */}
                <div className="mt-6">
                    <QuoteRequestPanel templateId={tripId} />
                </div>
            </motion.div>
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 pb-safe-3 shadow-2xl backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('featured.from')}</p>
            <p className="truncate text-xl font-black text-foreground">{minPriceLabel}</p>
          </div>
          <Button asChild className="shrink-0 px-6">
            <a href="#booking-options">{openSessions.length > 0 ? t('tripDetails.chooseDate') : t('tripDetails.viewAvailability')}</a>
          </Button>
        </div>
      </div>
    </div>
  );
}



