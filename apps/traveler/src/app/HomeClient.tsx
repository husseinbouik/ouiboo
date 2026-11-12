'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  MapPin, Compass, Banknote, ShieldCheck, CalendarCheck, AlertTriangle, Check, MessageCircle, ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import { Button, EmptyState, SafeImage } from '@ouiboo/ui';
import { motion, Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BETA_DESTINATIONS } from '@ouiboo/types';
import type { TripSession, TripTemplate, VerificationStatusType } from '@ouiboo/types';
import {
  countTripsByCategory,
  curateFeaturedTrips,
  type ShowcaseDestination,
} from '@/lib/curation';
import { buildHeroSuggestions } from '@/lib/hero-suggestions';
import { HeroSearch } from '@/components/HeroSearch';
import { useDisplayPrice } from '@/lib/display-currency';
import { AGENCY_URL } from '@/lib/site';
import { CATEGORY_IMAGES, HERO_IMAGE } from '@/lib/static-imagery';

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
   * computed from the live catalogue by the server page. Retained
   * for caller compatibility — since the search-council adoption
   * (#938) the hero suggestion model derives everything from the
   * catalogue itself (lib/hero-suggestions.ts), so this prop no
   * longer feeds the UI. */
  catalogDestinations?: string[];
}

/**
 * Pure Option B (#929): the coverage showcase as a compact
 * destination INDEX — a white card with a short photo header and a
 * name + count/from-price body. A destination whose trips carry no
 * truthful photo (photo-truth audit, #898) gets the graded navy
 * header instead — never a photograph of somewhere else.
 */
