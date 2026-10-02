'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, ThemeToggle, LanguageSwitcher } from '@ouiboo/ui';
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Calendar as CalendarIcon, 
  Heart,
  LayoutDashboard,
  Compass,
  Zap
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';
import { useTranslation } from 'react-i18next';

export function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    mobileMenuCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = mobileMenuRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

    const isHome = pathname === '/';
    const isTransparent = isHome && !scrolled;

    const { data: wishlistCountData } = useQuery({
        queryKey: ['wishlist-count'],
        queryFn: async () => {
            const res = await apiClient.get('/users/wishlist/count');
            return res.data;
        },
        enabled: !!user,
        staleTime: 1000 * 60, // 1 minute
    });

    const navLinks = [
        { name: t('nav.explore'), href: '/search', icon: <Compass className="w-4 h-4" /> },
        { name: t('nav.featured'), href: '/trips/featured', icon: <Zap className="w-4 h-4" /> },
        { name: t('nav.wishlist'), href: '/wishlist', icon: <Heart className="w-4 h-4" /> },
    ];

  const isAuthPage = ['/login', '/signup', '/verify', '/forgot-password', '/reset-password', '/terms', '/privacy'].some(path => pathname.startsWith(path));

  if (isAuthPage) return null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 pointer-events-none sticky-like-nav">
      <motion.nav 
        aria-label={t('nav.mainNavigation', 'Main navigation')}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "pointer-events-auto flex items-center justify-between transition-all duration-300 w-full px-6 lg:px-8 h-20",
          scrolled 
            ? "bg-card/80 backdrop-blur-md shadow-sm" 
            : "bg-transparent"
        )}
      >
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-deep-blue text-white flex items-center justify-center font-bold text-lg">
                O
            </div>
            <span className="text-xl font-bold tracking-tight text-deep-blue dark:text-foreground">
                Ouiboo
            </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 mx-6">
                        {mounted && navLinks.map((link) => (
                                <Link 
                                        key={link.href}
                                        href={link.href}
                                        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-sunset-orange transition-colors relative"
                                >
                                        <span className="relative flex items-center gap-2">
                                            {link.icon}
                                            <span>{link.name}</span>
                                            {link.href === '/wishlist' && wishlistCountData?.count > 0 && (
                                                <span className="absolute -top-2 -right-3 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                                                    {wishlistCountData.count}
                                                </span>
                                            )}
                                        </span>
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
                        onFocus={() => setProfileOpen(true)}
                        aria-label={t('nav.openProfileMenu', 'Open profile menu')}
                        aria-expanded={profileOpen}
                        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-muted/50 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-deep-blue text-white flex items-center justify-center font-bold text-xs overflow-hidden">
                            {user.avatar ? (
                                <div
                                  aria-label={user.name || 'Profile'}
                                  className="w-full h-full bg-cover bg-center"
                                  style={{ backgroundImage: `url("${user.avatar}")` }}
                                />
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
                                className="absolute right-0 mt-2 w-64 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-[60]"
                            >
                                <div className="p-4 border-b border-border">
                                    <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                                </div>
                                <div className="p-1">
                                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg">
                                        <User className="w-4 h-4" /> {t('nav.profile')}
                                    </Link>
                                    <Link href="/wishlist" className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg">
                                        <Heart className="w-4 h-4" /> {t('nav.wishlist')}
                                    </Link>
                                    <Link href="/bookings" className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg">
                                        <CalendarIcon className="w-4 h-4" /> {t('nav.bookings')}
                                    </Link>
                                </div>
                                <div className="p-1 border-t border-border">
                                    <button 
                                        onClick={logout}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 rounded-lg"
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
                    <Link href="/login" className="text-sm font-semibold text-foreground hover:text-sunset-orange transition-colors">
                        {t('nav.login')}
                    </Link>
                    <Link href="/signup">
                        <Button className="rounded-md bg-sunset-orange hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 h-auto border-none shadow-sm transition-transform hover:scale-105">
                            {t('nav.joinNow')}
                        </Button>
                    </Link>
                </div>
            )}

            {/* Mobile Menu Trigger */}
            <button 
                onClick={() => setIsOpen(true)}
                aria-label={t('nav.openMenu', 'Open navigation menu')}
                aria-expanded={isOpen}
                aria-controls="traveler-mobile-menu"
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
               id="traveler-mobile-menu"
               ref={mobileMenuRef}
               role="dialog"
               aria-modal="true"
               aria-label={t('nav.mobileMenu', 'Navigation menu')}
               className="w-[80%] max-w-sm h-full bg-background p-8 space-y-12"
               onClick={(e) => e.stopPropagation()}
            >
               <div className="flex justify-between items-center text-foreground">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-xl bg-sunset-orange text-white flex items-center justify-center font-black text-lg">O</div>
                     <span className="text-xl font-black">Ouiboo</span>
                  </div>
                  <button ref={mobileMenuCloseRef} onClick={() => setIsOpen(false)} aria-label={t('nav.closeMenu', 'Close navigation menu')} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                     <X className="h-5 w-5" />
                  </button>
               </div>

               <div className="space-y-6">
                        <Link onClick={() => setIsOpen(false)} href="/search" className="flex items-center justify-between text-2xl font-black border-b border-border pb-4">
                            {t('nav.explore')} <Zap className="text-sunset-orange" />
                        </Link>
                        <Link onClick={() => setIsOpen(false)} href="/trips/featured" className="flex items-center justify-between text-2xl font-black border-b border-border pb-4">
                            {t('nav.featured')} <Heart className="text-pink-500" />
                        </Link>
                        <Link onClick={() => setIsOpen(false)} href="/wishlist" className="flex items-center justify-between text-2xl font-black border-b border-border pb-4">
                            {t('nav.wishlist')} <Heart className="text-red-500" />
                            {wishlistCountData?.count > 0 && (
                              <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-[12px] font-bold">{wishlistCountData.count}</span>
                            )}
                        </Link>
               </div>

               {!user && (
                 <div className="space-y-4 pt-10">
                    <Link onClick={() => setIsOpen(false)} href="/signup" className="block w-full py-5 rounded-2xl bg-sunset-orange text-white font-black text-center text-xl shadow-xl shadow-orange-900/20">
                       {t('nav.startStory')}
                    </Link>
                    <Link onClick={() => setIsOpen(false)} href="/login" className="block w-full py-5 rounded-2xl bg-muted font-bold text-center text-xl">
                       {t('nav.login')}
                    </Link>
                 </div>
               )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

