'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, ThemeToggle, LanguageSwitcher, BetaBadge, Logo } from '@ouiboo/ui';
import {
  Menu,
  X,
  User,
  LogOut,
  Calendar as CalendarIcon,
  Heart,
  LayoutDashboard,
  Compass,
  LifeBuoy,
  Zap
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';
import { useTranslation } from 'react-i18next';
import { CurrencySelector } from './CurrencySelector';

export function Navbar() {
  const { t } = useTranslation();
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // #495: hover intent for the profile menu. A plain mouseenter/leave
  // pair snaps the menu shut when the pointer travels diagonally from
  // the trigger toward the menu (it briefly leaves both). The wrapper
  // below keeps the menu open while the pointer is anywhere inside it,
  // and leaving schedules a short intent delay instead of closing
  // instantly — crossing the gap/diagonal inside that window cancels
  // the close (the safe-triangle effect), while moving away still
  // closes promptly. Keyboard (focus/Esc) and touch (click toggle)
  // behaviour are explicit and unchanged in spirit.
  const profileCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  // #495 round 2: WHO opened the menu decides what a click does.
  // Witnessed defect on the round-1 build: the first click on the
  // trigger did nothing and a second click was required — on a
  // hover-capable device the pointer's arrival fires mouseenter
  // (hover-open) BEFORE the click lands, so the click's blind toggle
  // shut the just-opened menu. The menu now tracks its open source:
  // a click toggles only a menu it opened itself; against a hover-
  // or focus-opened menu the click PINS it open instead. Decisions
  // read profileOpenRef (synced synchronously by every open/close
  // path) so no handler can act on a stale render closure.
  const profileOpenSourceRef = useRef<'hover' | 'focus' | 'click'>('click');
  const profileOpenRef = useRef(false);
  // Set when Escape closes the menu and focus is returned to the
  // trigger programmatically: that synthetic focus must not re-open
  // the menu through the keyboard-focus path below.
  const profileSuppressFocusOpenRef = useRef(false);
  // #495 rework: hover open/close is a mouse-only affordance. Touch and
  // pen pointers (and click) must not fight it — the previous build
  // opened on any mouseenter and the click handler read the stale
  // profileOpen closure, so a click that landed right after a hover
  // open re-opened instead of closing (the menu "did not open on click
  // or hover" witness, 2026-10-28). Hover handling is now gated on
  // (hover: hover) and (pointer: fine), tracked live via matchMedia.
  const [hoverCapable, setHoverCapable] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setHoverCapable(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  const cancelProfileClose = () => {
    if (profileCloseTimer.current) {
      clearTimeout(profileCloseTimer.current);
      profileCloseTimer.current = null;
    }
  };
  const scheduleProfileClose = () => {
    cancelProfileClose();
    profileCloseTimer.current = setTimeout(() => {
      profileOpenRef.current = false;
      setProfileOpen(false);
    }, 350);
  };
  const openProfileMenu = (source: 'hover' | 'focus' | 'click') => {
    cancelProfileClose();
    profileOpenSourceRef.current = source;
    profileOpenRef.current = true;
    setProfileOpen(true);
  };
  const closeProfileNow = () => {
    cancelProfileClose();
    profileOpenRef.current = false;
    setProfileOpen(false);
  };
  // #495 rework: while the profile menu is open, a pointerdown
  // anywhere outside the trigger+menu closes it, and Escape closes it
  // regardless of which element holds focus. Both are document-level
  // so they behave identically for mouse, touch and keyboard users.
  useEffect(() => {
    if (!profileOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        closeProfileNow();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        profileSuppressFocusOpenRef.current = true;
        closeProfileNow();
        profileTriggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
    // closeProfileNow is a stable render-scope helper over refs/setState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileOpen]);

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
        // Session #3 P0-7b (#555): support was an orphan page — reachable
        // only from a booking. It is a first-class nav route now.
        { name: t('nav.support'), href: '/support', icon: <LifeBuoy className="w-4 h-4" /> },
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
          "pointer-events-auto flex items-center justify-between transition-all duration-300 w-full px-4 sm:px-6 lg:px-8 h-20",
          scrolled 
            ? "bg-card/80 backdrop-blur-md shadow-sm" 
            : "bg-transparent"
        )}
      >
        {/* Logo Section — #552 round 3: at 32px the shared pin
            mark's taper is ~5px and the mark collapsed to a dot in
            this bar (witnessed on the deployed build, while the
            agency/admin/landing lockups passed). 40px is the size
            at which the same mark already reads as a pin on the
            traveller auth pages and the admin login, so the navbar
            lockup renders at 40. Shared asset unchanged. */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
            <Logo size={40} />
            <span className="text-xl font-bold tracking-tight text-deep-blue dark:text-foreground">
                Ouiboo
            </span>
            <BetaBadge />
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
        <div className="flex items-center gap-2 sm:gap-4">
            {/* #648: on mobile the bar used to carry every control in
                one row until items clipped off the screen edge — the
                theme toggle below sm, then login/sign-up at phone
                widths (founder-witnessed in EN/FR/AR). The bar now
                keeps only what must be one tap away at every width:
                the theme toggle, sign-up and the avatar. Language and
                currency selectors join the links in the mobile menu
                below md (the desktop cluster here is md+ only, as
                before at desktop widths). */}
            <div className="hidden md:flex items-center gap-2">
                <LanguageSwitcher />
                <CurrencySelector />
            </div>
            <ThemeToggle />

            {isAuthLoading ? (
                <div className="flex items-center gap-4">
                    <div className="h-9 w-16 rounded-md bg-muted/50 animate-pulse" />
                    <div className="h-9 w-24 rounded-md bg-muted/50 animate-pulse" />
                </div>
            ) : user ? (
                <div
                    ref={profileMenuRef}
                    className="relative"
                    onMouseEnter={() => {
                        if (!hoverCapable) return;
                        if (profileOpenRef.current) cancelProfileClose();
                        else openProfileMenu('hover');
                    }}
                    onMouseLeave={() => { if (hoverCapable) scheduleProfileClose(); }}
                >
                    <button
                        ref={profileTriggerRef}
                        onClick={() => {
                            cancelProfileClose();
                            if (!profileOpenRef.current) {
                                openProfileMenu('click');
                            } else if (profileOpenSourceRef.current !== 'click') {
                                // Pin: hover/focus opened the menu during
                                // this same gesture — the click confirms it
                                // open instead of toggling it shut (the
                                // round-1 "first click does nothing" defect).
                                profileOpenSourceRef.current = 'click';
                            } else {
                                closeProfileNow();
                            }
                        }}
                        onFocus={(event) => {
                            if (profileSuppressFocusOpenRef.current) {
                                profileSuppressFocusOpenRef.current = false;
                                return;
                            }
                            // Keyboard focus opens the menu; pointer-driven
                            // focus must not, or the click that follows it
                            // would toggle the just-opened menu shut.
                            let focusVisible = false;
                            try { focusVisible = event.currentTarget.matches(':focus-visible'); } catch { focusVisible = false; }
                            if (focusVisible) openProfileMenu('focus');
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                profileSuppressFocusOpenRef.current = true;
                                closeProfileNow();
                                profileTriggerRef.current?.focus();
                            }
                        }}
                        aria-label={t('nav.openProfileMenu', 'Open profile menu')}
                        aria-expanded={profileOpen}
                        aria-haspopup="menu"
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
                                role="menu"
                                onMouseEnter={() => { if (hoverCapable) cancelProfileClose(); }}
                                onMouseLeave={() => { if (hoverCapable) scheduleProfileClose(); }}
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
                <div className="flex items-center gap-2 sm:gap-4">
                    {/* #648: login moves into the mobile menu below md;
                        sign-up — the primary CTA — stays visible in
                        the bar at every width, sized down on phones so
                        nothing clips. */}
                    <Link href="/login" className="hidden md:inline-flex text-sm font-semibold text-foreground hover:text-sunset-orange transition-colors">
                        {t('nav.login')}
                    </Link>
                    <Button asChild className="rounded-md bg-sunset-orange-dark hover:bg-[#b03d11] text-white font-semibold text-sm px-3.5 sm:px-5 py-2.5 h-auto border-none shadow-sm transition-transform hover:scale-105">
              <Link href="/signup">{t('nav.joinNow')}</Link>
            </Button>
                </div>
            )}

            {/* Mobile Menu Trigger */}
            <button 
                onClick={() => setIsOpen(true)}
                aria-label={t('nav.openMenu', 'Open navigation menu')}
                aria-expanded={isOpen}
                aria-controls="traveler-mobile-menu"
                className={cn(
                    "md:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-all hit-slop",
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
                     {/* #552 round 3: same lockup size as the desktop bar (40). */}
                     <Logo size={40} />
                     <span className="text-xl font-black">Ouiboo</span>
                     <BetaBadge />
                  </div>
                  <button ref={mobileMenuCloseRef} onClick={() => setIsOpen(false)} aria-label={t('nav.closeMenu', 'Close navigation menu')} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hit-slop">
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
                        <Link onClick={() => setIsOpen(false)} href="/support" className="flex items-center justify-between text-2xl font-black border-b border-border pb-4">
                            {t('nav.support')} <LifeBuoy className="text-sunset-orange" />
                        </Link>
               </div>

               {/* #648: language + currency selectors live in the
                   mobile menu (below md they leave the bar so the
                   toggle, sign-up and avatar always fit). */}
               <div className="flex items-center gap-3">
                   <LanguageSwitcher />
                   <CurrencySelector />
               </div>

               {!isAuthLoading && !user && (
                 <div className="space-y-4 pt-10">
                    <Link onClick={() => setIsOpen(false)} href="/signup" className="block w-full py-5 rounded-2xl bg-sunset-orange-dark text-white font-black text-center text-xl shadow-xl shadow-orange-900/20">
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

