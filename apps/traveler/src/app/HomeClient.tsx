'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  MapPin, Calendar, Star, ArrowRight, Compass, Banknote, Zap, Heart, Mountain, Palmtree, AlertTriangle, Plus, X
} from 'lucide-react';
import Image from 'next/image';
import { Button, EmptyState, SafeImage } from '@ouiboo/ui';
import { motion, Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BETA_DESTINATIONS } from '@ouiboo/types';
import type { TripSession, TripTemplate, VerificationStatusType } from '@ouiboo/types';
import { buildHeroSearchParams, isInvalidDateRange, isPastDate } from '@/lib/hero-search';
import {
  CLUSTER_DESTINATION_SLUGS,
  countTripsByCategory,
  countTripsByDestination,
  curateFeaturedTrips,
} from '@/lib/curation';
import { useDisplayPrice } from '@/lib/display-currency';

const TripCard = dynamic(() => import('@/components/TripCard').then((m) => m.TripCard));

/** The full catalogue trip shape the home page composes from (#885). */
export type HomeCatalogTrip = TripTemplate & {
  sessions?: TripSession[];
  agency?: {
    id?: string;
    companyName?: string;
    verificationStatus?: VerificationStatusType;
    isTestData?: boolean;
    travelLicenceStatus?: string;
    licenceVerifiedAt?: string | null;
    licenceExpiry?: string | null;
    insuranceStatus?: string;
    insuranceVerifiedAt?: string | null;
  } | null;
};

interface HomeClientProps {
  /** #885: the full active catalogue from the server page. The
   * featured rail is curated from it under the published rule; the
   * legacy `featuredTrips` prop is still accepted so existing callers
   * and tests render the rail directly. */
  catalogTrips?: HomeCatalogTrip[];
  featuredTrips?: HomeCatalogTrip[];
  /** #575: true when the server catalogue fetch failed — render the
   * error state, never the genuine-empty state, for an outage. */
  featuredTripsFetchFailed?: boolean;
  /** #877: slugs of beta destinations with at least one active trip,
   * computed from the live catalogue by the server page. The hero
   * suggestion list offers exactly these — suggesting a destination
   * with zero trips was the tested dead end this fixes. Empty when
   * the catalogue fetch failed (free text still works). */
  catalogDestinations?: string[];
}

