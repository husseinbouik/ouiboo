'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  MapPin, Calendar, Star, ArrowRight, Compass, Shield, Zap, Heart, Mountain, Palmtree
} from 'lucide-react';
import { Button } from '@ouiboo/ui';
import { motion, Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { TripSession, TripTemplate, VerificationStatusType } from '@ouiboo/types';

const TripCard = dynamic(() => import('@/components/TripCard').then((m) => m.TripCard));

interface HomeClientProps {
  featuredTrips: Array<TripTemplate & {
    sessions?: TripSession[];
    agency?: {
      verificationStatus?: VerificationStatusType;
    } | null;
  }>;
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

export default function HomeClient({ featuredTrips }: HomeClientProps) {
  const { t, i18n } = useTranslation();
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
                <span className="rounded-full bg-sunset-orange/10 px-3 py-1 text-sm font-semibold text-sunset-orange ring-1 ring-inset ring-sunset-orange/20">
                    {t('hero.tagline')}
                </span>
            </motion.div>
            
            <motion.h1 variants={fadeInUp} className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl mb-6">
              {t('hero.title', 'Find your perfect')} <span className="text-sunset-orange">{t('hero.accent', 'Adventure')}</span>
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              {t('hero.subtitle', 'Connect with local experts to plan trips that are as unique as you are.')}
            </motion.p>

            {/* Clean Search Bar */}
            <motion.div variants={fadeInUp} className="mt-10 mx-auto max-w-3xl">
              <div className="bg-card p-2 rounded-2xl shadow-xl border border-border flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center px-4 py-3 bg-muted/55 rounded-xl border border-transparent focus-within:bg-background focus-within:border-border transition-all">
                  <MapPin className="h-5 w-5 text-sunset-orange mr-3" />
                  <input 
                    type="text" 
                    aria-label={t('hero.where')}
                    placeholder={t('hero.where')}
                    className="bg-transparent border-none focus:outline-none text-foreground w-full placeholder:text-muted-foreground font-medium"
                  />
                </div>
                <div className="flex-1 flex items-center px-4 py-3 bg-muted/55 rounded-xl border border-transparent focus-within:bg-background focus-within:border-border transition-all">
                  <Calendar className="h-5 w-5 text-sunset-orange mr-3" />
                  <input 
                    type="text" 
                    aria-label={t('hero.when')}
                    placeholder={t('hero.when')}
                    className="bg-transparent border-none focus:outline-none text-foreground w-full placeholder:text-muted-foreground font-medium"
                  />
                </div>
                <Button className="h-14 sm:h-auto px-8 rounded-xl bg-deep-blue dark:bg-sunset-orange hover:bg-blue-900 dark:hover:bg-orange-600 text-white font-semibold text-lg shadow-md transition-all">
                  {t('hero.search', 'Search')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Featured Trips Section */}
      <section className="py-24 sm:py-32 bg-background relative">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-4">{t('featured.title')}</h2>
              <p className="text-lg text-muted-foreground">{t('featured.subtitle')}</p>
            </div>
            <Link href="/search" className="text-sunset-orange font-semibold hover:text-orange-600 flex items-center gap-2 transition-colors">
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
            {featuredTrips.length > 0 ? (
              featuredTrips.map((trip) => (
                <motion.div key={trip.id} variants={fadeInUp}>
                  <TripCard trip={trip} />
                </motion.div>
              ))
            ) : (
                <div className="col-span-full py-20 text-center bg-card/70 rounded-3xl border border-dashed border-border">
                    <div className="mx-auto h-12 w-12 text-muted-foreground">
                        <Compass className="h-full w-full" />
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-foreground">{t('featured.emptyTitle')}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t('featured.emptySubtitle')}</p>
                </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Travel Styles / Categories */}
      <section className="py-24 bg-muted/35">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t('categories.title')}</h2>
                <p className="mt-4 text-lg text-muted-foreground">{t('categories.subtitle')}</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {travelStyles.map((style) => (
                    <motion.div 
                        key={style.key}
                        whileHover={{ y: -5 }}
                        className="bg-card p-8 rounded-3xl shadow-sm border border-border hover:shadow-md transition-all cursor-pointer group"
                    >
                        <div className={`w-14 h-14 rounded-2xl ${style.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                            <style.Icon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">{style.name}</h3>
                        <p className="text-sm text-muted-foreground">{t('categories.discoverTrips')}</p>
                    </motion.div>
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
                        <Shield className="h-8 w-8 text-ocean-600 dark:text-ocean-300" />
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
      
      {/* Footer */}
      <footer className="bg-background border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-deep-blue dark:bg-sunset-orange text-white flex items-center justify-center font-bold">O</div>
                <span className="font-bold text-xl text-deep-blue dark:text-foreground">Ouiboo</span>
            </div>
            <div className="text-sm text-muted-foreground">
                {t('footer.rights', { year: new Date().getFullYear() })}
            </div>
        </div>
      </footer>

    </div>
  );
}

