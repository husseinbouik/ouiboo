'use client'

import React, { Fragment, useState, useEffect, useRef } from 'react'
import { Bars3Icon, XMarkIcon, GlobeAltIcon, BuildingOffice2Icon, CheckCircleIcon, SparklesIcon, MagnifyingGlassIcon, PencilSquareIcon, PaperAirplaneIcon, ChartBarIcon, UserGroupIcon } from '@heroicons/react/24/outline'
// 1. Import the 'Variants' type from Framer Motion
import { motion, useScroll, useTransform, useInView, animate, Variants } from 'framer-motion'
import axios from 'axios'
import { Dialog, Transition } from '@headlessui/react'

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '', email: '', userType: 'Traveler', phoneNumber: '', agencyName: ''
  })
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // --- Animation Hooks & Variants ---
  const { scrollYProgress } = useScroll();
  const heroImageScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);
  const heroImageRotate = useTransform(scrollYProgress, [0, 0.2], [0, -5]);

  const refTravelerImage = useRef(null);
  const { scrollYProgress: scrollYTraveler } = useScroll({ target: refTravelerImage, offset: ["start end", "end start"] });
  const parallaxTraveler = useTransform(scrollYTraveler, [0, 1], ['-20%', '20%']);
  
  const refAgencyImage = useRef(null);
  const { scrollYProgress: scrollYAgency } = useScroll({ target: refAgencyImage, offset: ["start end", "end start"] });
  const parallaxAgency = useTransform(scrollYAgency, [0, 1], ['-20%', '20%']);

  const navigation = [
    { name: 'How it Works', href: '#how-it-works' },
    { name: 'For Travelers', href: '#travelers' },
    { name: 'For Agencies', href: '#agencies' },
    { name: 'Pricing', href: '#pricing' },
  ]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/subscribe', formData);
      setIsSuccessModalOpen(true);
      setFormData({ name: '', email: '', userType: 'Traveler', phoneNumber: '', agencyName: '' });
    } catch (err) {
      console.error('Subscribe error:', err);
      alert('Could not submit your request. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  // 2. Apply the 'Variants' type to your animation objects
  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };
  
  const staggerContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15 } }
  };
  
  const slideInLeft: Variants = {
     hidden: { opacity: 0, x: -50 },
     visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" }}
  }

  const slideInRight: Variants = {
     hidden: { opacity: 0, x: 50 },
     visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" }}
  }


  return (
    <div className="bg-off-white text-deep-blue">
      {/* (The rest of your component JSX remains exactly the same) */}
      {/* Header */}
       <header className="absolute inset-x-0 top-0 z-50">
        <nav aria-label="Global" className="flex items-center justify-between p-6 lg:px-8">
          <div className="flex lg:flex-1">
            <a href="#" className="-m-1.5 p-1.5 flex items-center gap-2">
              <div className="logo-placeholder bg-deep-blue text-white" aria-hidden>O</div>
              <span className="font-bold text-xl tracking-tight">Ouiboo</span>
            </a>
          </div>
          <div className="flex lg:hidden">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700">
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map((item) => (
              <a key={item.name} href={item.href} className="text-sm font-semibold leading-6 hover:text-cyan-500 transition-colors relative group">
                {item.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-500 group-hover:w-full transition-all duration-300"></span>
              </a>
            ))}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <a href="#waitlist" className="rounded-md bg-sunset-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-90 transition-transform hover:scale-105">Join Waitlist</a>
          </div>
        </nav>
        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
          {/* Mobile menu dialog can be implemented here */}
        </Dialog>
      </header>

      <main className="isolate">
        {/* Hero Section */}
        <div className="relative pt-14">
            <div aria-hidden="true" className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
                <div style={{ clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)' }} className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-sunset-orange to-cyan-500 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"/>
            </div>
            <div className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-3xl text-center">
                        <motion.h1 variants={fadeInUp} initial="hidden" animate="visible" className="text-4xl font-bold tracking-tight sm:text-6xl text-deep-blue">
                            Your Next Adventure, Seamlessly Connected.
                        </motion.h1>
                        <motion.p variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }} className="mt-6 text-lg leading-8 text-gray-600">
                            For travelers, a world of curated trips. For agencies, a powerful platform to grow. <br /> Ouiboo is where travel comes together.
                        </motion.p>
                        <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.4 }} className="mt-10 flex items-center justify-center gap-x-6">
                            <a href="#waitlist" className="rounded-md bg-sunset-orange px-5 py-3 text-base font-semibold text-white shadow-lg transform hover:scale-105 transition-transform">
                                Join the Waitlist & Get a Free Month
                            </a>
                            <a href="#how-it-works" className="text-sm font-semibold leading-6 group">
                                Learn more <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                            </a>
                        </motion.div>
                    </div>
                    <motion.div style={{ scale: heroImageScale, rotate: heroImageRotate }} className="mt-16 flow-root sm:mt-24">
                        <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                            <img src="../Dashboard.png" alt="App screenshot" width={2432} height={1442} className="rounded-md shadow-2xl ring-1 ring-gray-900/10"/>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-cyan-500">The Process</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-deep-blue sm:text-4xl">Getting Started is Easy</p>
              <p className="mt-6 text-lg leading-8 text-gray-600">Whether you're finding an adventure or listing one, the path is simple and clear.</p>
            </motion.div>
            <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-center sm:mt-20 sm:grid-cols-3 lg:max-w-7xl">
              {[
                { number: '01', name: 'Discover or Create', description: 'Travelers browse a curated marketplace. Agencies easily build and publish their unique travel packages.' },
                { number: '02', name: 'Book Seamlessly', description: 'A simple, secure booking process for travelers. Agencies manage everything from a single, intuitive dashboard.' },
                { number: '03', name: 'Experience & Grow', description: 'Travelers embark on their adventure. Agencies gain valuable insights and a global audience.' },
              ].map((step) => (
                <motion.div key={step.name} variants={fadeInUp} className="flex flex-col items-center p-8 rounded-2xl transition-shadow duration-300 hover:shadow-2xl cursor-pointer">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-deep-blue text-white font-bold text-lg">{step.number}</div>
                  <h3 className="mt-6 text-lg font-semibold text-deep-blue">{step.name}</h3>
                  <p className="mt-2 text-base leading-7 text-gray-600">{step.description}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Benefits for Travelers Section */}
        <section id="travelers" className="overflow-hidden bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center">
              <motion.div variants={slideInLeft} initial="hidden" whileInView="visible" viewport={{ once: true }} className="lg:pr-8 lg:pt-4">
                <div className="lg:max-w-lg">
                  <h2 className="text-base font-semibold leading-7 bg-gradient-to-r from-sunset-orange to-golden-yellow text-transparent bg-clip-text">For Travelers</h2>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-deep-blue sm:text-4xl">Your Story is Waiting</p>
                  <p className="mt-6 text-lg leading-8 text-gray-600">Trade endless scrolling for authentic adventures. We connect you with unique trips from trusted, independent agencies.</p>
                  <motion.dl variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 max-w-xl space-y-8 text-base leading-7 text-gray-600 lg:max-w-none">
                    {[
                      { name: 'Discover Unique Trips', description: 'Find experiences you won’t see anywhere else, from culinary tours to mountain treks.', icon: GlobeAltIcon },
                      { name: 'Book with Confidence', description: 'Every agency is vetted. Every booking is secure. Travel with total peace of mind.', icon: CheckCircleIcon },
                      { name: 'Save Time & Effort', description: 'No more juggling 20 tabs. Find, compare, and book your perfect trip, all in one place.', icon: SparklesIcon },
                    ].map((feature) => (
                      <motion.div key={feature.name} variants={fadeInUp} className="relative pl-9 transition-transform duration-300 hover:scale-105">
                        <dt className="inline font-semibold text-deep-blue">
                          <feature.icon className="absolute left-1 top-1 h-5 w-5 text-sunset-orange" aria-hidden="true" />
                          {feature.name}
                        </dt>{' '}
                        <dd className="inline">{feature.description}</dd>
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
              <motion.div variants={slideInRight} initial="hidden" whileInView="visible" viewport={{ once: true }} className="lg:ml-auto lg:pl-4 lg:pt-4">
                <div className="lg:max-w-lg">
                  <h2 className="text-base font-semibold leading-7 text-cyan-500">For Agencies</h2>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-deep-blue sm:text-4xl">Your Business, Amplified</p>
                  <p className="mt-6 text-lg leading-8 text-gray-600">Stop wrestling with outdated tools. Our platform gives you everything you need to manage your business and reach a global audience.</p>
                  <motion.dl variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 max-w-xl space-y-8 text-base leading-7 text-gray-600 lg:max-w-none">
                    {[
                      { name: 'Digitize Your Offerings', description: 'Easily create, publish, and manage beautiful trip pages that convert.', icon: BuildingOffice2Icon },
                      { name: 'Unlock Growth Insights', description: 'Use our dashboard to understand your customers, track sales, and make data-driven decisions.', icon: ChartBarIcon },
                      { name: 'Reach a Global Audience', description: 'Tap into our marketplace of passionate travelers actively looking for trips just like yours.', icon: UserGroupIcon },
                    ].map((feature) => (
                      <motion.div key={feature.name} variants={fadeInUp} className="relative pl-9 transition-transform duration-300 hover:scale-105">
                        <dt className="inline font-semibold text-deep-blue">
                          <feature.icon className="absolute left-1 top-1 h-5 w-5 text-cyan-500" aria-hidden="true" />
                          {feature.name}
                        </dt>{' '}
                        <dd className="inline">{feature.description}</dd>
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

        {/* Pricing Section */}
        <section id="pricing" className="bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mx-auto max-w-4xl text-center">
              <h2 className="text-base font-semibold leading-7 text-deep-blue">Pricing</h2>
              <p className="mt-2 text-4xl font-bold tracking-tight text-deep-blue sm:text-5xl">Simple, Transparent Pricing</p>
            </motion.div>
            <motion.p variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} 
  transition={{ delay: 0.2 }}  className="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600">
              We're finalizing our plans to ensure they're fair and provide incredible value. Early supporters get the best deal, forever.
            </motion.p>
            <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} 
  transition={{ delay: 0.4 }}  className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none">
              <div className="rounded-3xl p-8 ring-2 ring-deep-blue xl:p-10 transition-shadow duration-300 hover:shadow-2xl">
                <h3 className="text-2xl font-bold tracking-tight text-deep-blue">Exclusive Waitlist Offer</h3>
                <p className="mt-4 text-base leading-7 text-gray-600">As a thank you for being an early supporter, all agencies who join the waitlist will receive...</p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-5xl font-bold tracking-tight bg-gradient-to-r from-sunset-orange to-golden-yellow text-transparent bg-clip-text">3 Months Free</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">on any Pro plan</span>
                </p>
                <a href="#waitlist" className="mt-8 block rounded-md bg-sunset-orange px-3 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-opacity-90 transition-transform hover:scale-105">
                  Claim Your Free Months
                </a>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Social Proof (Testimonials) Section */}
        <section className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mx-auto max-w-2xl lg:text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-deep-blue sm:text-4xl">Loved by Pioneers</h2>
                    <p className="mt-4 text-lg leading-8 text-gray-600">See what our first users and partners are saying about Ouiboo.</p>
                </motion.div>
                <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} className="mx-auto mt-16 flow-root sm:mt-20">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                        {[
                            { quote: "Finally, a platform that understands the needs of independent travel agencies. The dashboard is a game-changer.", author: "Maria S.", role: "Owner, Alpine Adventures" },
                            { quote: "As a traveler, finding unique trips was always a challenge. Ouiboo's marketplace is beautifully curated. I can't wait!", author: "David L.", role: "Solo Traveler" },
                            { quote: "The ability to reach a global audience without a huge marketing budget is incredible. Ouiboo is set to be essential.", author: "Chen W.", role: "Co-Founder, Nomad Trails" },
                        ].map((testimonial) => (
                        <motion.div key={testimonial.author} variants={fadeInUp} className="break-inside-avoid rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-300 hover:shadow-2xl hover:border-cyan-500 cursor-pointer">
                            <p className="text-base text-gray-600">"{testimonial.quote}"</p>
                            <div className="mt-4 flex items-center gap-x-4">
                                <img className="h-12 w-12 rounded-full bg-gray-50 object-cover" src={`https://ui-avatars.com/api/?name=${testimonial.author.replace(' ', '+')}&background=1E3A8A&color=fff`} alt="" />
                                <div>
                                    <div className="font-semibold text-deep-blue">{testimonial.author}</div>
                                    <div className="text-gray-600">{testimonial.role}</div>
                                </div>
                            </div>
                        </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>

        {/* Waitlist Section */}
        <section id="waitlist" className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="relative isolate overflow-hidden bg-deep-blue px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">Be the First to Experience Ouiboo</h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">Join our waitlist for exclusive early access, a free month of our Pro plan for agencies, and updates on our launch.</p>
              <form onSubmit={handleSubmit} className="mt-10 mx-auto max-w-md grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                <input name="name" type="text" autoComplete="name" required className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6" placeholder="Enter your name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}/>
                <input name="email" type="email" autoComplete="email" required className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6" placeholder="Enter your email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}/>
                <div className="sm:col-span-2">
                  <input name="phoneNumber" type="tel" autoComplete="tel" required className="min-w-0 w-full flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6" placeholder="Enter your phone number" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}/>
                </div>
                <select name="userType" className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6" value={formData.userType} onChange={(e) => setFormData({ ...formData, userType: e.target.value })}>
                  <option className="text-black">Traveler</option>
                  <option className="text-black">Agency</option>
                </select>
                <button type="submit" disabled={loading} className="flex-none rounded-md bg-sunset-orange px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-opacity disabled:opacity-50">
                  {loading ? 'Joining...' : 'Join Waitlist'}
                </button>
                {formData.userType === 'Agency' && (
                  <motion.div className="sm:col-span-2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <input name="agencyName" type="text" required className="min-w-0 w-full flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6" placeholder="Enter your agency name" value={formData.agencyName} onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}/>
                  </motion.div>
                )}
              </form>

              {/* Success Modal implementation is now restored */}
              <Transition appear show={isSuccessModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsSuccessModalOpen(false)}>
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                  </Transition.Child>
                  <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                      <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0 scale-95"
                        enterTo="opacity-100 scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 scale-100"
                        leaveTo="opacity-0 scale-95"
                      >
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                          <div className="flex flex-col items-center">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}>
                              <CheckCircleIcon className="h-20 w-20 text-green-500" />
                            </motion.div>
                            <Dialog.Title as="h3" className="mt-4 text-2xl font-bold leading-6 text-gray-900">
                              You're on the list! 🎉
                            </Dialog.Title>
                            <div className="mt-2">
                              <p className="text-sm text-gray-500">
                                Thanks for joining! We'll notify you when early access launches.
                              </p>
                            </div>
                            <div className="mt-6">
                              <button
                                type="button"
                                className="inline-flex justify-center rounded-md border border-transparent bg-green-100 px-4 py-2 text-sm font-medium text-green-900 hover:bg-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                                onClick={() => setIsSuccessModalOpen(false)}
                              >
                                Awesome!
                              </button>
                            </div>
                          </div>
                        </Dialog.Panel>
                      </Transition.Child>
                    </div>
                  </div>
                </Dialog>
              </Transition>
              
              <svg viewBox="0 0 1024 1024" aria-hidden="true" className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2">
                <circle cx={512} cy={512} r={512} fill="url(#759c1415-0410-454c-8f7c-9a820de03641)" fillOpacity="0.7" />
                <defs><radialGradient id="759c1415-0410-454c-8f7c-9a820de03641" cx={0} cy={0} r={1} gradientUnits="userSpaceOnUse" gradientTransform="translate(512 512) rotate(90) scale(512)"><stop stopColor="#FACC15" /><stop offset={1} stopColor="#0EA5E9" stopOpacity={0} /></radialGradient></defs>
              </svg>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl overflow-hidden px-6 py-20 sm:py-24 lg:px-8">
            <div className="flex justify-center space-x-10">
                 {navigation.map((item) => (
                    <a key={item.name} href={item.href} className="text-sm leading-6 text-gray-600 hover:text-deep-blue">{item.name}</a>
                 ))}
            </div>
            <p className="mt-10 text-center text-xs leading-5 text-gray-500">&copy; {new Date().getFullYear()} Ouiboo. All rights reserved.</p>
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
        .text-cyan-500 { color: var(--cyan-500); }
        .bg-cyan-500 { background-color: var(--cyan-500); }
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
      `}</style>
    </div>
  )
}