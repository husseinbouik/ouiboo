'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { 
  Search, MapPin, Calendar, Users, Star, ArrowRight, Compass, Shield, Zap, Heart, 
  Map as MapIcon, Plane, Camera, Coffee, Mountain, Umbrella, Palmtree, Phone, ChevronRight
} from 'lucide-react';
import { Button, Card, CardContent, Badge } from '@ouiboo/ui';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { TripCard } from "@/components/TripCard";

interface HomeClientProps {
  featuredTrips: any[];
}

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15
    }
  }
};

export default function HomeClient({ featuredTrips }: HomeClientProps) {
  const { t } = useTranslation();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const headerY = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Premium Hero Section */}
      <section ref={heroRef} className="relative h-[110vh] flex items-center justify-center overflow-hidden bg-slate-950">
        <motion.div style={{ y: headerY, opacity }} className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1539635278303-d4002c07eae3?q=80&w=2070&auto=format&fit=crop" 
            alt="Hero Background" 
            className="w-full h-full object-cover scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-background z-10" />
        </motion.div>
        
        <div className="relative z-20 text-center text-white px-6 max-w-6xl mx-auto space-y-16 mt-[-10vh]">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "circOut" }}
            className="space-y-8"
          >
            <Badge className="bg-white/10 backdrop-blur-xl text-white border-white/20 px-6 py-2 rounded-full mb-4 text-xs font-black uppercase tracking-[0.3em] inline-flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-sunset-orange animate-ping" />
              Discover the uncharted Morocco
            </Badge>
            <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter leading-[0.9] mb-4 font-display">
              {t('hero.title')}<br />
              <span className="text-sunset-orange">{t('hero.accent')}</span>
            </h1>
            <p className="text-xl md:text-3xl text-white/80 max-w-3xl mx-auto font-medium leading-relaxed tracking-tight">
              {t('hero.subtitle')}
            </p>
          </motion.div>
          
          {/* Animated Search Hub */}
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: "circOut" }}
            className="bg-white/5 backdrop-blur-3xl p-3 rounded-[3rem] shadow-2xl max-w-5xl mx-auto flex flex-col md:flex-row gap-3 border border-white/10"
          >
            <div className="flex-1 flex items-center px-8 py-5 bg-white/5 rounded-[2.5rem] border border-white/5 group focus-within:border-sunset-orange transition-all">
              <MapPin className="h-6 w-6 text-sunset-orange mr-4 shrink-0" />
              <div className="flex flex-col items-start w-full">
                <span className="text-[10px] uppercase tracking-widest text-white/40 font-black mb-1">Destination</span>
                <input 
                  type="text" 
                  placeholder={t('hero.where')} 
                  className="bg-transparent border-none focus:outline-none text-white w-full placeholder:text-white/30 font-bold text-lg"
                />
              </div>
            </div>
            
            <div className="flex-1 flex items-center px-8 py-5 bg-white/5 rounded-[2.5rem] border border-white/5 group focus-within:border-sunset-orange transition-all">
              <Calendar className="h-6 w-6 text-sunset-orange mr-4 shrink-0" />
              <div className="flex flex-col items-start w-full">
                <span className="text-[10px] uppercase tracking-widest text-white/40 font-black mb-1">Duration</span>
                <input 
                  type="text" 
                  placeholder={t('hero.when')} 
                  className="bg-transparent border-none focus:outline-none text-white w-full placeholder:text-white/30 font-bold text-lg"
                />
              </div>
            </div>

            <Button className="bg-sunset-orange hover:bg-orange-600 border-none px-12 h-20 rounded-[2.5rem] font-black text-xl shadow-2xl shadow-orange-950/40 group transition-all hover:scale-[1.02] active:scale-95 text-white">
              Explore Now
            </Button>
          </motion.div>
        </div>

        {/* Floating Icons Background */}
        <div className="absolute inset-0 z-10 pointer-events-none opacity-20">
            <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-1/4 left-10"><Mountain className="w-12 h-12 text-white" /></motion.div>
            <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute top-1/3 right-20"><Palmtree className="w-16 h-16 text-white" /></motion.div>
            <motion.div animate={{ y: [0, -30, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute bottom-1/4 left-1/4"><Umbrella className="w-10 h-10 text-white" /></motion.div>
        </div>
      </section>

      {/* Featured Experiences ("The Plans") */}
      <section className="py-32 bg-background relative transition-colors duration-500 overflow-hidden">
        {/* Abstract Background Element */}
        <div className="absolute -left-20 top-0 w-96 h-96 bg-sunset-orange/5 blur-[120px] rounded-full" />
        <div className="absolute -right-20 bottom-0 w-96 h-96 bg-ocean/5 blur-[120px] rounded-full" />

        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8"
          >
            <div className="max-w-3xl space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-px w-12 bg-sunset-orange" />
                <span className="text-sunset-orange font-black uppercase tracking-[0.3em] text-[10px]">Curated Selection</span>
              </div>
              <h2 className="text-6xl md:text-8xl font-black text-foreground font-display leading-none tracking-tighter">
                Epic Adventures <br />
                <span className="text-muted-foreground/30">Just for you</span>
              </h2>
              <p className="text-muted-foreground text-2xl font-medium max-w-xl leading-relaxed">
                Unlock hand-picked journeys designed by Morocco's elite local guides.
              </p>
            </div>
            <Link href="/search">
                <Button variant="outline" className="group rounded-[2.5rem] h-20 px-10 text-xl font-black gap-4 border-2 hover:bg-foreground hover:text-background transition-all">
                    View Full Catalog <ArrowRight className="group-hover:translate-x-3 transition-transform h-6 w-6" />
                </Button>
            </Link>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
          >
            {featuredTrips.length > 0 ? (
              featuredTrips.map((trip: any, i: number) => (
                <motion.div 
                  key={trip.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.8 }}
                >
                  <TripCard trip={trip} />
                </motion.div>
              ))
            ) : (
                <div className="col-span-full py-24 text-center border-4 border-dashed border-border rounded-[4rem] space-y-6">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto text-5xl">🔭</div>
                    <div className="space-y-2">
                        <h3 className="text-3xl font-black text-foreground font-display">No Available Adventures</h3>
                        <p className="text-muted-foreground text-lg font-medium">We're currently preparing new secret routes. Check back soon!</p>
                    </div>
                </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Travel Styles */}
      <section className="py-32 bg-muted/20 dark:bg-slate-950/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24 space-y-4">
            <Badge className="bg-ocean/10 text-ocean border-none px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-[0.3em]">Signature Styles</Badge>
            <h2 className="text-6xl md:text-8xl font-black text-foreground font-display tracking-tighter">How do you wander?</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
                { name: 'Adventure', Icon: Mountain, img: 'https://images.unsplash.com/photo-1542332213-9b5a5a3fab35' },
                { name: 'Cultural', Icon: Compass, img: 'https://images.unsplash.com/photo-1548013146-72479768bbaa' },
                { name: 'Luxury', Icon: Star, img: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750' },
                { name: 'Nature', Icon: Palmtree, img: 'https://images.unsplash.com/photo-1531390311787-8dfd0441e86a' }
            ].map(cat => (
              <motion.div 
                key={cat.name} 
                whileHover={{ y: -20 }}
                className="group relative h-[30rem] rounded-[3.5rem] overflow-hidden cursor-pointer shadow-2xl transition-all duration-700"
              >
                <img 
                  src={cat.img} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-125"
                  alt={cat.name}
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-sunset-orange/80 transition-all duration-700" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-white/10 backdrop-blur-xl flex items-center justify-center transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
                    <cat.Icon className="w-10 h-10" />
                  </div>
                  <span className="text-4xl font-black tracking-tighter">{cat.name}</span>
                </div>
                <div className="absolute bottom-10 left-10 right-10 flex justify-center opacity-0 group-hover:opacity-100 transform translate-y-10 group-hover:translate-y-0 transition-all duration-500">
                    <span className="text-xs font-black uppercase tracking-widest border border-white/40 px-6 py-3 rounded-full">Explore Style</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
                { Icon: Shield, title: "Secure Booking", desc: "Enterprise protection" },
                { Icon: PhoneIcon, title: "24/7 Support", desc: "Local assistance" },
                { Icon: Heart, title: "Verified Guides", desc: "Vetted for quality" },
                { Icon: Zap, title: "Instant Access", desc: "Direct confirmation" }
            ].map((feature, i) => (
                <div key={i} className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-muted dark:bg-slate-900 flex items-center justify-center text-sunset-orange">
                        <feature.Icon className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="font-black text-foreground font-display uppercase text-xs tracking-widest leading-none mb-1">{feature.title}</h4>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{feature.desc}</p>
                    </div>
                </div>
            ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="px-6 py-24">
        <div className="max-w-7xl mx-auto rounded-[4rem] h-[35rem] bg-sunset-orange relative overflow-hidden flex items-center justify-center text-center p-12">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            <div className="relative z-10 space-y-10 max-w-4xl">
                <h2 className="text-6xl md:text-8xl font-black text-white font-display tracking-tighter leading-none">Your journey starts with a simple "Oui"</h2>
                <div className="flex flex-wrap justify-center gap-6">
                    <Button className="h-20 px-12 rounded-[2rem] bg-white text-sunset-orange hover:bg-slate-100 font-black text-xl border-none shadow-2xl">
                        Start Exploration
                    </Button>
                    <Button variant="outline" className="h-20 px-12 rounded-[2rem] border-white/40 text-white hover:bg-white/10 font-black text-xl">
                        Contact Experience Team
                    </Button>
                </div>
            </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-12 border-t border-border mt-12">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sunset-orange text-white flex items-center justify-center font-black text-xl">O</div>
                <span className="text-xl font-black tracking-tighter">Ouiboo</span>
            </div>
            <div className="flex gap-10 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <Link href="/terms" className="hover:text-sunset-orange transition-colors">Terms</Link>
                <Link href="/privacy" className="hover:text-sunset-orange transition-colors">Privacy</Link>
                <Link href="/contact" className="hover:text-sunset-orange transition-colors">Contact</Link>
            </div>
            <p className="text-[10px] text-muted-foreground/50 font-black uppercase tracking-widest">© 2024 Explore Ouiboo</p>
          </div>
      </footer>
    </div>
  );
}

function PhoneIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
