'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Dialog } from '@headlessui/react'
import { Bars3Icon, XMarkIcon, GlobeAltIcon, BuildingOffice2Icon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { motion, useScroll, useTransform, useInView, animate } from 'framer-motion' // Import new hooks
import axios from 'axios'


type CounterProps = {
  from: number;
  to: number;
  duration?: number; 
};

function Counter({ from, to, duration = 2 }: CounterProps) {
  // It's also good practice to type your ref
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


// Ouiboo Landing Page — Enhanced Version
export default function OuibooLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', userType: 'Traveler' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const { scrollYProgress } = useScroll()
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8])
  const rotate = useTransform(scrollYProgress, [0, 1], [0, -5])

  const navigation = [
    { name: 'For Travelers', href: '#travelers' },
    { name: 'For Agencies', href: '#agencies' },
    { name: 'Features', href: '#features' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await axios.post('/api/subscribe', formData)
      setSubmitted(true)
    } catch (err) {
      console.error('Subscribe error:', err)
      alert('Could not submit your request. Please try again later.')
    } finally {
      setLoading(false)
    }
  }
  
  // NEW: Staggered animation variant for containers
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  // NEW: Animation variant for individual items
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };


  return (
    <div className="bg-off-white text-deep-blue">
      {/* Header remains the same */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav aria-label="Global" className="flex items-center justify-between p-6 lg:px-8">
          <div className="flex lg:flex-1">
            <a href="#" className="-m-1.5 p-1.5 flex items-center gap-2">
              <div className="logo-placeholder bg-deep-blue text-white" aria-hidden>
                O
              </div>
              <span className="font-bold text-xl tracking-tight">Ouiboo</span>
            </a>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            {navigation.map((item) => (
              <a key={item.name} href={item.href} className="text-sm font-semibold leading-6 hover:text-cyan-500 transition-colors">
                {item.name}
              </a>
            ))}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <a href="#waitlist" className="rounded-md bg-sunset-orange px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-90 transition-transform hover:scale-105">
              Join Waitlist
            </a>
          </div>
        </nav>
        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
          {/* Dialog implementation remains the same */}
        </Dialog>
      </header>

      <main className="isolate">
        {/* Hero Section (no changes needed here) */}
        <div className="relative pt-14">
            <div
                aria-hidden="true"
                className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
            >
                <div
                style={{
                    clipPath:
                    'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                }}
                className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-sunset-orange to-cyan-500 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
                />
            </div>
            <div className="py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-4xl font-bold tracking-tight sm:text-6xl text-deep-blue"
                    >
                    Your Next Adventure, Seamlessly Connected.
                    </motion.h1>
                    <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="mt-6 text-lg leading-8 text-gray-600"
                    >
                    For travelers, a world of curated trips. For agencies, a powerful platform to grow. <br /> Ouiboo is where travel comes together.
                    </motion.p>
                    <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="mt-10 flex items-center justify-center gap-x-6"
                    >
                    <a
                        href="#waitlist"
                        className="rounded-md bg-sunset-orange px-5 py-3 text-base font-semibold text-white shadow-lg transform hover:scale-105 transition-transform"
                    >
                        Join the Waitlist & Get a Free Month
                    </a>
                    <a href="#features" className="text-sm font-semibold leading-6">
                        Learn more <span aria-hidden="true">→</span>
                    </a>
                    </motion.div>
                </div>
                <motion.div style={{ scale, rotate }} className="mt-16 flow-root sm:mt-24">
                    <div className="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4">
                    <img
                        src="../Dashboard.png"
                        alt="App screenshot"
                        width={2432}
                        height={1442}
                        className="rounded-md shadow-2xl ring-1 ring-gray-900/10"
                    />
                    </div>
                </motion.div>
                </div>
            </div>
        </div>
        
        {/* Features Section - UPDATED with stagger animation */}
        <div id="features" className="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
                 <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl text-deep-blue">
                    Everything you need to travel or sell
                </p>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                    Ouiboo provides the tools and the marketplace to create unforgettable travel experiences, whether you're booking them or building them.
                </p>
            </div>
          <motion.dl // NEW: Motion container
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16"
          >
            {[
              { name: 'Curated Marketplace', description: 'Discover unique travel packages from trusted, independent agencies worldwide. No more endless scrolling.', icon: GlobeAltIcon },
              { name: 'Agency SaaS Hub', description: 'Digitize your offerings, manage bookings, and access a global audience with our intuitive dashboard.', icon: BuildingOffice2Icon },
              { name: 'Seamless & Secure Bookings', description: 'Enjoy a frictionless booking process with secure payments, giving you peace of mind.', icon: CheckCircleIcon },
              { name: 'Growth & Analytics', description: 'Agencies get powerful insights to understand their customers and scale their business.', icon: SparklesIcon },
            ].map((feature) => (
              <motion.div key={feature.name} variants={itemVariants} className="relative pl-16">
                <dt className="text-base font-semibold leading-7">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500">
                    <feature.icon aria-hidden="true" className="h-6 w-6 text-white" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">{feature.description}</dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>

        {/* --- NEW: Social Proof Section with Animated Counters --- */}
        <div className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl lg:max-w-none">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-deep-blue sm:text-4xl">
                        Trusted by a growing community
                    </h2>
                    <p className="mt-4 text-lg leading-8 text-gray-600">
                        Join hundreds of travelers and agencies preparing for our launch.
                    </p>
                </div>
                <dl className="mt-16 grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl text-center sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col bg-deep-blue/5 p-8">
                        <dt className="text-sm font-semibold leading-6 text-gray-600">Agencies on Waitlist</dt>
                        <dd className="order-first text-3xl font-semibold tracking-tight text-deep-blue"><Counter from={0} to={50} />+</dd>
                    </div>
                    <div className="flex flex-col bg-deep-blue/5 p-8">
                        <dt className="text-sm font-semibold leading-6 text-gray-600">Travelers Signed Up</dt>
                        <dd className="order-first text-3xl font-semibold tracking-tight text-deep-blue"><Counter from={0} to={300} />+</dd>
                    </div>
                    <div className="flex flex-col bg-deep-blue/5 p-8">
                        <dt className="text-sm font-semibold leading-6 text-gray-600">Countries Represented</dt>
                        <dd className="order-first text-3xl font-semibold tracking-tight text-deep-blue"><Counter from={0} to={15} /></dd>
                    </div>
                    <div className="flex flex-col bg-deep-blue/5 p-8">
                        <dt className="text-sm font-semibold leading-6 text-gray-600">Trips Drafted</dt>
                        <dd className="order-first text-3xl font-semibold tracking-tight text-deep-blue"><Counter from={0} to={120} />+</dd>
                    </div>
                </dl>
                </div>
            </div>
        </div>

        {/* Waitlist Section (no changes needed) */}
         <section id="waitlist" className="py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="relative isolate overflow-hidden bg-deep-blue px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
              <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Be the First to Experience Ouiboo
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
                Join our waitlist for exclusive early access, a free month of our Pro plan for agencies, and updates on our launch.
              </p>
              {submitted ? (
              <div className="text-center py-8">
                <h2 className="text-2xl font-semibold text-green-400 mb-2">You're on the list! 🎉</h2>
                <p className="text-gray-300">We'll notify you when early access launches. Thanks for joining!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-10 mx-auto max-w-md grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                 <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <select
                  name="userType"
                  className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
                  value={formData.userType}
                  onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                >
                  <option className="text-black">Traveler</option>
                  <option className="text-black">Agency</option>
                </select>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-none rounded-md bg-sunset-orange px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                   {loading ? 'Joining...' : 'Join Waitlist'}
                </button>
              </form>
            )}
              <svg
                viewBox="0 0 1024 1024"
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2"
              >
                <circle cx={512} cy={512} r={512} fill="url(#759c1415-0410-454c-8f7c-9a820de03641)" fillOpacity="0.7" />
                <defs>
                  <radialGradient
                    id="759c1415-0410-454c-8f7c-9a820de03641"
                    cx={0}
                    cy={0}
                    r={1}
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(512 512) rotate(90) scale(512)"
                  >
                    <stop stopColor="#FACC15" />
                    <stop offset={1} stopColor="#0EA5E9" stopOpacity={0} />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          </div>
        </section>

      </main>

      {/* Footer remains the same */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl overflow-hidden px-6 py-20 sm:py-24 lg:px-8">
          <nav aria-label="Footer" className="-mb-6 columns-2 sm:flex sm:justify-center sm:space-x-12">
            {navigation.map((item) => (
              <div key={item.name} className="pb-6">
                <a href={item.href} className="text-sm leading-6 text-gray-600 hover:text-deep-blue">
                  {item.name}
                </a>
              </div>
            ))}
          </nav>
          <p className="mt-10 text-center text-xs leading-5 text-gray-500">
            &copy; {new Date().getFullYear()} Ouiboo. All rights reserved.
          </p>
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