'use client'

import { useState, useEffect, useRef } from 'react'
import { Bars3Icon, XMarkIcon, GlobeAltIcon, BuildingOffice2Icon, CheckCircleIcon, SparklesIcon, ChartBarIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { motion, useScroll, useTransform, useInView, animate, Variants } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Dialog } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import { Logo, ThemeToggle, LanguageSwitcher } from '@ouiboo/ui'
import { CookiePreferencesButton } from './AnalyticsConsent'

const PricingSection = dynamic(() => import('./PricingSection'));
const WaitlistSection = dynamic(() => import('./WaitlistSection'));

// --- Helper Components & Types ---

type CounterProps = {
  from: number;
  to: number;
  duration?: number;
};

function Counter({ from, to, duration = 2 }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const controls = animate(from, to, {
        duration: duration,
        onUpdate(value) {
          if (ref.current) {
            ref.current.textContent = Math.round(value).toLocaleString();
          }
        }
      });
      return () => controls.stop();
    }
  }, [isInView, from, to, duration]);

  return <span ref={ref} />;
}


// --- Main Landing Page Component ---

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const isRTL = currentLang === 'ar';
  const travelerUrl = process.env.NEXT_PUBLIC_TRAVELER_URL || 'http://localhost:3001';
  const agencyUrl = process.env.NEXT_PUBLIC_AGENCY_URL || 'http://localhost:3002';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  // --- Scroll detection for navbar ---
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Smooth scroll behavior ---
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  // --- Animation Hooks & Variants ---
  const { scrollYProgress } = useScroll();
  const heroImageScale = useTransform(scrollYProgress, [0, 0.2], [1.05, 0.9]);
  const heroImageRotate = useTransform(scrollYProgress, [0, 0.2], [0, -3]);

  const refTravelerImage = useRef(null);
  const { scrollYProgress: scrollYTraveler } = useScroll({ target: refTravelerImage, offset: ["start end", "end start"] });
  const parallaxTraveler = useTransform(scrollYTraveler, [0, 1], ['-15%', '15%']);

  const refAgencyImage = useRef(null);
  const { scrollYProgress: scrollYAgency } = useScroll({ target: refAgencyImage, offset: ["start end", "end start"] });
  const parallaxAgency = useTransform(scrollYAgency, [0, 1], ['-15%', '15%']);

  // --- Data & Content (Now managed by i18n) ---
  const navigation = [
    { name: t('nav.howItWorks'), href: '#how-it-works' },
    { name: t('nav.forTravelers'), href: '#travelers' },
    { name: t('nav.forAgencies'), href: '#agencies' },
    { name: t('nav.pricing'), href: '#pricing' },
  ];

  const howItWorksSteps = [
    { number: '01', name: t('howItWorks.step1.title'), description: t('howItWorks.step1.description') },
    { number: '02', name: t('howItWorks.step2.title'), description: t('howItWorks.step2.description') },
    { number: '03', name: t('howItWorks.step3.title'), description: t('howItWorks.step3.description') },
  ];

  const travelerFeatures = [
      { name: t('travelers.feature1.title'), description: t('travelers.feature1.description'), icon: GlobeAltIcon },
      { name: t('travelers.feature2.title'), description: t('travelers.feature2.description'), icon: CheckCircleIcon },
      { name: t('travelers.feature3.title'), description: t('travelers.feature3.description'), icon: SparklesIcon },
  ];

  const agencyFeatures = [
      { name: t('agencies.feature1.title'), description: t('agencies.feature1.description'), icon: BuildingOffice2Icon },
      { name: t('agencies.feature2.title'), description: t('agencies.feature2.description'), icon: ChartBarIcon },
      { name: t('agencies.feature3.title'), description: t('agencies.feature3.description'), icon: UserGroupIcon },
  ];

  const productPrinciples = [
      { title: t('principles.item1.title'), description: t('principles.item1.description'), icon: CheckCircleIcon },
      { title: t('principles.item2.title'), description: t('principles.item2.description'), icon: UserGroupIcon },
      { title: t('principles.item3.title'), description: t('principles.item3.description'), icon: SparklesIcon },
  ];

  const highlights = [
    { name: t('highlights.curated.title'), description: t('highlights.curated.description') },
    { name: t('highlights.payments.title'), description: t('highlights.payments.description') },
    { name: t('highlights.growth.title'), description: t('highlights.growth.description') },
  ];

  const stats = [
    { value: 3, suffix: '', label: t('stats.items.languages') },
    { value: 3, suffix: '', label: t('stats.items.workspaces') },
    { value: 1, suffix: '', label: t('stats.items.bookingFlow') },
  ];


  useEffect(() => {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [currentLang, isRTL]);

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.7, 
        ease: [0.25, 0.46, 0.45, 0.94],
        staggerChildren: 0.1
      } 
    }
  };

  const staggerContainer: Variants = {
    hidden: {},
    visible: { 
      transition: { 
        staggerChildren: 0.2,
        delayChildren: 0.1
      } 
    }
  };

  const slideInLeft: Variants = {
    hidden: { opacity: 0, x: -60 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { 
        duration: 0.8, 
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  }

  const slideInRight: Variants = {
    hidden: { opacity: 0, x: 60 },
    visible: { 
      opacity: 1, 
      x: 0, 
      transition: { 
        duration: 0.8, 
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  }

  const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      transition: { 
        duration: 0.6, 
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  }

  return (
    <div className="bg-off-white text-deep-blue font-sans">
      {/* Header - Fixed with scroll effect */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-lg' 
            : 'bg-transparent'
        }`}
      >
        <nav aria-label={t('common.globalNavigationLabel')} className="flex items-center justify-between p-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex lg:flex-1">
            <a href="#" className="-m-1.5 p-1.5 flex items-center gap-2">
              <Logo />
              <span className="font-bold text-xl tracking-tight">Ouiboo</span>
            </a>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">{t('common.openMainMenu')}</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map((item) => (
              <a 
                key={item.name} 
                href={item.href} 
                className="text-sm font-semibold leading-6 hover:text-sunset-orange transition-all duration-300 relative group"
              >
                {item.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-sunset-orange group-hover:w-full transition-all duration-300 ease-out"></span>
              </a>
            ))}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end items-center gap-x-4">
            <div className="flex items-center gap-1 rounded-full p-1 ring-1 ring-gray-900/10 bg-white/60 backdrop-blur-sm dark:bg-slate-800/60 dark:ring-white/10">
              <LanguageSwitcher isTransparent={!isScrolled} />
              <ThemeToggle isTransparent={!isScrolled} />
            </div>
            <div className="flex items-center gap-x-4">
              <a href={`${travelerUrl}/login?lang=${currentLang}`} className="text-sm font-semibold leading-6 text-deep-blue hover:text-sunset-orange transition-colors">
                {t('nav.travelerLogin')}
              </a>
              <a href={`${agencyUrl}/login?lang=${currentLang}`} className="rounded-md bg-sunset-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-90 transition-transform hover:scale-105">
                {t('nav.agencyLogin')}
              </a>
            </div>
          </div>
        </nav>
        
        {/* Mobile Menu Dialog */}
        <Dialog as="div" className="lg:hidden" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
          <div className="fixed inset-0 z-50" />
          <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <a href="#" className="-m-1.5 p-1.5 flex items-center gap-2">
                <Logo />
                <span className="font-bold text-xl tracking-tight">Ouiboo</span>
              </a>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">{t('common.closeMenu')}</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  ))}
                </div>
                <div className="py-6 space-y-4">
                  <div className="flex items-center gap-1 rounded-full p-1 ring-1 ring-gray-900/10 bg-gray-50">
                    <LanguageSwitcher />
                    <ThemeToggle />
                  </div>
                  <a
                    href={`${travelerUrl}/login?lang=${currentLang}`}
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    {t('nav.travelerLogin')}
                  </a>
                  <a
                    href={`${agencyUrl}/login?lang=${currentLang}`}
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    {t('nav.agencyLogin')}
                  </a>
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </Dialog>
      </motion.header>

      {/* Hero Section */}
      <main id="main-content" tabIndex={-1} className="isolate">
        <div className="relative pt-24 sm:pt-32 overflow-hidden">
            <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
                <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-sunset-orange opacity-10 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
            </div>
            <div className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <motion.div 
                      variants={staggerContainer} 
                      initial="hidden" 
                      animate="visible" 
                      className="mx-auto max-w-3xl text-center"
                    >
                        <motion.h1 
                          variants={fadeInUp} 
                          className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl text-deep-blue leading-tight"
                        >
                          <span className="mx-auto mb-4 inline-flex w-fit items-center justify-center rounded-full bg-sunset-orange/10 px-4 py-1 text-sm font-semibold uppercase tracking-widest text-sunset-orange">
                            {t('hero.badge')}
                          </span>
                          <span className="block">{t('hero.title')}</span>
                        </motion.h1>
                        <motion.p 
                          variants={fadeInUp} 
                          className="mt-6 text-lg sm:text-xl leading-8 text-gray-600 max-w-2xl mx-auto"
                        >
                          {t('hero.subtitle')}
                        </motion.p>
                        <motion.div 
                          variants={fadeInUp} 
                          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-x-6 gap-y-4"
                        >
                            <motion.a 
                              href="#waitlist" 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="rounded-md bg-sunset-orange px-6 py-3.5 text-base font-semibold text-white shadow-md hover:shadow-lg hover:bg-orange-600 transition-all duration-300"
                            >
                                {t('hero.ctaPrimary')}
                            </motion.a>
                            <motion.a 
                              href={`${travelerUrl}/search?lang=${currentLang}`} 
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              className="rounded-md border border-deep-blue/20 px-6 py-3 text-base font-semibold text-deep-blue shadow-sm hover:border-sunset-orange hover:text-sunset-orange transition-all duration-300"
                            >
                                {t('hero.ctaSecondary')}
                            </motion.a>
                            <motion.a 
                              href="#how-it-works" 
                              whileHover={{ x: 5 }}
                              className="text-sm font-semibold leading-6 group text-deep-blue hover:text-sunset-orange transition-colors duration-300"
                            >
                                {t('hero.ctaTertiary')} <span aria-hidden="true" className="transition-transform group-hover:translate-x-1 inline-block">→</span>
                            </motion.a>
                        </motion.div>
                    </motion.div>
                    <motion.div style={{ scale: heroImageScale, rotate: heroImageRotate }} className="mt-16 flow-root sm:mt-24">
                        <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                            <Image src="/dashboard-hero.webp" alt={t('common.dashboardImageAlt')} width={1024} height={1024} priority className="rounded-md shadow-2xl ring-1 ring-gray-900/10"/>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} className="mx-auto max-w-3xl text-center">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-sunset-orange">{t('trusted.title')}</h2>
            <p className="mt-3 text-2xl font-bold text-deep-blue sm:text-3xl">{t('trusted.subtitle')}</p>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 text-center sm:grid-cols-4">
            {[t('trusted.item1'), t('trusted.item2'), t('trusted.item3'), t('trusted.item4')].map((capability) => (
              <motion.div key={capability} variants={scaleIn} className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-500 shadow-sm">
                {capability}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-off-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-deep-blue sm:text-4xl">{t('highlights.title')}</h2>
            <p className="mt-4 text-lg text-gray-600">{t('highlights.subtitle')}</p>
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
            {highlights.map((highlight) => (
              <motion.div key={highlight.name} variants={scaleIn} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <h3 className="text-lg font-semibold text-deep-blue">{highlight.name}</h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">{highlight.description}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-6 text-center sm:grid-cols-3">
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={scaleIn} className="rounded-2xl bg-white px-6 py-8 shadow-sm ring-1 ring-gray-200">
                <div className="text-3xl font-bold text-deep-blue sm:text-4xl">
                  <Counter from={0} to={stat.value} />{stat.suffix}
                </div>
                <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.5 }} className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-sunset-orange uppercase tracking-wide">{t('howItWorks.preTitle')}</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-deep-blue sm:text-4xl">{t('howItWorks.title')}</p>
            <p className="mt-6 text-lg leading-8 text-gray-600">{t('howItWorks.subtitle')}</p>
          </motion.div>
          <motion.div 
            variants={staggerContainer} 
            initial="hidden" 
            whileInView="visible" 
            viewport={{ once: true, amount: 0.2 }} 
            className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-center sm:grid-cols-2 lg:grid-cols-3 lg:max-w-7xl"
          >
            {howItWorksSteps.map((step, index) => (
              <motion.div 
                key={step.name} 
                variants={scaleIn}
                whileHover={{ scale: 1.05, y: -5 }}
                className="flex flex-col items-center p-8 rounded-2xl transition-all duration-300 hover:shadow-xl hover:bg-white cursor-pointer border border-gray-200 hover:border-sunset-orange/30"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2, type: "spring", stiffness: 200 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-deep-blue text-white font-bold text-lg shadow-md"
                >
                  {step.number}
                </motion.div>
                <h3 className="mt-6 text-lg font-semibold text-deep-blue">{step.name}</h3>
                <p className="mt-3 text-base leading-7 text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits for Travelers Section */}
      <section id="travelers" className="overflow-hidden bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center">
            <motion.div 
                variants={isRTL ? slideInRight : slideInLeft} 
                initial="hidden" 
                whileInView="visible" 
                viewport={{ once: true }} 
                className="lg:pr-8 lg:pt-4"
              >
                <div className="lg:max-w-lg">
                  <h2 className="text-base font-semibold leading-7 text-sunset-orange uppercase tracking-wide">{t('travelers.preTitle')}</h2>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-deep-blue sm:text-4xl">{t('travelers.title')}</p>
                  <p className="mt-6 text-lg leading-8 text-gray-600">{t('travelers.subtitle')}</p>
                  <motion.dl variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 max-w-xl space-y-6 text-base leading-7 text-gray-600 lg:max-w-none">
                    {travelerFeatures.map((feature) => (
                      <motion.div 
                        key={feature.name} 
                        variants={fadeInUp}
                        className="relative pl-9 transition-all duration-300 hover:bg-gray-50 p-4 rounded-lg -ml-3"
                      >
                        <dt className="inline font-semibold text-deep-blue">
                          <feature.icon className="absolute left-1 top-1 h-6 w-6 text-sunset-orange transition-colors duration-300" aria-hidden="true" />
                          {feature.name}
                        </dt>{' '}
                        <dd className="inline text-gray-600">{feature.description}</dd>
                      </motion.div>
                    ))}
                  </motion.dl>
                  <motion.div 
                    variants={fadeInUp}
                    className="mt-10 flex items-center gap-x-6"
                  >
                    <a
                      href={`${travelerUrl}/signup?lang=${currentLang}`}
                      className="rounded-md bg-sunset-orange px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-orange-600 transition-all duration-300 hover:scale-105"
                    >
                      {t('travelers.cta.getStarted')}
                    </a>
                    <a
                      href={`${travelerUrl}/login?lang=${currentLang}`}
                      className="text-sm font-semibold leading-6 text-deep-blue hover:text-sunset-orange transition-colors"
                    >
                      {t('travelers.cta.alreadyMember')} <span aria-hidden="true">→</span>
                    </a>
                  </motion.div>
                </div>
              </motion.div>
              <div ref={refTravelerImage} className="w-full h-[30rem] sm:h-[40rem] overflow-hidden rounded-xl shadow-xl">
                <motion.img style={{ y: parallaxTraveler }} src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop" alt={t('common.travelerImageAlt')} className="w-full h-full object-cover"/>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits for Agencies Section */}
        <section id="agencies" className="overflow-hidden py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center">
              <motion.div 
                variants={isRTL ? slideInLeft : slideInRight}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }} 
                className="lg:ml-auto lg:pl-4 lg:pt-4 lg:order-last"
              >
                <div className="lg:max-w-lg">
                  <h2 className="text-base font-semibold leading-7 text-deep-blue uppercase tracking-wide">{t('agencies.preTitle')}</h2>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-deep-blue sm:text-4xl">{t('agencies.title')}</p>
                  <p className="mt-6 text-lg leading-8 text-gray-600">{t('agencies.subtitle')}</p>
                  <motion.dl variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 max-w-xl space-y-6 text-base leading-7 text-gray-600 lg:max-w-none">
                    {agencyFeatures.map((feature) => (
                      <motion.div 
                        key={feature.name} 
                        variants={fadeInUp}
                        className="relative pl-9 transition-all duration-300 hover:bg-gray-50 p-4 rounded-lg -ml-3"
                      >
                        <dt className="inline font-semibold text-deep-blue">
                          <feature.icon className="absolute left-1 top-1 h-6 w-6 text-deep-blue transition-transform duration-300 group-hover:scale-110 group-hover:text-sunset-orange" aria-hidden="true" />
                          {feature.name}
                        </dt>{' '}
                        <dd className="inline text-gray-600">{feature.description}</dd>
                      </motion.div>
                    ))}
                  </motion.dl>
                  <motion.div 
                    variants={fadeInUp}
                    className="mt-10 flex items-center gap-x-6"
                  >
                    <a
                      href={`${agencyUrl}/signup?lang=${currentLang}`}
                      className="rounded-md bg-deep-blue px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-900 transition-all duration-300 hover:scale-105"
                    >
                      {t('agencies.cta.registerAgency')}
                    </a>
                    <a
                      href={`${agencyUrl}/login?lang=${currentLang}`}
                      className="text-sm font-semibold leading-6 text-deep-blue hover:text-blue-700 transition-colors"
                    >
                      {t('agencies.cta.alreadyPartner')} <span aria-hidden="true">→</span>
                    </a>
                  </motion.div>
                </div>
              </motion.div>
              <div ref={refAgencyImage} className="lg:order-first w-full h-[30rem] sm:h-[40rem] overflow-hidden rounded-xl shadow-xl">
                <motion.img style={{ y: parallaxAgency }} src="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=2070&auto=format&fit=crop" alt={t('common.agencyImageAlt')} className="w-full h-full object-cover"/>
              </div>
            </div>
          </div>
        </section>
        
        {/* Product principles — factual launch commitments, not unverified testimonials. */}
        <section id="principles" className="bg-white py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.5 }}
                    className="mx-auto max-w-2xl lg:text-center"
                >
                    <h2 className="text-base font-semibold leading-7 text-sunset-orange uppercase tracking-wide">{t('principles.preTitle')}</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-deep-blue sm:text-4xl">{t('principles.title')}</p>
                </motion.div>
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-5xl lg:grid-cols-3"
                >
                    {productPrinciples.map((principle) => (
                        <motion.article
                            key={principle.title}
                            variants={scaleIn}
                            whileHover={{ scale: 1.03, y: -5 }}
                            className="flex flex-col justify-between rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200 transition-all duration-300 hover:shadow-lg hover:ring-sunset-orange/20"
                        >
                            <principle.icon className="h-10 w-10 text-sunset-orange" aria-hidden="true" />
                            <h3 className="mt-6 text-lg font-semibold text-deep-blue">{principle.title}</h3>
                            <p className="mt-3 text-base leading-7 text-gray-600">{principle.description}</p>
                        </motion.article>
                    ))}
                </motion.div>
            </div>
        </section>

        {/* --- PRICING SECTION --- */}
        <PricingSection />

        {/* Waitlist Section */}
        <WaitlistSection />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="mx-auto max-w-7xl overflow-hidden px-6 py-20 sm:py-24 lg:px-8">
            <div className="flex justify-center flex-wrap gap-x-10 gap-y-4">
                {navigation.map((item) => (
                    <a key={item.name} href={item.href} className="text-sm leading-6 text-gray-600 hover:text-sunset-orange transition-colors duration-300">
                      {item.name}
                    </a>
                ))}
<a href="/privacy" className="text-sm leading-6 text-gray-600 hover:text-sunset-orange transition-colors duration-300">
                  {t('footer.privacy')}
                </a>
                <CookiePreferencesButton className="text-sm leading-6 text-gray-600 hover:text-sunset-orange transition-colors duration-300" />
            </div>
            <p className="mt-10 text-center text-xs leading-5 text-gray-500">{t('footer.copyright', { year: new Date().getFullYear() })} {t('footer.rights')}</p>
        </div>
      </footer>

      <style jsx global>{`
        :root {
          --deep-blue: #0A192F;
          --cyan-500: #0EA5E9;
          --sunset-orange: #FF6B35;
          --off-white: #F9FAFB;
          --golden-yellow: #FACC15;
        }
        .dark .bg-off-white { background-color: #06101f; }
        .dark .bg-white { background-color: #0d1c34; }
        .dark .bg-white\\/80 { background-color: rgba(13, 28, 52, 0.8); }
        .dark .bg-gray-50 { background-color: #13243d; }
        .dark .bg-gray-100 { background-color: #1f2937; }
        .dark .bg-gray-200 { background-color: #1f2937; }
        .dark .bg-gray-900\\/5 { background-color: rgba(15, 23, 42, 0.7); }
        .dark .hover\\:bg-gray-50:hover { background-color: #1f2937; }
        .dark .hover\\:bg-white:hover { background-color: #0f172a; }
        .dark .text-deep-blue { color: #e2e8f0; }
        .dark .text-gray-900 { color: #f8fafc; }
        .dark .text-gray-700 { color: #e2e8f0; }
        .dark .text-gray-600 { color: #cbd5e1; }
        .dark .text-gray-500 { color: #94a3b8; }
        .dark .text-gray-400 { color: #94a3b8; }
        .dark .text-gray-300 { color: #cbd5e1; }
        .dark .border-gray-200 { border-color: #1f2937; }
        .dark .border-gray-300 { border-color: #334155; }
        .dark .ring-gray-200 { --tw-ring-color: #1f2937; }
        .dark .ring-gray-300 { --tw-ring-color: #334155; }
        .dark .ring-gray-900\\/10 { --tw-ring-color: rgba(15, 23, 42, 0.7); }
        .dark .divide-gray-500\\/10 > :not([hidden]) ~ :not([hidden]) { border-color: rgba(148, 163, 184, 0.2); }
        .text-deep-blue { color: var(--deep-blue); }
        .bg-deep-blue { background-color: var(--deep-blue); }
        .bg-off-white { background-color: var(--off-white); }
        .bg-sunset-orange { background-color: var(--sunset-orange); }
        .text-sunset-orange { color: var(--sunset-orange); }
        .text-cyan-500 { color: var(--cyan-500); }
        .bg-cyan-500 { background-color: var(--cyan-500); }
        .text-golden-yellow { color: var(--golden-yellow); }
        .bg-golden-yellow { background-color: var(--golden-yellow); }
        .ring-golden-yellow\\/20 { --tw-ring-color: rgba(250, 204, 21, 0.2); }
        .ring-golden-yellow\\/30 { --tw-ring-color: rgba(250, 204, 21, 0.3); }
        .ring-golden-yellow\\/50 { --tw-ring-color: rgba(250, 204, 21, 0.5); }
        .from-golden-yellow { --tw-gradient-from: var(--golden-yellow); }
        .via-golden-yellow\\/5 { --tw-gradient-stops: var(--tw-gradient-from), rgba(250, 204, 21, 0.05) var(--tw-gradient-to); }
        .logo-placeholder {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-weight: 700;
          font-size: 1.25rem;
        }
        /* Add styles for RTL */
      [dir="rtl"] .group:hover .group-hover\\:translate-x-1 {
            --tw-translate-x: -0.25rem;
        }
      [dir="rtl"] .pl-9 {
          padding-right: 2.25rem;
          padding-left: 0;
        }
      [dir="rtl"] .absolute.left-1 {
            left: auto;
            right: 0.25rem;
      }
      `}</style>
    </div>
  )
}