function CoverageTile({ destination, href }: { destination: ShowcaseDestination; href?: string }) {
  const { t, i18n } = useTranslation();
  const displayPrice = useDisplayPrice(destination.minPrice, destination.priceCurrency, i18n.language);
  // B draws a short descriptor on its graded coverage headers
  // ("Atlas gateway", "City stop"); keyed by the folded place name,
  // absent for destinations B never drew one for.
  const descriptor = t(`featured.coverage.descriptor.${destination.name.toLowerCase().replace(/\s+/g, '')}`, { defaultValue: '' });
  return (
    <Link
      href={href ?? `/search?q=${encodeURIComponent(destination.name)}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-xl"
    >
      {destination.photo ? (
        <span className="relative block h-[104px] overflow-hidden">
          <SafeImage
            src={destination.photo}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </span>
      ) : (
        <span className="flex h-[104px] items-end bg-deep-blue p-3">
          {descriptor ? (
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-white/85">{descriptor}</span>
          ) : (
            <MapPin className="h-5 w-5 text-white/70" aria-hidden="true" />
          )}
        </span>
      )}
      <span className="block p-3 sm:p-3.5">
        <span className="block font-display text-[15px] font-bold text-foreground">{destination.name}</span>
        <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
          {t('featured.betaRegion.tripsCount', { count: destination.count })}
          {displayPrice ? (
            <> · {t('featured.from')} <span className="font-bold text-foreground">{displayPrice}</span></>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

/**
 * Search council punch item 12 (#942): the first-screen tile row's
 * honest zero — a configured place with no trips yet (Tétouan).
 * NOT a link: there is nothing to see yet, and an empty result
 * page is a dead end (#877). Its accessible name carries the state
 * in words — "Tétouan, no trips yet" — never desaturation alone;
 * the verified place photograph (#898) renders at full strength
 * with the label in the body, on solid ground.
 */
function ZeroPlaceTile({ name, photo }: { name: string; photo: string | null }) {
  const { t } = useTranslation();
  const noTripsYet = t('featured.betaRegion.noTripsYet');
  return (
    <div
      role="group"
      aria-label={`${name}, ${noTripsYet}`}
      className="block overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      {photo ? (
        <span className="relative block h-[104px] overflow-hidden">
          <SafeImage src={photo} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
        </span>
      ) : (
        <span className="flex h-[104px] items-end bg-deep-blue p-3">
          <MapPin className="h-5 w-5 text-white/70" aria-hidden="true" />
        </span>
      )}
      <span className="block p-3 sm:p-3.5">
        <span className="block font-display text-[15px] font-bold text-foreground">{name}</span>
        <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">{noTripsYet}</span>
      </span>
    </div>
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

export default function HomeClient({ catalogTrips, featuredTrips: featuredTripsProp, featuredTripsFetchFailed = false, catalogDestinations: _catalogDestinations = [] }: HomeClientProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  // #885: home composition from the catalogue. The featured rail is
  // curated under the published rule (lib/curation.ts).
  // Legacy callers passing only `featuredTrips` render that list as
  // the rail verbatim (the pre-#885 contract the tests lock).
  const allTrips = catalogTrips ?? featuredTripsProp ?? [];
  const featuredTrips = catalogTrips ? curateFeaturedTrips(catalogTrips) : allTrips;
  const categoryTripCounts = countTripsByCategory(allTrips);
  const hasCatalogSections = Boolean(catalogTrips) && !featuredTripsFetchFailed;
  // Search council (#938, punch item 12 / #942): the first-screen
  // destination tile row's rule-based set — every destination with
  // live trips (Casablanca included), cluster-first, plus the
  // configured zero-trip places — from the same local suggestion
  // model the hero pill's dropdown renders (lib/hero-suggestions),
  // so the row and the panel can never disagree. The row REPLACES
  // the below-fold destination + coverage tile sections (relocated,
  // not duplicated — that is what keeps it at +0 KB / +0 requests,
  // #894). The honestly-empty well-known places the old coverage
  // showcase carried (Agadir, Dakhla, Ifrane, Al Hoceima) are not
  // part of the rule-based set and leave the home with the section;
  // the honest-zero function is carried by Tétouan's tile here,
  // the dropdown's headed zero zone, and the search empty state.
  const heroLocalizedNames: Record<string, string> = {};
  for (const destination of BETA_DESTINATIONS) {
    heroLocalizedNames[destination.slug] = t(`search.destinationNames.${destination.slug}`);
  }
  const heroTiles = buildHeroSuggestions(allTrips, '', heroLocalizedNames);
  // #898: the category photo tiles — a category renders only when
  // the live catalogue gives it at least two trips (the published
  // suppression rule; Luxury and Budget sit out, #903).
  const categoryTiles = [
    { key: 'ADVENTURE', name: t('categories.adventure'), photo: CATEGORY_IMAGES.adventure },
    { key: 'NATURE', name: t('categories.nature'), photo: CATEGORY_IMAGES.nature },
    { key: 'CULTURAL', name: t('categories.cultural'), photo: CATEGORY_IMAGES.cultural },
  ]
    .map((tile) => ({ ...tile, count: categoryTripCounts[tile.key] ?? 0 }))
    .filter((tile): tile is typeof tile & { photo: string } => Boolean(tile.photo) && tile.count >= 2);

  return (
    <div className="bg-background min-h-screen font-sans text-foreground overflow-hidden">
      
      {/* Pure Option B (#929): the hero is B's drawn composition —
          a full-bleed static place photograph under a navy shade
          (the founder-settled Atlas asset, #880), the settled
          headline in the shipped display type, and the search card
          overlapping the fold. The functional search form — live
          suggestions, Add-dates, validation (#723/#877) — is
          unchanged in behaviour; only its housing is B's. */}
      <div className="relative isolate bg-deep-blue">
        <Image
          src={HERO_IMAGE.src}
          alt={t('hero.photoAlt')}
          fill
          sizes="100vw"
          className="object-cover opacity-90"
          priority
          fetchPriority="high"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-deep-blue/85 via-deep-blue/55 to-deep-blue/15" />
        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-28 sm:pt-28 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-[680px] text-start"
          >
            {/* Claims lock (council P0-3, carried into #929): the
                check claim always renders in full — B's drawn
                compressed kicker ("Checked agencies") ships with
                the full wording, its accent in the text-safe
                orange-dark of the P0-2 contrast rule. */}
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-deep-blue">
              {t('hero.kickerTrips')} <span className="text-sunset-orange-dark">· {t('hero.kickerChecked')}</span>
            </motion.div>
            <motion.h1 variants={fadeInUp} className="mt-4 text-[42px] font-bold leading-[1.02] tracking-tight text-white sm:text-[50px]">
              {t('hero.titleStart')} {t('hero.titleAccent')}{t('hero.titleEnd')}
            </motion.h1>
            <motion.p variants={fadeInUp} className="mt-3 max-w-[540px] text-base font-medium leading-relaxed text-white/85">
              {t('hero.subtitle')}
            </motion.p>
            <motion.div variants={fadeInUp} className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-white/75">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {t('hero.metaPrices')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {t('hero.metaPayDirect')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {t('hero.photoCaption')}
              </span>
            </motion.div>
          </motion.div>
          {/* The caption names the place only — the photograph is a
              place, not a trip (#880). Hidden on mobile, as drawn. */}
          <span className="absolute end-6 bottom-24 hidden rounded-full bg-deep-blue/60 px-2.5 py-1 text-[11px] font-semibold text-white/90 sm:block lg:end-8">
            {t('hero.photoCaption')}
          </span>
        </div>
      </div>

      {/* The search zone overlaps the hero fold (B's defining
          geometry). Search council (#938): the zone now carries
          the "One Line" pill (components/HeroSearch — its own
          component, no framer-motion on this path, #894 item 7)
          and, immediately below it and before the USP strip, the
          first-screen destination tile row (#942) — the rule-based
          set from lib/hero-suggestions, RELOCATING the below-fold
          destination + coverage tile sections, which are removed
          below: same tiles, same renditions, shown once. The
          Popular chips are subsumed by the tiles. */}
      <div className="relative z-10 mx-auto -mt-16 max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <HeroSearch trips={allTrips} />
        </div>

        {hasCatalogSections && (heroTiles.destinations.length > 0 || heroTiles.zeroPlaces.length > 0) && (
          <div
            className="mx-auto mt-4 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            data-testid="home-destination-tiles"
          >
            {heroTiles.destinations.map((destination) => (
              <CoverageTile
                key={destination.slug ?? destination.name}
                destination={destination}
                href={destination.href}
              />
            ))}
            {heroTiles.zeroPlaces.map((place) => (
              <ZeroPlaceTile key={place.slug} name={place.name} photo={place.photo} />
            ))}
          </div>
        )}

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mx-auto mt-4 grid max-w-4xl gap-px overflow-hidden rounded-2xl border border-border bg-border/60 sm:grid-cols-3"
        >
          <div className="flex gap-3 bg-paper p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ocean-600 dark:text-ocean-300" aria-hidden="true" />
            <div>
              <p className="text-[13px] font-bold text-foreground">{t('usp.checkedTitle')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('usp.checkedText')}</p>
            </div>
          </div>
          <div className="flex gap-3 bg-paper p-4">
            <Banknote className="mt-0.5 h-5 w-5 shrink-0 text-ocean-600 dark:text-ocean-300" aria-hidden="true" />
            <div>
              <p className="text-[13px] font-bold text-foreground">{t('usp.payTitle')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('usp.payText')}</p>
            </div>
          </div>
          <div className="flex gap-3 bg-paper p-4">
            <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-ocean-600 dark:text-ocean-300" aria-hidden="true" />
            <div>
              <p className="text-[13px] font-bold text-foreground">{t('usp.pricesTitle')}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('usp.pricesText')}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Featured Trips Section — #880: tightened so the first card
          row peeks into the first screen below the compressed hero. */}
      <section className="py-10 sm:py-12 bg-background relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
            <div className="max-w-2xl">
              <h2 className="oui-balance text-[26px] font-bold tracking-tight text-foreground sm:text-3xl mb-2">{t('featured.title')}</h2>
              <p className="text-[15px] text-muted-foreground">{t('featured.subtitle')}</p>
            </div>
            {/* Pure B (#929): "View all trips" is restored beside
                the rail — B draws a section link here (its deletion
                was a Hybrid borrow, not a veto). The curation line
                itself is B's single subline above (#885's rule is
                unchanged in code). */}
            <Link href="/search" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-extrabold text-foreground transition-colors hover:text-sunset-orange-dark">
              {t('featured.viewAll')} <ArrowRight className={`h-4 w-4 ${i18n.language === 'ar' ? 'rotate-180' : ''}`} aria-hidden="true" />
            </Link>
          </div>

          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
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

      {/* #898, in B's proportions (#929): "Travel your way" —
          category PHOTO tiles (Adventure wide, then Nature,
          Cultural, as drawn), each carrying a frozen catalogue
          photograph, B's short descriptor and the live trip count
          in the bottom bar. Categories under two trips stay
          suppressed (#903). */}
      {hasCatalogSections && categoryTiles.length > 0 && (
        <section className="py-10 sm:py-12 bg-background">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl mb-6">
              <h2 className="oui-balance text-[26px] font-bold tracking-tight text-foreground sm:text-3xl mb-2">{t('categories.title')}</h2>
              <p className="text-[15px] text-muted-foreground">{t('categories.subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] gap-5">
              {categoryTiles.map((tile) => (
                <Link
                  key={tile.key}
                  href={`/search?category=${tile.key}`}
                  className="group relative block h-48 overflow-hidden rounded-3xl bg-deep-blue text-white shadow-sm transition-shadow hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-orange focus-visible:ring-offset-2 sm:h-[190px]"
                >
                  <SafeImage
                    src={tile.photo}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-deep-blue/90 via-deep-blue/40 to-transparent" aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                    <span>
                      <span className="block font-display text-[22px] font-extrabold">{tile.name}</span>
                      <span className="mt-0.5 block text-xs font-medium text-white/85">{t(`categories.blurb.${tile.key.toLowerCase()}`)}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-[11px] font-extrabold text-foreground shadow">
                      {t('featured.betaRegion.tripsCount', { count: tile.count })}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pure B (#929): "How Ouiboo works" — B draws the three
          steps the Hybrid home never carried, as one bordered
          panel, with the min-group refund sentence under it in its
          bare form only (Trust veto: no leader line, no widened
          promise). The numbered circles take navy numerals on the
          brand orange (P0-2: white on #FF6B35 measures 2.84:1). */}
      <section className="py-10 sm:py-12 bg-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl mb-6">
            <h2 className="oui-balance text-[26px] font-bold tracking-tight text-foreground sm:text-3xl mb-2">{t('howItWorks.title')}</h2>
            <p className="text-[15px] text-muted-foreground">{t('howItWorks.subtitle')}</p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border/60 md:grid-cols-3">
            {(['step1', 'step2', 'step3'] as const).map((step, index) => (
              <div key={step} className="bg-card p-5">
                <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-sunset-orange font-display text-[13px] font-bold text-deep-blue">{index + 1}</span>
                <h3 className="text-[15px] font-bold text-foreground">{t(`howItWorks.${step}Title`)}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{t(`howItWorks.${step}Text`)}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-[13px] font-medium text-foreground dark:border-orange-900/50 dark:bg-orange-950/30">
            <ShieldCheck className="h-[18px] w-[18px] shrink-0 text-sunset-orange-dark" aria-hidden="true" />
            {t('howItWorks.refundNote')}
          </p>
        </div>
      </section>

      {/* "Why book on Ouiboo" (P1-21), in B's form (#929): three
          paper cards, one icon family (banknote / shield-check /
          calendar-check) in navy chips, B's short truthful lines.
          The dated what+when verification statements live on the
          cards and agency pages (#673), not here. */}
      <section className="py-10 sm:py-12 bg-background">
         <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl mb-6">
                <h2 className="oui-balance text-[26px] font-bold tracking-tight text-foreground sm:text-3xl">{t('trust.title')}</h2>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-paper p-5">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-deep-blue text-white">
                        <Banknote className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-[15px] font-bold text-foreground">{t('trust.secureTitle')}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{t('trust.secureDescription')}</p>
                </div>
                <div className="rounded-2xl border border-border bg-paper p-5">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-deep-blue text-white">
                        <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-[15px] font-bold text-foreground">{t('trust.verifiedTitle')}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{t('trust.verifiedDescription')}</p>
                </div>
                <div className="rounded-2xl border border-border bg-paper p-5">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-deep-blue text-white">
                        <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-[15px] font-bold text-foreground">{t('trust.instantTitle')}</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{t('trust.instantDescription')}</p>
                </div>
            </div>
         </div>
      </section>

      {/* Pure B (#929, #903): the agency band in B's drawn form —
          left-aligned text, "List your trips" (agency sign-up) as
          the solid primary and WhatsApp as the outline secondary
          (the Hybrid had WhatsApp primary with a quiet link). Fee
          silence: no fee line appears here at all — the vetoed
          "No listing fee to start" never ships in any direction. */}
      <section className="bg-deep-blue py-10 text-white sm:py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <h2 className="oui-balance text-[26px] font-bold tracking-tight sm:text-3xl">{t('agencyBand.title')}</h2>
            <p className="mt-2 text-[15px] text-white/80">{t('agencyBand.relationship')}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center shrink-0">
            <a
              href={`${AGENCY_URL}/signup`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-sunset-orange px-5 py-2.5 text-sm font-extrabold text-deep-blue shadow-md transition-colors hover:bg-sunset-orange-dark hover:text-white"
            >
              {t('agencyBand.ctaSignup')}
            </a>
            <a
              href={`https://wa.me/212632718980?text=${encodeURIComponent(t('agencyBand.whatsappMessage'))}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/50 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('agencyBand.ctaWhatsapp')}
            </a>
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

