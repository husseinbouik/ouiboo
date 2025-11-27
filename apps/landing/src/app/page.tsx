'use client'

import React, { Fragment, useState, useEffect, useRef } from 'react'
import { Bars3Icon, XMarkIcon, GlobeAltIcon, BuildingOffice2Icon, CheckCircleIcon, SparklesIcon, ChartBarIcon, UserGroupIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { motion, useScroll, useTransform, useInView, animate, Variants } from 'framer-motion'
import axios from 'axios'
import { Dialog, Transition, Menu } from '@headlessui/react'
import { useTranslation } from 'react-i18next'

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

export default function OuibooLanding() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;
  const isRTL = currentLang === 'ar';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '', email: '', userType: 'Traveler', phoneNumber: '', agencyName: ''
  })
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
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

  const testimonials = [
      { quote: t('testimonials.quote1'), author: "Maria S.", role: "Owner, Alpine Adventures" },
      { quote: t('testimonials.quote2'), author: "David L.", role: "Solo Traveler" },
      { quote: t('testimonials.quote3'), author: "Chen W.", role: "Co-Founder, Nomad Trails" },
  ];


  useEffect(() => {
    document.documentElement.lang = currentLang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  }, [currentLang, isRTL]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Include the current language in the form submission
      await axios.post('/api/subscribe', { ...formData, language: currentLang });
      setIsSuccessModalOpen(true);
      setFormData({ name: '', email: '', userType: 'Traveler', phoneNumber: '', agencyName: '' });
    } catch (err) {
      console.error('Subscribe error:', err);
      alert('Could not submit your request. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

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

  const LanguageSwitcher = () => (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex w-full justify-center items-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
          <GlobeAltIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
          {currentLang.toUpperCase()}
          <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
        </Menu.Button>
      </div>
      <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
        <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            <Menu.Item>{({ active }) => <button onClick={() => changeLanguage('en')} className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} block w-full text-left px-4 py-2 text-sm`}>English</button>}</Menu.Item>
            <Menu.Item>{({ active }) => <button onClick={() => changeLanguage('fr')} className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} block w-full text-left px-4 py-2 text-sm`}>Français</button>}</Menu.Item>
            <Menu.Item>{({ active }) => <button onClick={() => changeLanguage('ar')} className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} block w-full text-left px-4 py-2 text-sm`}>العربية</button>}</Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );

  return (
    <div className="bg-off-white text-deep-blue font-sans">
      {/* Header - Fixed with scroll effect */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/80 backdrop-blur-md shadow-lg' 
            : 'bg-transparent'
        }`}
      >
        <nav aria-label="Global" className="flex items-center justify-between p-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex lg:flex-1">
            <a href="#" className="-m-1.5 p-1.5 flex items-center gap-2">
              <div className="logo-placeholder bg-deep-blue text-white" aria-hidden>O</div>
              <span className="font-bold text-xl tracking-tight">Ouiboo</span>
            </a>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
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
          <div className="hidden lg:flex lg:flex-1 lg:justify-end items-center gap-x-6">
            <LanguageSwitcher />
            <div className="flex items-center gap-x-4">
              <a href={`${process.env.NEXT_PUBLIC_TRAVELER_URL}/login`} className="text-sm font-semibold leading-6 text-deep-blue hover:text-sunset-orange transition-colors">
                Traveler Login
              </a>
              <a href={`${process.env.NEXT_PUBLIC_AGENCY_URL}/login`} className="rounded-md bg-sunset-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-90 transition-transform hover:scale-105">
                Agency Login
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
                <div className="logo-placeholder bg-deep-blue text-white" aria-hidden>O</div>
                <span className="font-bold text-xl tracking-tight">Ouiboo</span>
              </a>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
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
                  <div className="flex items-center">
                    <LanguageSwitcher />
                  </div>
                  <a
                    href={`${process.env.NEXT_PUBLIC_TRAVELER_URL}/login`}
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    Traveler Login
                  </a>
                  <a
                    href={`${process.env.NEXT_PUBLIC_AGENCY_URL}/login`}
                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                  >
                    Agency Login
                  </a>
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </Dialog>
      </motion.header>

      {/* Hero Section */}
      <main className="isolate">
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
                          {t('hero.title')}
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
                              href="#how-it-works" 
                              whileHover={{ x: 5 }}
                              className="text-sm font-semibold leading-6 group text-deep-blue hover:text-sunset-orange transition-colors duration-300"
                            >
                                {t('hero.ctaSecondary')} <span aria-hidden="true" className="transition-transform group-hover:translate-x-1 inline-block">→</span>
                            </motion.a>
                        </motion.div>
                    </motion.div>
                    <motion.div style={{ scale: heroImageScale, rotate: heroImageRotate }} className="mt-16 flow-root sm:mt-24">
                        <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                            <img src="/Dashboard.png" alt="App screenshot" width={2432} height={1442} className="rounded-md shadow-2xl ring-1 ring-gray-900/10"/>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>

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
                    {travelerFeatures.map((feature, index) => (
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
                </div>
              </motion.div>
              <div ref={refTravelerImage} className="w-full h-[30rem] sm:h-[40rem] overflow-hidden rounded-xl shadow-xl">
                <motion.img style={{ y: parallaxTraveler }} src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop" alt="Traveler enjoying a mountainous view" className="w-full h-full object-cover"/>
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
                    {agencyFeatures.map((feature, index) => (
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
                </div>
              </motion.div>
              <div ref={refAgencyImage} className="lg:order-first w-full h-[30rem] sm:h-[40rem] overflow-hidden rounded-xl shadow-xl">
                <motion.img style={{ y: parallaxAgency }} src="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=2070&auto=format&fit=crop" alt="Agency dashboard on a laptop" className="w-full h-full object-cover"/>
              </div>
            </div>
          </div>
        </section>
        
        {/* Testimonials Section */}
        <section id="testimonials" className="bg-white py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <motion.div
                    variants={fadeInUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.5 }}
                    className="mx-auto max-w-2xl lg:text-center"
                >
                    <h2 className="text-base font-semibold leading-7 text-sunset-orange uppercase tracking-wide">{t('testimonials.preTitle')}</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-deep-blue sm:text-4xl">{t('testimonials.title')}</p>
                </motion.div>
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:max-w-5xl lg:grid-cols-3"
                >
                    {testimonials.map((testimonial, index) => (
                        <motion.figure
                            key={index}
                            variants={scaleIn}
                            whileHover={{ scale: 1.03, y: -5 }}
                            className="flex flex-col justify-between rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200 transition-all duration-300 hover:shadow-lg hover:ring-sunset-orange/20"
                        >
                            <blockquote className="text-lg leading-7 text-gray-700">
                                <p>“{testimonial.quote}”</p>
                            </blockquote>
                            <figcaption className="mt-6 flex items-center gap-x-4">
                                <img className="h-12 w-12 rounded-full bg-gray-50 object-cover" src={`https://ui-avatars.com/api/?name=${testimonial.author.replace(' ', '+')}&background=1E3A8A&color=fff`} alt={testimonial.author} />
                                <div>
                                    <div className="font-semibold text-deep-blue">{testimonial.author}</div>
                                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                                </div>
                            </figcaption>
                        </motion.figure>
                    ))}
                </motion.div>
            </div>
        </section>

        {/* --- PRICING SECTION --- */}
        <section id="pricing" className="bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div 
              variants={fadeInUp} 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true }} 
              className="mx-auto max-w-4xl text-center"
            >
              <h2 className="text-base font-semibold leading-7 text-sunset-orange uppercase tracking-wide">{t('pricing.preTitle')}</h2>
              <p className="mt-2 text-4xl font-bold tracking-tight text-deep-blue sm:text-5xl">
                {t('pricing.title')}
              </p>
            </motion.div>
            <motion.p 
              variants={fadeInUp} 
              initial="hidden" 
              whileInView="visible" 
              viewport={{ once: true }} 
              transition={{ delay: 0.2 }}  
              className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600"
            >
              {t('pricing.subtitle')}
            </motion.p>
            
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-4"
            >
              {/* Free Plan */}
              <motion.div 
                variants={scaleIn}
                whileHover={{ scale: 1.02, y: -5 }}
                className="rounded-3xl p-8 ring-1 ring-gray-200 xl:p-10 bg-white hover:ring-sunset-orange/30 transition-all duration-300"
              >
                <h3 className="text-lg font-semibold leading-8 text-gray-900">{t('pricing.free.title')}</h3>
                <p className="mt-4 text-sm leading-6 text-gray-600">{t('pricing.free.description')}</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">{t('pricing.free.price')}</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">{t('pricing.free.currency')}</span>
                </p>
                <p className="mt-2 text-xs text-gray-500 font-medium">{t('pricing.free.commission')}</p>
                <motion.a 
                  href="#waitlist" 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mt-8 block rounded-md bg-deep-blue px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:shadow-md hover:bg-blue-900 transition-all duration-300"
                >
                  {t('pricing.free.button')}
                </motion.a>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  <li className="flex gap-x-3">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                    {t('pricing.free.feature1')}
                  </li>
                  <li className="flex gap-x-3">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                    {t('pricing.free.feature2')}
                  </li>
                  <li className="flex gap-x-3">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                    {t('pricing.free.feature3')}
                  </li>
                </ul>
              </motion.div>

              {/* Pro Plan (Highlighted) */}
              <motion.div 
                variants={scaleIn}
                whileHover={{ scale: 1.05, y: -8 }}
                className="relative rounded-3xl p-8 ring-2 ring-sunset-orange xl:p-10 lg:z-10 bg-white transition-all duration-300 hover:shadow-2xl"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                    <span className="inline-flex items-center rounded-full bg-sunset-orange px-4 py-1 text-sm font-medium text-white shadow-md">
                        {t('pricing.waitlist.badge')}
                    </span>
                </motion.div>
                <h3 className="text-2xl font-bold tracking-tight text-deep-blue mt-2">{t('pricing.pro.title')}</h3>
                <p className="mt-4 text-base leading-7 text-gray-600">{t('pricing.pro.description')}</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-5xl font-bold tracking-tight text-deep-blue">{t('pricing.pro.price')}</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">{t('pricing.pro.currency')}</span>
                </p>
                <p className="mt-2 text-xs text-sunset-orange font-semibold">{t('pricing.pro.commission')}</p>
                <motion.a 
                  href="#waitlist" 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mt-8 block rounded-md bg-sunset-orange px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-md hover:shadow-lg hover:bg-orange-600 transition-all duration-300"
                >
                  {t('pricing.pro.button')}
                </motion.a>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  <li className="flex gap-x-3 font-semibold">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                    {t('pricing.pro.feature1')}
                  </li>
                  <li className="flex gap-x-3 font-semibold">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                    {t('pricing.pro.feature2')}
                  </li>
                  <li className="flex gap-x-3 font-semibold">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                    {t('pricing.pro.feature3')}
                  </li>
                  <li className="flex gap-x-3 font-semibold">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-sunset-orange" aria-hidden="true" />
                    {t('pricing.pro.feature4')}
                  </li>
                </ul>
              </motion.div>

              {/* Premium Plan */}
              <motion.div 
                variants={scaleIn}
                whileHover={{ scale: 1.02, y: -5 }}
                className="rounded-3xl p-8 ring-1 ring-gray-200 xl:p-10 bg-white hover:ring-sunset-orange/30 transition-all duration-300"
              >
                <h3 className="text-lg font-semibold leading-8 text-gray-900">{t('pricing.premium.title')}</h3>
                <p className="mt-4 text-sm leading-6 text-gray-600">{t('pricing.premium.description')}</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">{t('pricing.premium.price')}</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">{t('pricing.premium.currency')}</span>
                </p>
                <p className="mt-2 text-xs text-gray-500 font-medium">{t('pricing.premium.commission')}</p>
                <a href="#" className="mt-8 block rounded-md bg-gray-200 px-3 py-2 text-center text-sm font-semibold leading-6 text-gray-500 cursor-not-allowed">
                  {t('pricing.premium.button')}
                </a>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  <li className="flex gap-x-3">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                    {t('pricing.premium.feature1')}
                  </li>
                  <li className="flex gap-x-3">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                    {t('pricing.premium.feature2')}
                  </li>
                  <li className="flex gap-x-3">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                    {t('pricing.premium.feature3')}
                  </li>
                  <li className="flex gap-x-3">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                    {t('pricing.premium.feature4')}
                  </li>
                </ul>
              </motion.div>

              {/* Enterprise Plan */}
              <motion.div 
                variants={scaleIn}
                whileHover={{ scale: 1.02, y: -5 }}
                className="rounded-3xl p-8 ring-1 ring-gray-200 xl:p-10 bg-white hover:ring-deep-blue/30 transition-all duration-300"
              >
                <h3 className="text-lg font-semibold leading-8 text-gray-900">{t('pricing.enterprise.title')}</h3>
                <p className="mt-4 text-sm leading-6 text-gray-600">{t('pricing.enterprise.description')}</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">{t('pricing.enterprise.price')}</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">{t('pricing.enterprise.currency')}</span>
                </p>
                <p className="mt-2 text-xs text-gray-500 font-medium">{t('pricing.enterprise.commission')}</p>
                <motion.a 
                  href="#waitlist" 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mt-8 block rounded-md bg-deep-blue px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {t('pricing.enterprise.button')}
                </motion.a>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  <li className="flex gap-x-3">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                    {t('pricing.enterprise.feature1')}
                  </li>
                  <li className="flex gap-x-3">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                    {t('pricing.enterprise.feature2')}
                  </li>
                  <li className="flex gap-x-3">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                    {t('pricing.enterprise.feature3')}
                  </li>
                  <li className="flex gap-x-3">
                    <CheckCircleIcon className="h-6 w-5 flex-none text-gray-400" aria-hidden="true" />
                    {t('pricing.enterprise.feature4')}
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Waitlist Section */}
        <section id="waitlist" className="py-24 sm:py-32 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative isolate overflow-hidden bg-deep-blue px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16"
              >
              <motion.div 
                variants={fadeInUp} 
                initial="hidden" 
                whileInView="visible" 
                viewport={{ once: true }}
              >
                  <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">{t('waitlist.title')}</h2>
                  <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-200">{t('waitlist.subtitle')}</p>
              </motion.div>
              <motion.form 
                variants={staggerContainer}
                initial="hidden" 
                whileInView="visible" 
                viewport={{ once: true }} 
                onSubmit={handleSubmit} 
                className="mt-10 mx-auto max-w-md grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2"
              >
                <motion.div variants={fadeInUp} className="sm:col-span-2">
                    <input 
                      name="name" 
                      type="text" 
                      autoComplete="name" 
                      required 
                      className="min-w-0 w-full flex-auto rounded-md border-0 bg-white/10 backdrop-blur-sm px-3.5 py-2.5 text-white shadow-sm ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-inset focus:ring-white focus:bg-white/20 transition-all duration-300 sm:text-sm sm:leading-6 placeholder:text-gray-300" 
                      placeholder={t('waitlist.form.name')} 
                      value={formData.name} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                </motion.div>
                <motion.div variants={fadeInUp} className="sm:col-span-2">
                    <input 
                      name="email" 
                      type="email" 
                      autoComplete="email" 
                      required 
                      className="min-w-0 w-full flex-auto rounded-md border-0 bg-white/10 backdrop-blur-sm px-3.5 py-2.5 text-white shadow-sm ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-inset focus:ring-white focus:bg-white/20 transition-all duration-300 sm:text-sm sm:leading-6 placeholder:text-gray-300" 
                      placeholder={t('waitlist.form.email')} 
                      value={formData.email} 
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </motion.div>
                <motion.div variants={fadeInUp} className="sm:col-span-2">
                  <input 
                    name="phoneNumber" 
                    type="tel" 
                    autoComplete="tel" 
                    required 
                    className="min-w-0 w-full flex-auto rounded-md border-0 bg-white/10 backdrop-blur-sm px-3.5 py-2.5 text-white shadow-sm ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-inset focus:ring-white focus:bg-white/20 transition-all duration-300 sm:text-sm sm:leading-6 placeholder:text-gray-300" 
                    placeholder={t('waitlist.form.phone')} 
                    value={formData.phoneNumber} 
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  />
                </motion.div>
                <motion.div variants={fadeInUp}>
                    <select name="userType" className="min-w-0 w-full h-full flex-auto rounded-md border-0 bg-white/10 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6" value={formData.userType} onChange={(e) => setFormData({ ...formData, userType: e.target.value })}>
                      <option value="Traveler" className="text-black">{t('waitlist.form.userType.traveler')}</option>
                      <option value="Agency" className="text-black">{t('waitlist.form.userType.agency')}</option>
                    </select>
                </motion.div>
                <motion.div variants={fadeInUp}>
                    <motion.button 
                      type="submit" 
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.02 }}
                      whileTap={{ scale: loading ? 1 : 0.98 }}
                      className="w-full flex-none rounded-md bg-sunset-orange px-3.5 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? t('waitlist.form.submitting') : t('waitlist.form.submit')}
                    </motion.button>
                </motion.div>

                {formData.userType === 'Agency' && (
                  <motion.div 
                    className="sm:col-span-2" 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }} 
                    exit={{ opacity: 0, height: 0 }} 
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                  >
                    <input 
                      name="agencyName" 
                      type="text" 
                      required 
                      className="mt-4 min-w-0 w-full flex-auto rounded-md border-0 bg-white/10 backdrop-blur-sm px-3.5 py-2.5 text-white shadow-sm ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-inset focus:ring-white focus:bg-white/20 transition-all duration-300 sm:text-sm sm:leading-6 placeholder:text-gray-300" 
                      placeholder={t('waitlist.form.agencyName')} 
                      value={formData.agencyName} 
                      onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                    />
                  </motion.div>
                )}
              </motion.form>

              <Transition appear show={isSuccessModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsSuccessModalOpen(false)}>
                  <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                  </Transition.Child>
                  <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                      <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                          <div className="flex flex-col items-center">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}>
                              <CheckCircleIcon className="h-20 w-20 text-green-500" />
                            </motion.div>
                            <Dialog.Title as="h3" className="mt-4 text-2xl font-bold leading-6 text-gray-900">
                              {t('modal.title')}
                            </Dialog.Title>
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                              {t('modal.subtitle')}
                              </p>
                            </div>
                            <div className="mt-6">
                              <button
                                type="button"
                                className="inline-flex justify-center rounded-md border border-transparent bg-green-100 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                                onClick={() => setIsSuccessModalOpen(false)}
                              >
                                {t('modal.button')}
                              </button>
                            </div>
                          </div>
                        </Dialog.Panel>
                      </Transition.Child>
                    </div>
                  </div>
                </Dialog>
              </Transition>
              
              <svg viewBox="0 0 1024 1024" aria-hidden="true" className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 opacity-5">
                <circle cx={512} cy={512} r={512} fill="#F97316" fillOpacity="0.1" />
              </svg>
            </motion.div>
          </div>
        </section>
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
            </div>
            <p className="mt-10 text-center text-xs leading-5 text-gray-500">&copy; {new Date().getFullYear()} Ouiboo. {t('footer.rights')}</p>
        </div>
      </footer>

      <style jsx global>{`
        :root {
          --deep-blue: #1E3A8A;
          --cyan-500: #0EA5E9;
          --sunset-orange: #F97316;
          --off-white: #F9FAFB;
          --golden-yellow: #FACC15;
        }
        .text-deep-blue { color: var(--deep-blue); }
        .bg-deep-blue { background-color: var(--deep-blue); }
        .bg-off-white { background-color: var(--off-white); }
        .bg-sunset-orange { background-color: var(--sunset-orange); }
        .text-sunset-orange { color: var(--sunset-orange); }
        .text-cyan-500 { color: var(--cyan-500); }
        .bg-cyan-500 { background-color: var(--cyan-500); }
        .text-golden-yellow { color: var(--golden-yellow); }
        .bg-golden-yellow { background-color: var(--golden-yellow); }
        .ring-golden-yellow\/20 { --tw-ring-color: rgba(250, 204, 21, 0.2); }
        .ring-golden-yellow\/30 { --tw-ring-color: rgba(250, 204, 21, 0.3); }
        .ring-golden-yellow\/50 { --tw-ring-color: rgba(250, 204, 21, 0.5); }
        .from-golden-yellow { --tw-gradient-from: var(--golden-yellow); }
        .via-golden-yellow\/5 { --tw-gradient-stops: var(--tw-gradient-from), rgba(250, 204, 21, 0.05) var(--tw-gradient-to); }
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
      [dir="rtl"] .group:hover .group-hover\:translate-x-1 {
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