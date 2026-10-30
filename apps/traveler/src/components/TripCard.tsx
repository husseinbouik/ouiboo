'use client';

import React from 'react';
import { Card, Badge, Button } from '@ouiboo/ui';
import { MapPin, Star, Zap } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@ouiboo/ui/utils';
import { SessionStatus, type SessionStatusType, type VerificationStatusType } from '@ouiboo/types';
import { WishlistButton } from './WishlistButton';
import { SnapRail } from './SnapRail';
import { useDisplayPrice } from '@/lib/display-currency';
import { tripCoverViewTransitionName } from '@/lib/view-transition';
import { ratingDisplayState } from '@/lib/review-display';

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
    /** #673 (Council S6): licence expiry rides along so the card can
     * state status + expiry + verified-at, never the old hedge. */
    licenceExpiry?: string | null;
    insuranceStatus?: string;
    insuranceVerifiedAt?: string | null;
  } | null;
}

interface TripCardProps {
  trip: TripCardTrip;
}

export function TripCard({ trip }: TripCardProps) {
  const { t, i18n } = useTranslation();
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
  // #498 rework: render the price in the traveller's display currency
  // (converted through the MAD-base rates, React-Query cached). When no
  // rate exists the hook falls back to this authoritative currency.
  // Display only — checkout still charges priceCurrency.
  const displayPrice = useDisplayPrice(minPrice, priceCurrency, i18n.language);
  // #413 (Council B10) + #673 (Council S6): the dated what+when
  // verification statement. Each part is present only when that check
  // actually passed and carries its real date (and, for the licence,
  // its expiry). With no dated check on record the card renders NO
  // verification line at all — the old hedge ("Licence number provided
  // by the agency — not independently verified") is retired: no date,
  // no claim.
  const formatCheckDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? null
      : new Intl.DateTimeFormat(i18n.language || 'en', { dateStyle: 'medium' }).format(date);
  };
  const licenceExpiryDate = (() => {
    if (!trip.agency?.licenceExpiry) return null;
    const date = new Date(trip.agency.licenceExpiry);
    return Number.isNaN(date.getTime()) || date.getTime() <= Date.now() ? null : date;
  })();
  const licenceCheckedDate =
    trip.agency?.travelLicenceStatus === 'VERIFIED' && (!trip.agency?.licenceExpiry || licenceExpiryDate)
      ? formatCheckDate(trip.agency?.licenceVerifiedAt)
      : null;
  const insuranceEvidencedDate =
    trip.agency?.insuranceStatus === 'VERIFIED'
      ? formatCheckDate(trip.agency?.insuranceVerifiedAt)
      : null;
  const verificationChecks = [
    licenceCheckedDate ? t('tripCard.licenceChecked', { date: licenceCheckedDate }) : null,
    licenceCheckedDate && licenceExpiryDate
      ? t('tripCard.licenceValidUntil', { date: formatCheckDate(trip.agency?.licenceExpiry) })
      : null,
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

  return (
    <Card onMouseEnter={prefetchTrip} onFocus={prefetchTrip} onPointerDown={prefetchTrip} className="group border-border shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-card h-full flex flex-col">
      <div className="relative h-64 overflow-hidden">
        {/* #490 round 2: the card renders the SAME Snap Rail component
            as the trip-page gallery — native scroll-snap glide (touch
            swipe and mouse drag both advance it), counter + caption
            always visible, 44px arrows that DISABLE at the ends with
            NO loop. The old crossfade carousel looped its arrows,
            showed dots only, and its drag/swipe advanced nothing.
            #571: the overlays stay minimal — category badge, ONE
            availability badge, the wishlist button and the rail
            controls; the footer is the single price surface. */}
        {/* Founder decision 2026-10-29: a card photo tap is a plain
            link to the trip page — the #623 full-screen viewer opens
            from the trip page only, never from cards. The rail's root
            click-capture swallows the click that follows a drag, so
            swipes never navigate; its arrows and indicators cancel
            their own clicks, so they keep cycling photos in place. */}
        <Link href={`/trip/${trip.id}`} className="absolute inset-0 block">
          <SnapRail
            images={images}
            imageAlts={trip.imageAlts}
            imageBlurDataURLs={trip.imageBlurDataURLs}
            captionFallback={trip.startLocation ? `${trip.title} · ${trip.startLocation}` : trip.title}
            ariaLabel={t('tripDetails.photosLabel')}
            rootClassName="h-full"
            viewportClassName="h-full"
            sizes="(min-width: 1024px) 33vw, 100vw"
            showIndicators
            slideStyle={(idx, isActive) =>
              isActive ? { viewTransitionName: tripCoverViewTransitionName(trip.id) } : undefined
            }
          />
        </Link>

        <div className="absolute top-3 start-3">
          <Badge className="bg-card/95 text-foreground text-[10px] font-bold rounded-lg uppercase px-3 py-1 shadow-md tracking-wider border-none">
            {trip.category || t('tripCard.defaultCategory')}
          </Badge>
        </div>

        <div className="absolute top-3 end-16 flex flex-col items-end gap-2">
          {/* #571 rework: solid, legible spots badge — white bold text at
              12px on a solid deep-green fill; solid amber when fewer
              than 5 seats remain; solid dark red when sold out. The old
              10px dark-green text on a 15%-tint pill was unreadable on
              photographic backgrounds. */}
          <Badge
            data-testid="trip-card-spots-badge"
            data-state={nextSession ? (nextSession.availableSeats < 5 ? 'low' : 'available') : 'sold-out'}
            className={cn(
              "text-xs font-bold rounded-lg uppercase px-3 py-1.5 shadow-md tracking-wide border-none flex items-center gap-1 text-white",
              nextSession
                ? nextSession.availableSeats < 5
                  ? "bg-amber-600"
                  : "bg-emerald-700"
                : "bg-rose-800"
            )}>
            <Zap className="h-3.5 w-3.5" />
            {nextSession ? t('tripCard.spots', { count: nextSession.availableSeats }) : t('tripCard.soldOut')}
          </Badge>
        </div>

          <WishlistButton tripId={trip.id} className="absolute top-3 end-3" />
      </div>

      <Link href={`/trip/${trip.id}`} className="flex-1 flex flex-col p-6">
        <div className="space-y-3 flex-1">
          <div className="flex justify-between items-start gap-3">
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">{trip.title}</h3>
            {/* #681 (Council S6): an average is a claim — it renders only
                at/above MIN_REVIEWS_FOR_RATING reviews. Below that the
                count is still published (even when small); at zero the
                card says "No reviews yet" instead of a bare 0.0. */}
            <div className="flex items-center gap-1 shrink-0 bg-warning/10 px-2 py-0.5 rounded-md">
              <Star className={cn("h-3.5 w-3.5 text-warning", ratingDisplayState(trip.reviewCount) === 'rated' ? "fill-warning" : "fill-none")} />
              <span className="text-xs font-bold text-warning-dark">
                {ratingDisplayState(trip.reviewCount) === 'rated'
                  ? `${Number(trip.averageRating || 0).toFixed(1)} · ${t('reviews.count', { count: trip.reviewCount ?? 0 })}`
                  : ratingDisplayState(trip.reviewCount) === 'below-threshold'
                    ? t('reviews.count', { count: trip.reviewCount ?? 0 })
                    : t('reviews.noReviewsYet')}
              </span>
            </div>
          </div>

          {/* #317: public cards never display an internal approval state.
              #413 (Council B10) + #673 (Council S6): no ShieldCheck beside
              disclaimer text and no bare "verified" badge — only the dated
              what+when statement when the checks are on record; without a
              dated check on record there is no verification line at all
              (the old hedge copy is retired). */}
          {verificationChecks.length > 0 ? (
            <p className="text-[11px] font-medium text-muted-foreground">
              {verificationChecks.join(' · ')}
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
                   {minPrice !== null ? (displayPrice ?? '---') : '---'}
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

