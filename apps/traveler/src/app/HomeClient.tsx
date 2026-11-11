'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  MapPin, Calendar, ArrowRight, Compass, Banknote, ShieldCheck, CalendarCheck, AlertTriangle, Plus, X, Check
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
  showcaseDestinations,
  tripsCoverPlace,
  type ShowcaseDestination,
} from '@/lib/curation';
import { useDisplayPrice } from '@/lib/display-currency';
import { CATEGORY_IMAGES, DESTINATION_IMAGES, HERO_IMAGE, NON_PLACE_PHOTO_IDS, STATIC_HOME_PHOTO_IDS } from '@/lib/static-imagery';

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

/**
 * Round 2 (founder decision 2026-11-11): the coverage showcase
 * replaces the "All trips" listing on home. A HAS tile — a
 * destination with trips: its own photo, the live count and the
 * from-price, linking into search for that place.
 */
function CoverageTile({ destination }: { destination: ShowcaseDestination }) {
  const { t, i18n } = useTranslation();
  const displayPrice = useDisplayPrice(destination.minPrice, destination.priceCurrency, i18n.language);
  return (
    <Link
      href={`/search?q=${encodeURIComponent(destination.name)}`}
      className="group relative block min-h-[180px] overflow-hidden rounded-3xl bg-deep-blue text-white shadow-sm transition-shadow hover:shadow-xl sm:min-h-[220px]"
    >
      {destination.photo ? (
        <SafeImage
          src={destination.photo}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
        />
      ) : null}
      <span className="absolute inset-0 bg-gradient-to-t from-deep-blue/85 via-deep-blue/25 to-transparent" aria-hidden="true" />
      <span className="absolute top-4 start-4 rounded-full bg-card px-3 py-1 text-[11px] font-extrabold text-foreground shadow">
        {t('featured.betaRegion.tripsCount', { count: destination.count })}
      </span>
      <span className="absolute inset-x-0 bottom-0 p-5">
        <span className="block font-display text-lg font-extrabold sm:text-[22px]">{destination.name}</span>
        {displayPrice ? (
          <span className="mt-1 block text-sm text-white/85">
            {t('featured.from')} {displayPrice}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** A DON'T-HAVE tile — a well-known place with no trips yet, shown
 * honestly empty in the same graded treatment as Tétouan above. */
function AbsentCoverageTile({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const name = t(`featured.coverage.names.${slug}`);
  return (
    <Link
      href={`/search?q=${encodeURIComponent(name)}`}
      className="group relative block min-h-[180px] overflow-hidden rounded-3xl bg-deep-blue text-white shadow-sm transition-shadow hover:shadow-xl sm:min-h-[220px]"
    >
      <span className="absolute top-4 start-4 rounded-full bg-card px-3 py-1 text-[11px] font-extrabold text-foreground shadow">
        {t('featured.betaRegion.noTripsYet')}
      </span>
      <span className="absolute inset-x-0 bottom-0 p-5">
        <span className="block font-display text-lg font-extrabold sm:text-[22px]">{name}</span>
        <span className="mt-1 block text-sm text-white/85">{t('featured.betaRegion.tripsComing')}</span>
      </span>
    </Link>
  );
}

/**
 * Well-known Moroccan destinations the showcase holds up as NOT
 * covered — filtered against the live catalogue on every render
 * (lib/curation tripsCoverPlace), so a tile disappears the moment
 * a trip exists there. Aliases cover the EN/FR/AR spellings a
 * startLocation may carry.
 */
const ABSENT_COVERAGE_CANDIDATES = [
  { slug: 'agadir', aliases: ['agadir', 'أكادير'] },
  { slug: 'dakhla', aliases: ['dakhla', 'الداخلة'] },
  { slug: 'ifrane', aliases: ['ifrane', 'إفران'] },
  { slug: 'alhoceima', aliases: ['al hoceima', 'alhoceima', 'hoceima', 'الحسيمة'] },
] as const;

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
  // destination section and "All trips" read the same catalogue.
  // Legacy callers passing only `featuredTrips` render that list as
  // the rail verbatim (the pre-#885 contract the tests lock).
  const allTrips = catalogTrips ?? featuredTripsProp ?? [];
  const featuredTrips = catalogTrips ? curateFeaturedTrips(catalogTrips) : allTrips;
  const destinationTripCounts = countTripsByDestination(allTrips);
  const categoryTripCounts = countTripsByCategory(allTrips);
  const styleChips = [
    { key: 'ADVENTURE', label: t('categories.adventure') },
    { key: 'CULTURAL', label: t('categories.cultural') },
    { key: 'NATURE', label: t('categories.nature') },
    { key: 'LUXURY', label: t('categories.luxury') },
    { key: 'BUDGET', label: t('categories.budget') },
  ].filter((chip) => (categoryTripCounts[chip.key] ?? 0) >= 2);
  const hasCatalogSections = Boolean(catalogTrips) && !featuredTripsFetchFailed;
  // Round 2: the coverage showcase (lib/curation) — destinations
  // beyond the cluster with live counts, plus the honestly-empty
  // well-known places, filtered against the live catalogue.
  // Photo-truth (#898, council P0-1): the pick skips the static
  // assets (no photo twice on the page) AND the audited non-place
  // photos, so a destination with no truthful photo in its trips'
  // media renders the graded tile rather than somewhere else.
  const coverageDestinations = showcaseDestinations(allTrips, [...STATIC_HOME_PHOTO_IDS, ...NON_PLACE_PHOTO_IDS]);
  const absentCoverage = ABSENT_COVERAGE_CANDIDATES.filter(
    (candidate) => !tripsCoverPlace(allTrips, [...candidate.aliases]),
  );
  // #898: the category photo tiles — a category renders only when
  // the live catalogue gives it at least two trips (the published
  // suppression rule; Luxury and Budget sit out, #903).
  const categoryTiles = [
    { key: 'ADVENTURE', name: t('categories.adventure'), photo: CATEGORY_IMAGES.adventure },
    { key: 'CULTURAL', name: t('categories.cultural'), photo: CATEGORY_IMAGES.cultural },
    { key: 'NATURE', name: t('categories.nature'), photo: CATEGORY_IMAGES.nature },
  ]
    .map((tile) => ({ ...tile, count: categoryTripCounts[tile.key] ?? 0 }))
    .filter((tile): tile is typeof tile & { photo: string } => Boolean(tile.photo) && tile.count >= 2);

  return (
    <div className="bg-background min-h-screen font-sans text-foreground overflow-hidden">
      
      {/* Hero Section — #880: compressed (vertical whitespace more
          than halved) so a cold arrival sees Morocco — and the first
          trip card peeking below — in the first screen instead of a
          claim and a form. */}
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

            {/* Founder amendment to #880 (2026-11-11): the hero's
                visual anchor is a FIXED signature photograph of a
                Moroccan place (the High Atlas — lib/static-imagery.ts;
                round 2 re-froze the asset to the proposal's own
                Milky-Way photograph after the first pick rendered
                hazy and duplicated the lead card), a static asset
                with the same treatment: not a trip, not promoted,
                no link, no trip title — the caption names the place
                only, and the alt says what it is. Prioritised as
                LCP. On mobile it stacks first: Morocco tops the
                screen. */}
            <motion.div variants={fadeInUp} className="order-first lg:order-none">
              <figure className="relative block h-44 overflow-hidden rounded-3xl shadow-xl sm:h-56 lg:h-[340px]">
                <Image
                  src={HERO_IMAGE.src}
                  alt={t('hero.photoAlt')}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                  priority
                  fetchPriority="high"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-5 pt-10 text-start">
                  <span className="flex items-center gap-1.5 font-display text-lg font-bold text-white">
                    <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" /> {t('hero.photoCaption')}
                  </span>
                </span>
              </figure>
            </motion.div>
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
                    className="h-14 lg:h-auto px-8 rounded-xl bg-deep-blue dark:bg-sunset-orange hover:bg-blue-900 dark:hover:bg-orange-600 text-white dark:text-deep-blue font-semibold text-lg shadow-md transition-all">
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

          {/* #887: the trust strip — the three verified claims,
              directly under the hero search where the click decision
              happens, instead of only at the bottom of the page.
              No beta explainer (founder de-beta directive, #917). */}
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" /> {t('trustStrip.licence')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" /> {t('trustStrip.payDirect')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" /> {t('trustStrip.cancellation')}
            </span>
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

      {/* #885: the destination section — the three cluster cities
          only. A city with no trips renders honestly empty (never
          backfilled with out-of-cluster supply). Tile photographs
          are FIXED curated assets (lib/static-imagery.ts, founder
          amendment to #898, 2026-11-11) — never borrowed from trip
          inventory; a city without a curated photo keeps the
          brand-graded tile. Photo-truth audit (council P0-1,
          2026-11-11): only Chefchaouen carries a photo — the
          round-2 Tangier/Tétouan picks depicted other places and
          were reverted to graded tiles (see static-imagery.ts). */}
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
                const photo = DESTINATION_IMAGES[slug];
                return (
                  <Link
                    key={slug}
                    href={`/search?destination=${slug}`}
                    className="group relative block min-h-[280px] overflow-hidden rounded-3xl bg-deep-blue text-white shadow-sm transition-shadow hover:shadow-xl"
                  >
                    {photo ? (
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

      {/* Round 2 (founder decision 2026-11-11, superseding #885's
          home listing): the "All trips" inventory dump is GONE —
          in its place the coverage showcase, the honest map of
          what Ouiboo HAS (destinations beyond the northern
          cluster, with live counts and from-prices) and what it
          does NOT have yet (well-known places with no trips,
          shown honestly empty). Individual trips stay reachable
          through search and the destination pages. */}
      {hasCatalogSections && (coverageDestinations.length > 0 || absentCoverage.length > 0) && (
        <section className="py-24 bg-muted/35">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl mb-12">
              <h2 className="oui-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">{t('featured.coverage.title')}</h2>
              <p className="text-lg text-muted-foreground">{t('featured.coverage.subtitle')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {coverageDestinations.map((destination) => (
                <CoverageTile key={destination.name} destination={destination} />
              ))}
              {absentCoverage.map((candidate) => (
                <AbsentCoverageTile key={candidate.slug} slug={candidate.slug} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* #898: "Travel your way" — the proposal's category PHOTO
          tiles at a fixed crop (the imageless icon cards were the
          round-2 audit's clearest deviation), each carrying a
          frozen catalogue photograph and the live trip count.
          Categories under two trips stay suppressed. */}
      {hasCatalogSections && categoryTiles.length > 0 && (
        <section className="py-24 bg-background">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="oui-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t('categories.title')}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{t('categories.subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryTiles.map((tile) => (
                <Link
                  key={tile.key}
                  href={`/search?category=${tile.key}`}
                  className="group relative block aspect-[4/3] overflow-hidden rounded-3xl bg-deep-blue text-white shadow-sm transition-shadow hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-orange focus-visible:ring-offset-2"
                >
                  <SafeImage
                    src={tile.photo}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-deep-blue/85 via-deep-blue/25 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 p-6">
                    <span className="block font-display text-[24px] font-extrabold">{tile.name}</span>
                    <span className="mt-1 block text-sm font-semibold text-white/85">
                      {t('featured.betaRegion.tripsCount', { count: tile.count })}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* The proposal's closing trust trio (P1-21): three blocks
          under ONE "Why book on Ouiboo" H2, one icon family
          (banknote / shield-check / calendar-check) in one tint —
          the round-2 audit found no H2 and mismatched icons
          (a heart for "licence", a bolt for "booking requests"). */}
      <section className="py-24 bg-background border-t border-border">
         <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
                <h2 className="oui-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t('trust.title')}</h2>
            </div>
            <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-3 lg:gap-x-8">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-ocean-500/10">
                        <Banknote className="h-8 w-8 text-ocean-600 dark:text-ocean-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{t('trust.secureTitle')}</h3>
                    <p className="mt-2 text-base text-muted-foreground max-w-xs">{t('trust.secureDescription')}</p>
                </div>
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-ocean-500/10">
                        <ShieldCheck className="h-8 w-8 text-ocean-600 dark:text-ocean-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{t('trust.verifiedTitle')}</h3>
                    <p className="mt-2 text-base text-muted-foreground max-w-xs">{t('trust.verifiedDescription')}</p>
                </div>
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-ocean-500/10">
                        <CalendarCheck className="h-8 w-8 text-ocean-600 dark:text-ocean-300" />
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

