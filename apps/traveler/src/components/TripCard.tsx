'use client';

import React from 'react';
import { Card, Badge, Button, SafeImage } from '@ouiboo/ui';
import { MapPin, Star, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@ouiboo/ui/utils';
import { SessionStatus, type SessionStatusType, type VerificationStatusType } from '@ouiboo/types';
import { WishlistButton } from './WishlistButton';
import { SnapRail } from './SnapRail';
import { useDisplayPrice } from '@/lib/display-currency';
import { localizeLocationSuffix } from '@/lib/localized-location';
import { tripCoverViewTransitionName } from '@/lib/view-transition';
import { ratingDisplayState } from '@/lib/review-display';
import { CancellationOneLiner } from './CancellationOneLiner';
import { todayLocalISO } from '@/lib/hero-search';
import type { CancellationSummary } from '@ouiboo/types';

export interface TripCardTrip {
  id: string;
  title: string;
  category?: string;
  /** #885: curation inputs — cluster eligibility (lib/curation.ts)
   * reads the stamped slug, falling back to startLocation. */
  destinationSlug?: string | null;
  featured?: boolean | null;
  createdAt?: string | null;
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
  /** #687: one-line cancellation summary from the API. */
  cancellationSummary?: CancellationSummary | null;
  payOnArrivalEnabled?: boolean;
  privateTourEnabled?: boolean;
  sessions?: Array<{
    id: string;
    status: SessionStatusType | string;
    availableSeats: number;
    price: number | string;
    currency?: string;
    startDate: string;
  }>;
  agency?: {
    /** Carried by every public trip payload; used by the featured
     * curation (#879/#885) to enforce one trip per agency. */
    id?: string;
    /** #878, as superseded by the founder decision of 2026-11-12:
     * test/example supply — an internal data-layer flag only. It
     * suppresses every verification claim on the card; it no longer
     * renders any badge or label. */
    isTestData?: boolean;
    companyName?: string;
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
  /** Hybrid (#926): rendered-width hint for the photo rail when the
   * card renders wider than the standard grid cell (the Selected
   * rail's featured-card break), so a wide card never upscales. */
  imageSizes?: string;
  /** Search council punch item 9 (#886): inside result grids the
   * card renders a single static photo — a per-card carousel would
   * put an arrow/dot tab stop per card into the grid's tab order.
   * The home rail keeps the settled SnapRail behaviour (#882). */
  staticPhoto?: boolean;
  /** Search-page council item 19 (#965): the wishlist page needs to
   * observe a removal so it can leave a persistent in-place tombstone
   * with Undo (the button's toast alone never satisfies the page
   * pattern). Optional — every other surface keeps the bare button. */
  onWishlistToggle?: (tripId: string, next: boolean) => void;
}

/** Search-page council K6b: the badge's date is part of the locked
 * template, per locale — EN `17 Nov`, FR `17 nov.` with the 1st as
 * `1er` (Intl yields a bare "1"), AR the full month name (Arabic has
 * no month abbreviation; Intl's short form already gives it). */
function formatBadgeDate(date: Date, language: string): string {
  const base = new Intl.DateTimeFormat(language || 'en', { day: 'numeric', month: 'short' }).format(date);
  if ((language || '').startsWith('fr') && date.getDate() === 1) {
    return base.replace(/^1(?=[\s.])/, '1er');
  }
  return base;
}

/** #673: a licence expiry only supports the dated statement while it is
 * still in the future. Kept outside the component (same pattern as
 * SellerIdentity's isLicenceVerifiedForDisplay) so render stays pure. */
function futureLicenceExpiry(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() <= new Date().getTime() ? null : date;
}

export function TripCard({ trip, imageSizes, staticPhoto = false, onWishlistToggle }: TripCardProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  // #745 (remainder): the API resolves a translated startLocation
  // when the trip's translations map carries one; for the remaining
  // single-language strings the country suffix localizes here.
  const displayLocation = trip.startLocation
    ? localizeLocationSuffix(trip.startLocation, t('countries.morocco'))
    : trip.startLocation;
  const categoryKey = trip.category?.toLowerCase();
  const categoryLabel = categoryKey && ['adventure', 'cultural', 'luxury', 'budget', 'nature'].includes(categoryKey)
    ? t(`categories.${categoryKey}`)
    : t('tripCard.defaultCategory');
  const images = trip.images && trip.images.length > 0
    ? trip.images 
    : ['https://images.unsplash.com/photo-1489749798305-4fea3ae63d43'];
  const sessions = trip.sessions || [];
  const openSessions = sessions.filter(
    (session) => session.status === SessionStatus.Open && session.availableSeats > 0
  );
  // Search council D6 / punch item 15 (#886): the spots badge states
  // its basis — the seats left on the NEXT upcoming session, with
  // that session's date (Pattern S1). The figure is the API's live
  // next-session `availableSeats`, transactionally maintained. A
  // session whose day has already passed is stale data, not a
  // promise: it never feeds the badge — with no upcoming session the
  // card falls back to the sold-out state, which claims nothing.
  const todayISO = todayLocalISO();
  const nextSession = [...openSessions]
    .filter((session) => String(session.startDate).slice(0, 10) >= todayISO)
    .sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    })[0];
  const nextSessionDateLabel = nextSession
    ? formatBadgeDate(new Date(nextSession.startDate), i18n.language || 'en')
    : null;
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
  const licenceExpiryDate = futureLicenceExpiry(trip.agency?.licenceExpiry);
  // #878: test/example supply carries no verification claims at all.
  const licenceCheckedDate =
    !trip.agency?.isTestData &&
    trip.agency?.travelLicenceStatus === 'VERIFIED' &&
    (!trip.agency?.licenceExpiry || licenceExpiryDate)
      ? formatCheckDate(trip.agency?.licenceVerifiedAt)
      : null;
  const insuranceEvidencedDate =
    !trip.agency?.isTestData && trip.agency?.insuranceStatus === 'VERIFIED'
      ? formatCheckDate(trip.agency?.insuranceVerifiedAt)
      : null;
  const verificationChecks = [
    licenceCheckedDate ? t('tripCard.licenceChecked', { date: licenceCheckedDate }) : null,
    licenceCheckedDate && licenceExpiryDate
      ? t('tripCard.licenceValidUntil', { date: formatCheckDate(trip.agency?.licenceExpiry) })
      : null,
    insuranceEvidencedDate ? t('tripCard.insuranceEvidenced', { date: insuranceEvidencedDate }) : null,
  ].filter((part): part is string => Boolean(part));

  // Search-page council punch item 11 (#886 — Trust's K2 concession
  // condition, lapsing if cut): "<Agency> · Checked before listing"
  // as a legible line at caption weight, riding this card's existing
  // verification paragraph (no new row, no badge). Gated exactly like
  // every verification claim — licence VERIFIED, not expired, and
  // never for test supply (#878 suppression): a test agency's name
  // carries no checked claim anywhere in the traveller UI.
  const agencyCheckedLine =
    !trip.agency?.isTestData &&
    trip.agency?.travelLicenceStatus === 'VERIFIED' &&
    (!trip.agency?.licenceExpiry || licenceExpiryDate) &&
    trip.agency?.companyName
      ? `${trip.agency.companyName} · ${t('tripCard.checkedBeforeListing')}`
      : null;

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
            always visible, 44px arrows. Round 5 (#490, founder
            decision): the rail LOOPS seamlessly — the arrows never
            disable and stepping past either end wraps to the other
            end's photo. (This comment previously claimed the opposite
            — corrected in the #663 polish pass.) The old crossfade
            carousel showed dots only, and its drag/swipe advanced
            nothing.
            #571: the overlays stay minimal — category badge, ONE
            availability badge, the wishlist button and the rail
            controls; the footer is the single price surface. */}
        {/* Founder decision 2026-10-29: a card photo tap navigates to
            the trip page — the #623 full-screen viewer opens from the
            trip page only, never from cards. The rail's root
            click-capture swallows the click that follows a drag, so
            swipes never navigate; its arrows and indicators cancel
            their own clicks, so they keep cycling photos in place.
            #882: the rail is no longer wrapped in a Link — interactive
            content (arrows, dots, focusable slides) nested inside an
            anchor is invalid and screen readers announced the whole
            photo strip as one link. Photo navigation now runs through
            the rail's genuine-click callback (router.push), and the
            card body below stays a real link. */}
        <div className="absolute inset-0 block">
          {staticPhoto ? (
            <div className="h-full w-full cursor-pointer" onClick={() => router.push(`/trip/${trip.id}`)}>
              <SafeImage
                src={images[0]}
                alt={trip.imageAlts?.[0] ?? (displayLocation ? `${trip.title} · ${displayLocation}` : trip.title)}
                fill
                sizes={imageSizes ?? "(min-width: 1024px) 33vw, 100vw"}
                className="object-cover"
                blurDataURL={trip.imageBlurDataURLs?.[0] ?? undefined}
                style={{ viewTransitionName: tripCoverViewTransitionName(trip.id) }}
              />
            </div>
          ) : (
          <SnapRail
            images={images}
            imageAlts={trip.imageAlts}
            imageBlurDataURLs={trip.imageBlurDataURLs}
            captionFallback={displayLocation ? `${trip.title} · ${displayLocation}` : trip.title}
            ariaLabel={t('tripCard.photoCarousel', { title: trip.title })}
            rootClassName="h-full"
            viewportClassName="h-full"
            sizes={imageSizes ?? "(min-width: 1024px) 33vw, 100vw"}
            showIndicators
            deferOffscreenSlides
            onSlideClick={() => router.push(`/trip/${trip.id}`)}
            slideStyle={(idx, isActive) =>
              isActive ? { viewTransitionName: tripCoverViewTransitionName(trip.id) } : undefined
            }
          />
          )}
        </div>

        <div className="absolute top-3 start-3 flex flex-col items-start gap-2">
          <Badge className="bg-card/95 text-foreground text-[10px] font-bold rounded-lg uppercase px-3 py-1 shadow-md tracking-wider border-none">
            {categoryLabel}
          </Badge>
          {/* Founder decision 2026-11-12 (superseding #878): the
              "Example" badge that test supply carried here is
              REMOVED — no user-facing Example label renders anywhere
              in the traveller UI. The isTestData flag stays in the
              data layer (internal only) and still suppresses every
              verification claim below; it has no UI surface. */}
        </div>

        <div className="absolute top-3 end-16 flex flex-col items-end gap-2">
          {/* #571 rework + search-page council K6a (punch item 10,
              #886): the badge colours are a measured spec, not a
              palette pick — available = #15803D with white text
              (5.02:1); the low state (≤5 seats, the council's
              threshold) = the frozen warn pair #B45309 on #FEF3C7
              (4.51:1); sold out keeps its dark red. Prohibited pairs
              (#16A34A, white-on-orange) never ship; the fix is always
              colour, never shorter text (K6b wording is locked in
              the locale templates). */}
          <Badge
            data-testid="trip-card-spots-badge"
            data-state={nextSession ? (nextSession.availableSeats <= 5 ? 'low' : 'available') : 'sold-out'}
            className={cn(
              "text-xs font-bold rounded-lg px-3 py-1.5 shadow-md border-none flex items-center gap-1",
              nextSession
                ? nextSession.availableSeats <= 5
                  ? "bg-[#FEF3C7] text-[#B45309]"
                  : "bg-[#15803D] text-white"
                : "bg-rose-800 text-white"
            )}>
            <Zap className="h-3.5 w-3.5" />
            {nextSession
              ? t('tripCard.spotsLeftSession', { count: nextSession.availableSeats, date: nextSessionDateLabel ?? '' })
              : t('tripCard.soldOut')}
          </Badge>
        </div>

          <WishlistButton
            tripId={trip.id}
            className="absolute top-3 end-3"
            onToggled={onWishlistToggle ? (next) => onWishlistToggle(trip.id, next) : undefined}
          />
      </div>

      <Link href={`/trip/${trip.id}`} className="flex-1 flex flex-col p-6">
        <div className="space-y-3 flex-1">
          <div className="flex justify-between items-start gap-3">
            {/* Hybrid P0-7 (#926/#745): titles are never clamped —
                FR/AR titles were cut at two lines; the reserved
                two-line min-height keeps card geometry (and CLS)
                exactly where the clamp held it. */}
            <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-tight min-h-[2.85rem]">{trip.title}</h3>
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
          {agencyCheckedLine || verificationChecks.length > 0 ? (
            <p className="text-[11px] font-medium text-muted-foreground">
              {[agencyCheckedLine, ...verificationChecks].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          
          <div className="flex items-center gap-3 text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {displayLocation}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {trip.durationDays ? t('tripCard.days', { count: trip.durationDays }) : ''}</span>
          </div>

          {/* #687: the one-line cancellation summary on the card,
              naming the agency as refund obligor. */}
          <CancellationOneLiner summary={trip.cancellationSummary} agencyName={trip.agency?.companyName} />
          {(trip.payOnArrivalEnabled || trip.privateTourEnabled) ? (
            <div className="flex flex-wrap gap-1.5">
              {trip.payOnArrivalEnabled ? (
                <Badge className="bg-sky-700 text-white text-[10px] font-bold rounded-lg px-2 py-0.5 border-none">{t('batchF.payOnArrivalBadge')}</Badge>
              ) : null}
              {trip.privateTourEnabled ? (
                <Badge className="bg-violet-700 text-white text-[10px] font-bold rounded-lg px-2 py-0.5 border-none">{t('batchF.privateBadge')}</Badge>
              ) : null}
            </div>
          ) : null}
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

