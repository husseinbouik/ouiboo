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

  const isAuthPage = ['/login', '/signup', '/verify', '/forgot-password', '/reset-password', '/terms', '/privacy'].some(path => pathname.startsWith(path));

  if (isAuthPage) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 pointer-events-none sticky-like-nav">
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "pointer-events-auto flex items-center justify-between transition-all duration-300 w-full px-6 lg:px-8 h-20",
          scrolled 
            ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm" 
            : "bg-transparent"
        )}
      >
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-deep-blue text-white flex items-center justify-center font-bold text-lg">
                O
            </div>
            <span className="text-xl font-bold tracking-tight text-deep-blue dark:text-white">
                Ouiboo
            </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 mx-6">
            {mounted && navLinks.map((link) => (
                <Link 
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-sunset-orange transition-colors"
                >
                    {link.name}
                </Link>
            ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
            </div>

            {user ? (
                <div className="relative">
                    <button 
                        onMouseEnter={() => setProfileOpen(true)}
                        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-deep-blue text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name || 'Profile'} className="w-full h-full object-cover" />
                            ) : user.name ? (
                                user.name?.[0]?.toUpperCase()
                            ) : (
                                <User className="h-4 w-4" />
                            )}
                        </div>
                    </button>

                    <AnimatePresence>
                        {profileOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                onMouseLeave={() => setProfileOpen(false)}
                                className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden z-[60]"
                            >
                                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                                </div>
                                <div className="p-1">
                                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                                        <User className="w-4 h-4" /> {t('nav.profile')}
                                    </Link>
                                    <Link href="/bookings" className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                                        <CalendarIcon className="w-4 h-4" /> {t('nav.bookings')}
                                    </Link>
                                    {user.role === 'AGENCY' && (
                                        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-sunset-orange hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg">
                                            <LayoutDashboard className="w-4 h-4" /> Agency Panel
                                        </Link>
                                    )}
                                </div>
                                <div className="p-1 border-t border-gray-100 dark:border-gray-800">
                                    <button 
                                        onClick={logout}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                                    >
                                        <LogOut className="w-4 h-4" /> {t('nav.logout')}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex items-center gap-4">
                    <Link href="/login" className="text-sm font-semibold text-gray-900 dark:text-white hover:text-sunset-orange transition-colors">
                        {t('nav.login')}
                    </Link>
                    <Link href="/signup">
                        <Button className="rounded-md bg-sunset-orange hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 h-auto border-none shadow-sm transition-transform hover:scale-105">
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