/** #885: one compact "All beta trips" row — thumbnail, facts, from-price. */
function AllTripsRow({ trip }: { trip: HomeCatalogTrip }) {
  const { t, i18n } = useTranslation();
  const sessions = trip.sessions ?? [];
  const minPrice = sessions.length
    ? Math.min(...sessions.map((session) => Number(session.price || 0)))
    : null;
  const cheapest = minPrice === null
    ? null
    : (sessions.find((session) => Number(session.price || 0) === minPrice) ?? null);
  const displayPrice = useDisplayPrice(minPrice, cheapest?.currency ?? trip.currency, i18n.language);
  const facts = [
    trip.startLocation,
    trip.durationDays ? t('featured.allTrips.days', { count: trip.durationDays }) : null,
    trip.agency?.companyName,
  ].filter(Boolean).join(' · ');
  return (
    <Link
      href={`/trip/${trip.id}`}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <span className="relative block h-14 w-[74px] shrink-0 overflow-hidden rounded-xl">
        <SafeImage
          src={trip.images?.[0]}
          alt={trip.imageAlts?.[0] ?? trip.title}
          fill
          sizes="74px"
          className="object-cover"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] font-bold text-foreground">{trip.title}</span>
        <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{facts}</span>
      </span>
      <span className="shrink-0 text-end">
        <span className="block text-[11px] font-semibold text-muted-foreground">{t('featured.from')}</span>
        <span className="block font-display text-base font-extrabold text-foreground">
          {displayPrice ?? t('tripCard.priceTba')}
        </span>
      </span>
    </Link>
  );
}

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
  }
};

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function HomeClient({ catalogTrips, featuredTrips: featuredTripsProp, featuredTripsFetchFailed = false, catalogDestinations = [] }: HomeClientProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [dateError, setDateError] = useState('');
  // #877: dates are optional refinement, not a co-equal field — they
  // stay behind "Add dates" until the traveller asks for them.
  const [datesOpen, setDatesOpen] = useState(false);
  const dateFromInputRef = useRef<HTMLInputElement>(null);
  const dateToInputRef = useRef<HTMLInputElement>(null);

  // #723: the hero search is a semantic form — destination text that
  // names a configured beta destination (#675 taxonomy) submits as the
  // `destination` facet the search page consumes; anything else submits
  // as its free-text `q`. Dates submit as `dateFrom`/`dateTo`, the
  // canonical names SearchClient parses. An inverted range stays on
  // the page with an accessible validation message instead of sending
  // a query the results page would silently mis-handle.
  const handleSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    // Read dates from refs as fallback in case state hasn't synced (#120)
    const dateFrom = searchDateFrom || dateFromInputRef.current?.value || '';
    const dateTo = searchDateTo || dateToInputRef.current?.value || '';
    // #877: past dates can only dead-end (every matching session is
    // gone) — reject them here, inline, like the reversed range.
    if (isPastDate(dateFrom) || isPastDate(dateTo)) {
      setDateError(t('hero.pastDateError'));
      return;
    }
    if (isInvalidDateRange(dateFrom, dateTo)) {
      setDateError(t('hero.dateRangeError'));
      return;
    }
    setDateError('');
    // Localised destination names for the active language, so a value
    // picked from the suggestions resolves in FR/AR/EN alike (the
    // configured aliases already cover the other spellings).
    const localizedNames: Record<string, string> = {};
    for (const destination of BETA_DESTINATIONS) {
      localizedNames[destination.slug] = t(`search.destinationNames.${destination.slug}`);
    }
    const params = buildHeroSearchParams(
      { query: searchQuery, dateFrom, dateTo },
      localizedNames,
    );
    const queryString = params.toString();
    router.push(`/search${queryString ? `?${queryString}` : ''}`);
  };

  // #885: home composition from the catalogue. The featured rail is
  // curated under the published rule (lib/curation.ts); the chip rail,
  // destination section and "All beta trips" read the same catalogue.
  // Legacy callers passing only `featuredTrips` render that list as
  // the rail verbatim (the pre-#885 contract the tests lock).
  const allTrips = catalogTrips ?? featuredTripsProp ?? [];
  const featuredTrips = catalogTrips ? curateFeaturedTrips(catalogTrips) : allTrips;
  const destinationTripCounts = countTripsByDestination(allTrips);
  const categoryTripCounts = countTripsByCategory(allTrips);
  const destinationPhotoBySlug: Record<string, string | undefined> = {};
  for (const trip of allTrips) {
    if (trip.destinationSlug && !destinationPhotoBySlug[trip.destinationSlug]) {
      destinationPhotoBySlug[trip.destinationSlug] = trip.images?.[0];
    }
  }
  const styleChips = [
    { key: 'ADVENTURE', label: t('categories.adventure') },
    { key: 'CULTURAL', label: t('categories.cultural') },
    { key: 'NATURE', label: t('categories.nature') },
    { key: 'LUXURY', label: t('categories.luxury') },
    { key: 'BUDGET', label: t('categories.budget') },
  ].filter((chip) => (categoryTripCounts[chip.key] ?? 0) >= 2);
  const allTripsSorted = [...allTrips].sort((a, b) =>
    String(a.startLocation ?? '').localeCompare(String(b.startLocation ?? '')) ||
    String(a.title ?? '').localeCompare(String(b.title ?? '')),
  );
  const hasCatalogSections = Boolean(catalogTrips) && !featuredTripsFetchFailed;
  // #880: the hero's visual anchor is the first featured trip's own
  // slide-1 photo — the same optimizer URL its card requests below
  // the fold, so the anchor costs ~0 KB incremental and serves as
  // the page's LCP (priority / fetchPriority=high).
  const heroAnchorTrip = featuredTrips[0];
  const heroAnchorImage = heroAnchorTrip?.images?.[0];
  const travelStyles = [
    { key: 'adventure', name: t('categories.adventure'), Icon: Mountain, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
    { key: 'cultural', name: t('categories.cultural'), Icon: Compass, color: 'bg-blue-100 text-ocean-600 dark:text-ocean-300 dark:bg-blue-900/30 dark:text-blue-400' },
    { key: 'luxury', name: t('categories.luxury'), Icon: Star, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
    { key: 'nature', name: t('categories.nature'), Icon: Palmtree, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  ];

  return (
    <div className="bg-background min-h-screen font-sans text-foreground overflow-hidden">
      
      {/* Hero Section — #880: compressed (vertical whitespace more
          than halved) and anchored by the first featured trip's own
          photo, so a cold arrival sees product — a place, a trip —
          in the first screen instead of a claim and a form. */}
      <div className="relative isolate pt-24 pb-8 sm:pt-28 sm:pb-10">
        {/* Background Blob */}
        <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 opacity-20 dark:opacity-10">
          <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-sunset-orange sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]"
          >
            <div className="text-center lg:text-start">
            <motion.div variants={fadeInUp} className="mb-5 flex justify-center lg:justify-start">
                <span className="rounded-full bg-sunset-orange/10 px-3 py-1 text-sm font-semibold text-sunset-orange-dark ring-1 ring-inset ring-sunset-orange/20">
                    {t('hero.tagline')}
                </span>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl mb-5">
              {t('hero.title', 'Find your perfect')} <span className="text-sunset-orange-dark">{t('hero.accent', 'Adventure')}</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="mt-4 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto lg:mx-0">
              {t('hero.subtitle', 'Connect with local experts to plan trips that are as unique as you are.')}
            </motion.p>
            </div>

            {/* #880: the anchor photo — the first featured trip's
                slide-1 at its existing optimizer URL (the same asset
                its card loads below the fold), prioritised as LCP.
                On mobile it stacks first: product tops the screen. */}
            {heroAnchorTrip && heroAnchorImage ? (
              <motion.div variants={fadeInUp} className="order-first lg:order-none">
                <Link
                  href={`/trip/${heroAnchorTrip.id}`}
                  className="relative block h-44 overflow-hidden rounded-3xl shadow-xl sm:h-56 lg:h-[340px] focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-orange focus-visible:ring-offset-2"
                  aria-label={heroAnchorTrip.title}
                >
                  <Image
                    src={heroAnchorImage}
                    alt={heroAnchorTrip.imageAlts?.[0] ?? heroAnchorTrip.title}
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover"
                    priority
                    fetchPriority="high"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-5 pt-10 text-start">
                    <span className="block font-display text-lg font-bold text-white">{heroAnchorTrip.title}</span>
                    {heroAnchorTrip.startLocation ? (
                      <span className="mt-0.5 flex items-center gap-1 text-sm text-white/85">
                        <MapPin className="h-4 w-4" aria-hidden="true" /> {heroAnchorTrip.startLocation}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </motion.div>
            ) : null}
          </motion.div>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="mx-auto max-w-4xl text-center"
          >

            {/* Clean Search Bar — #723: a semantic form, so the button
                AND Enter in any field submit the same search. The
                destination suggestions are the #675 beta destinations
                (localised names); picking or typing one submits the
                `destination` facet, other text submits as `q`. */}
            <motion.div variants={fadeInUp} className="mt-6 mx-auto max-w-3xl">
              <form onSubmit={handleSearch} noValidate>
                <div className="bg-card p-2 rounded-2xl shadow-xl border border-border flex flex-col lg:flex-row gap-2">
                  <div className="flex-1 flex items-center px-4 py-3 bg-muted/55 rounded-xl border border-transparent focus-within:bg-background focus-within:border-border transition-all">
                    <MapPin className="h-5 w-5 text-sunset-orange me-3 shrink-0" />
                    <input
                      type="text"
                      aria-label={t('hero.where')}
                      placeholder={t('hero.where')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      list="hero-destination-suggestions"
                      autoComplete="off"
                      className="bg-transparent border-none focus:outline-none text-foreground w-full placeholder:text-muted-foreground font-medium"
                    />
                    <datalist id="hero-destination-suggestions">
                      {/* #877: suggestions are generated from the live
                          catalogue — only destinations with at least
                          one active trip are offered. */}
                      {BETA_DESTINATIONS.filter((destination) => catalogDestinations.includes(destination.slug)).map((destination) => (
                        <option
                          key={destination.slug}
                          value={t(`search.destinationNames.${destination.slug}`)}
                        />
                      ))}
                    </datalist>
                  </div>
                  {/* #877: dates demoted behind an explicit toggle —
                      collapsed by default. Open, the two fields carry
                      visible Start/End labels (they previously had
                      aria-labels only, indistinguishable unlabelled
                      boxes on the first screen). */}
                  <button
                    type="button"
                    onClick={() => {
                      if (datesOpen) {
                        setSearchDateFrom('');
                        setSearchDateTo('');
                        setDateError('');
                      }
                      setDatesOpen(!datesOpen);
                    }}
                    aria-expanded={datesOpen}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground font-medium hover:text-foreground hover:border-sunset-orange/50 transition-all"
                  >
                    {datesOpen ? <X className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0" />}
                    {datesOpen ? t('hero.removeDates') : t('hero.addDates')}
                  </button>
                  {datesOpen && (
                    <>
                      <div className="flex-1 flex items-center px-4 py-3 bg-muted/55 rounded-xl border border-transparent focus-within:bg-background focus-within:border-border transition-all">
                        <Calendar className="h-5 w-5 text-sunset-orange me-3 shrink-0" />
                        <label className="flex w-full flex-col gap-0.5 text-start">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('search.startDate')}</span>
                          <input
                            type="date"
                            ref={dateFromInputRef}
                            aria-label={t('search.startDate')}
                            value={searchDateFrom}
                            onChange={(e) => { setSearchDateFrom(e.target.value); setDateError(''); }}
                            aria-invalid={dateError ? true : undefined}
                            aria-describedby={dateError ? 'hero-date-error' : undefined}
                            className="bg-transparent border-none focus:outline-none text-foreground w-full placeholder:text-muted-foreground font-medium"
                          />
                        </label>
                      </div>
                      <div className="flex-1 flex items-center px-4 py-3 bg-muted/55 rounded-xl border border-transparent focus-within:bg-background focus-within:border-border transition-all">
                        <Calendar className="h-5 w-5 text-sunset-orange me-3 shrink-0" />
                        <label className="flex w-full flex-col gap-0.5 text-start">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('search.endDate')}</span>
                          <input
                            type="date"
                            ref={dateToInputRef}
                            aria-label={t('search.endDate')}
                            value={searchDateTo}
                            onChange={(e) => { setSearchDateTo(e.target.value); setDateError(''); }}
                            aria-invalid={dateError ? true : undefined}
                            aria-describedby={dateError ? 'hero-date-error' : undefined}
                            className="bg-transparent border-none focus:outline-none text-foreground w-full placeholder:text-muted-foreground font-medium"
                          />
                        </label>
                      </div>
                    </>
                  )}
                  <Button
                    type="submit"
                    className="h-14 lg:h-auto px-8 rounded-xl bg-deep-blue dark:bg-sunset-orange hover:bg-blue-900 dark:hover:bg-orange-600 text-white font-semibold text-lg shadow-md transition-all">
                    {t('hero.search', 'Search')}
                  </Button>
                </div>
                {dateError && (
                  <p id="hero-date-error" role="alert" className="mt-3 text-sm font-medium text-danger">
                    {dateError}
                  </p>
                )}
              </form>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* #885: one-tap chip rail directly under the hero — destination
          chips carry live catalogue counts (a zero-trip destination is
          an honest dashed chip, never hidden and never padded); style
          chips appear only for categories with at least two trips. */}
      {hasCatalogSections && (
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2.5 pt-2 pb-1" data-testid="home-chip-rail">
            {CLUSTER_DESTINATION_SLUGS.map((slug) => {
              const count = destinationTripCounts[slug] ?? 0;
              return count > 0 ? (
                <Link
                  key={slug}
                  href={`/search?destination=${slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground shadow-sm transition-shadow hover:shadow-md"
                >
                  {t(`search.destinationNames.${slug}`)}
                  <span className="text-sunset-orange-dark">{t('featured.betaRegion.tripsCount', { count })}</span>
                </Link>
              ) : (
                <Link
                  key={slug}
                  href={`/search?destination=${slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-transparent px-4 py-2.5 text-sm font-bold text-muted-foreground"
                >
                  {t(`search.destinationNames.${slug}`)}
                  <span>{t('featured.betaRegion.noTripsYet')}</span>
                </Link>
              );
            })}
            {styleChips.map((chip) => (
              <Link
                key={chip.key}
                href={`/search?category=${chip.key}`}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-2.5 text-sm font-bold text-foreground transition-shadow hover:shadow-md"
              >
                {chip.label}
                <span className="text-sunset-orange-dark">{categoryTripCounts[chip.key]}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Featured Trips Section — #880: tightened so the first card
          row peeks into the first screen below the compressed hero. */}
      <section className="py-12 sm:py-16 bg-background relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
            <div className="max-w-2xl">
              <h2 className="oui-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">{t('featured.title')}</h2>
              <p className="text-lg text-muted-foreground">{t('featured.subtitle')}</p>
              {/* #885: the curation rule is published where the rail
                  renders — one trip per agency, rotated weekly. */}
              {hasCatalogSections && (
                <p className="mt-2 text-sm text-muted-foreground">{t('featured.criteria')}</p>
              )}
            </div>
            <Link href="/search" className="text-sunset-orange-dark font-semibold hover:text-orange-800 flex items-center gap-2 transition-colors">
              {t('featured.viewAll')} <ArrowRight className={`h-4 w-4 ${i18n.language === 'ar' ? 'rotate-180' : ''}`} />
            </Link>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12"
          >
            {featuredTripsFetchFailed ? (
                <EmptyState
                    className="col-span-full py-20 bg-card/70 rounded-3xl"
                    icon={<AlertTriangle className="h-6 w-6 text-danger" aria-hidden="true" />}
                    title={t('featured.loadErrorTitle')}
                    description={t('featured.loadErrorSubtitle')}
                    action={(
                      <Button type="button" onClick={() => router.refresh()}>
                        {t('common.tryAgain')}
                      </Button>
                    )}
                />
            ) : featuredTrips.length > 0 ? (
              featuredTrips.map((trip) => (
                <motion.div key={trip.id} variants={fadeInUp}>
                  <TripCard trip={trip} />
                </motion.div>
              ))
            ) : (
                <EmptyState
                    className="col-span-full py-20 rounded-3xl"
                    icon={<Compass className="h-6 w-6" />}
                    title={t('featured.emptyTitle')}
                    description={t('featured.emptySubtitle')}
                />
            )}
          </motion.div>
        </div>
      </section>

      {/* #885: the beta-region destination section — the three cluster
          cities only. A city with no trips renders honestly empty
          (never backfilled with out-of-cluster supply); a stocked
          city's photo is its own first trip's photo. */}
      {hasCatalogSections && (
        <section className="py-24 bg-background">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <h2 className="oui-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">{t('featured.betaRegion.title')}</h2>
              <p className="text-lg text-muted-foreground">{t('featured.betaRegion.subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {CLUSTER_DESTINATION_SLUGS.map((slug) => {
                const count = destinationTripCounts[slug] ?? 0;
                const photo = destinationPhotoBySlug[slug];
                return (
                  <Link
                    key={slug}
                    href={`/search?destination=${slug}`}
                    className="group relative block min-h-[280px] overflow-hidden rounded-3xl bg-deep-blue text-white shadow-sm transition-shadow hover:shadow-xl"
                  >
                    {count > 0 && photo ? (
                      <SafeImage src={photo} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />
                    ) : null}
                    <span className="absolute inset-0 bg-gradient-to-t from-deep-blue/85 via-deep-blue/25 to-transparent" aria-hidden="true" />
                    <span className="absolute top-4 start-4 rounded-full bg-card px-3 py-1 text-[11px] font-extrabold text-foreground shadow">
                      {count > 0 ? t('featured.betaRegion.tripsCount', { count }) : t('featured.betaRegion.noTripsYet')}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 p-6">
                      <span className="block font-display text-[26px] font-extrabold">{t(`search.destinationNames.${slug}`)}</span>
                      <span className="mt-1 block text-sm text-white/85">
                        {count > 0 ? t(`featured.betaRegion.blurb.${slug}`) : t('featured.betaRegion.tripsComing')}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* #885: "All beta trips" — at beta scale every active trip is
          reachable from home itself, in compact rows. */}
      {hasCatalogSections && allTripsSorted.length > 0 && (
        <section className="py-24 bg-muted/35">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <h2 className="oui-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">{t('featured.allTrips.title')}</h2>
                <p className="text-lg text-muted-foreground">{t('featured.allTrips.subtitle')}</p>
              </div>
              <Link href="/search" className="flex items-center gap-2 font-semibold text-sunset-orange-dark transition-colors hover:text-orange-800">
                {t('featured.allTrips.searchAll')} <ArrowRight className={`h-4 w-4 ${i18n.language === 'ar' ? 'rotate-180' : ''}`} />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {allTripsSorted.map((trip) => (
                <AllTripsRow key={trip.id} trip={trip} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Travel Styles / Categories */}
      <section className="py-24 bg-muted/35">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
                <h2 className="oui-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t('categories.title')}</h2>
                <p className="mt-4 text-lg text-muted-foreground">{t('categories.subtitle')}</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {travelStyles.map((style) => (
                    <Link
                        key={style.key}
                        href={`/search?category=${style.key.toUpperCase()}`}
                        className="block rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-orange focus-visible:ring-offset-2"
                    >
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-card p-8 rounded-3xl shadow-sm border border-border hover:shadow-md transition-all group h-full"
                    >
                        <div className={`w-14 h-14 rounded-2xl ${style.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                            <style.Icon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">{style.name}</h3>
                        <p className="text-sm text-muted-foreground">{t('categories.discoverTrips')}</p>
                    </motion.div>
                    </Link>
                ))}
            </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-24 bg-background border-t border-border">
         <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-3 lg:gap-x-8">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-ocean-500/10">
                        <Banknote className="h-8 w-8 text-ocean-600 dark:text-ocean-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{t('trust.secureTitle')}</h3>
                    <p className="mt-2 text-base text-muted-foreground max-w-xs">{t('trust.secureDescription')}</p>
                </div>
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-sunset-orange/10">
                        <Heart className="h-8 w-8 text-sunset-orange" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{t('trust.verifiedTitle')}</h3>
                    <p className="mt-2 text-base text-muted-foreground max-w-xs">{t('trust.verifiedDescription')}</p>
                </div>
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                        <Zap className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{t('trust.instantTitle')}</h3>
                    <p className="mt-2 text-base text-muted-foreground max-w-xs">{t('trust.instantDescription')}</p>
                </div>
            </div>
         </div>
      </section>

      {/* The global footer (Support / Privacy / Terms / rights) renders
          from the root layout — Session #3 P0-7b (#555). This page used
          to hand-roll a two-item footer here; removed so the home page
          carries the same footer as every other page. */}
    </div>
  );
}

