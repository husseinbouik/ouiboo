'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  MapPin, Calendar, Star, ArrowRight, Compass, Banknote, Zap, Heart, Mountain, Palmtree, AlertTriangle
} from 'lucide-react';
import { Button, EmptyState } from '@ouiboo/ui';
import { motion, Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BETA_DESTINATIONS } from '@ouiboo/types';
import type { TripSession, TripTemplate, VerificationStatusType } from '@ouiboo/types';
import { buildHeroSearchParams, isInvalidDateRange } from '@/lib/hero-search';

const TripCard = dynamic(() => import('@/components/TripCard').then((m) => m.TripCard));

interface HomeClientProps {
  featuredTrips: Array<TripTemplate & {
    sessions?: TripSession[];
    agency?: {
      verificationStatus?: VerificationStatusType;
    } | null;
  }>;
  /** #575: true when the server catalogue fetch failed — render the
   * error state, never the genuine-empty state, for an outage. */
  featuredTripsFetchFailed?: boolean;
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

export default function HomeClient({ featuredTrips, featuredTripsFetchFailed = false }: HomeClientProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  const [searchDateTo, setSearchDateTo] = useState('');
  const [dateError, setDateError] = useState('');
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
  const travelStyles = [
    { key: 'adventure', name: t('categories.adventure'), Icon: Mountain, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
    { key: 'cultural', name: t('categories.cultural'), Icon: Compass, color: 'bg-blue-100 text-ocean-600 dark:text-ocean-300 dark:bg-blue-900/30 dark:text-blue-400' },
    { key: 'luxury', name: t('categories.luxury'), Icon: Star, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
    { key: 'nature', name: t('categories.nature'), Icon: Palmtree, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  ];

  return (
    <div className="bg-background min-h-screen font-sans text-foreground overflow-hidden">
      
      {/* Hero Section */}
      <div className="relative isolate pt-32 pb-20 sm:pt-40 sm:pb-24">
        {/* Background Blob */}
        <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 opacity-20 dark:opacity-10">
          <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-sunset-orange sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={staggerContainer} 
            className="mx-auto max-w-4xl text-center"
          >
            <motion.div variants={fadeInUp} className="mb-6 flex justify-center">
                <span className="rounded-full bg-sunset-orange/10 px-3 py-1 text-sm font-semibold text-sunset-orange-dark ring-1 ring-inset ring-sunset-orange/20">
                    {t('hero.tagline')}
                </span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl mb-6">
              {t('hero.title', 'Find your perfect')} <span className="text-sunset-orange-dark">{t('hero.accent', 'Adventure')}</span>
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              {t('hero.subtitle', 'Connect with local experts to plan trips that are as unique as you are.')}
            </motion.p>

            {/* Clean Search Bar — #723: a semantic form, so the button
                AND Enter in any field submit the same search. The
                destination suggestions are the #675 beta destinations
                (localised names); picking or typing one submits the
                `destination` facet, other text submits as `q`. */}
            <motion.div variants={fadeInUp} className="mt-10 mx-auto max-w-3xl">
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
                      {BETA_DESTINATIONS.map((destination) => (
                        <option
                          key={destination.slug}
                          value={t(`search.destinationNames.${destination.slug}`)}
                        />
                      ))}
                    </datalist>
                  </div>
                  <div className="flex-1 flex items-center px-4 py-3 bg-muted/55 rounded-xl border border-transparent focus-within:bg-background focus-within:border-border transition-all">
                    <Calendar className="h-5 w-5 text-sunset-orange me-3 shrink-0" />
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
                  </div>
                  <div className="flex-1 flex items-center px-4 py-3 bg-muted/55 rounded-xl border border-transparent focus-within:bg-background focus-within:border-border transition-all">
                    <Calendar className="h-5 w-5 text-sunset-orange me-3 shrink-0" />
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
                  </div>
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

      {/* Featured Trips Section */}
      <section className="py-24 sm:py-32 bg-background relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="oui-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">{t('featured.title')}</h2>
              <p className="text-lg text-muted-foreground">{t('featured.subtitle')}</p>
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

