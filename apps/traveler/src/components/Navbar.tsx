'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@ouiboo/ui';
import { 
  Search, 
  Menu, 
  X, 
  User, 
  LogOut, 
  Calendar as CalendarIcon, 
  Heart,
  ChevronDown,
  Globe,
  LayoutDashboard,
  Compass,
  Zap
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = pathname === '/';
  const isTransparent = isHome && !scrolled;

  const navLinks = [
    { name: t('nav.explore'), href: '/search', icon: <Compass className="w-4 h-4" /> },
    { name: t('nav.featured'), href: '/trips/featured', icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed top-0 w-full z-50 flex justify-center p-6 pointer-events-none">
      <motion.nav 
        initial={false}
        animate={{
            y: scrolled ? 0 : 0,
            width: scrolled ? "auto" : "100%",
            maxWidth: scrolled ? "800px" : "1200px",
        }}
        className={cn(
          "pointer-events-auto flex items-center justify-between transition-all duration-500 ease-in-out px-6 h-16 rounded-[2rem]",
          scrolled 
            ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-none ring-1 ring-black/5 dark:ring-white/5" 
            : "bg-transparent"
        )}
      >
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-sunset-orange text-white flex items-center justify-center font-black text-xl shadow-lg group-hover:rotate-12 transition-transform">
                O
            </div>
            {!scrolled && (
                <span className={cn(
                    "text-xl font-black tracking-tighter transition-all duration-300",
                    isTransparent ? "text-white" : "text-foreground"
                )}>
                    Ouiboo
                </span>
            )}
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-2 mx-6">
            {mounted && navLinks.map((link) => (
                <Link 
                    key={link.href}
                    href={link.href}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300",
                        isTransparent 
                            ? "text-white/80 hover:text-white hover:bg-white/10" 
                            : scrolled 
                                ? "text-foreground/70 hover:text-foreground hover:bg-foreground/5" 
                                : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                    )}
                >
                    {link.icon}
                    {link.name}
                </Link>
            ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
            <div className={cn(
                "hidden sm:flex items-center gap-1.5 p-1 rounded-xl transition-all duration-300",
                isTransparent ? "bg-white/10" : "bg-muted/50"
            )}>
                <LanguageSwitcher isTransparent={isTransparent} />
                <ThemeToggle isTransparent={isTransparent} />
            </div>

            {user ? (
                <div className="relative">
                    <button 
                        onMouseEnter={() => setProfileOpen(true)}
                        className={cn(
                            "flex items-center gap-2 p-1.5 rounded-xl transition-all duration-300 border",
                            isTransparent 
                                ? "bg-white/10 border-white/20 text-white" 
                                : "bg-white dark:bg-slate-900 border-border shadow-sm text-foreground"
                        )}
                    >
                        <div className="w-7 h-7 rounded-lg bg-sunset-orange text-white flex items-center justify-center font-black text-[10px] shadow-inner">
                            {user.name?.[0]?.toUpperCase()}
                        </div>
                        <ChevronDown className={cn("h-3 w-3 opacity-50", profileOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                        {profileOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                onMouseLeave={() => setProfileOpen(false)}
                                className="absolute right-0 mt-3 w-64 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-border overflow-hidden z-[60]"
                            >
                                <div className="p-5 bg-muted/20 border-b border-border">
                                    <p className="font-bold text-sm text-foreground truncate">{user.name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-widest">{user.role}</p>
                                </div>
                                <div className="p-2 space-y-1">
                                    <Link href="/profile" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all">
                                        <User className="h-4 w-4" /> {t('nav.profile')}
                                    </Link>
                                    <Link href="/bookings" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all">
                                        <CalendarIcon className="h-4 w-4" /> {t('nav.bookings')}
                                    </Link>
                                    {user.role === 'AGENCY' && (
                                        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-sunset-orange hover:bg-sunset-orange/5 rounded-xl transition-all">
                                            <LayoutDashboard className="h-4 w-4" /> Agency Panel
                                        </Link>
                                    )}
                                </div>
                                <div className="p-2 border-t border-border">
                                    <button 
                                        onClick={logout}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                                    >
                                        <LogOut className="h-4 w-4" /> {t('nav.logout')}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Link href="/login">
                        <Button variant="ghost" className={cn(
                            "h-10 px-5 rounded-xl font-bold transition-all",
                            isTransparent ? "text-white hover:bg-white/10" : "text-foreground"
                        )}>
                            {t('nav.login')}
                        </Button>
                    </Link>
                    <Link href="/signup">
                        <Button className="h-10 px-6 rounded-xl font-black bg-sunset-orange hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-900/20 active:scale-95 transition-all">
                            Join Now
                        </Button>
                    </Link>
                </div>
            )}

            {/* Mobile Menu Trigger */}
            <button 
                onClick={() => setIsOpen(true)}
                className={cn(
                    "md:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    isTransparent ? "bg-white/10 text-white" : "bg-muted text-foreground"
                )}
            >
                <Menu className="h-5 w-5" />
            </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md md:hidden pointer-events-auto flex justify-end"
            onClick={() => setIsOpen(false)}
          >
            <motion.div 
               initial={{ x: "100%" }}
               animate={{ x: 0 }}
               transition={{ type: "spring", damping: 25 }}
               className="w-[80%] max-w-sm h-full bg-background p-8 space-y-12"
               onClick={(e) => e.stopPropagation()}
            >
               <div className="flex justify-between items-center text-foreground">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-xl bg-sunset-orange text-white flex items-center justify-center font-black text-lg">O</div>
                     <span className="text-xl font-black">Ouiboo</span>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                     <X className="h-5 w-5" />
                  </button>
               </div>

               <div className="space-y-6">
                  <Link onClick={() => setIsOpen(false)} href="/search" className="flex items-center justify-between text-2xl font-black border-b border-border pb-4">
                     Explore <Zap className="text-sunset-orange" />
                  </Link>
                  <Link onClick={() => setIsOpen(false)} href="/trips/featured" className="flex items-center justify-between text-2xl font-black border-b border-border pb-4">
                     Featured <Heart className="text-pink-500" />
                  </Link>
               </div>

               {!user && (
                 <div className="space-y-4 pt-10">
                    <Link onClick={() => setIsOpen(false)} href="/signup" className="block w-full py-5 rounded-2xl bg-sunset-orange text-white font-black text-center text-xl shadow-xl shadow-orange-900/20">
                       Start Your Story
                    </Link>
                    <Link onClick={() => setIsOpen(false)} href="/login" className="block w-full py-5 rounded-2xl bg-muted font-bold text-center text-xl">
                       Sign In
                    </Link>
                 </div>
               )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
