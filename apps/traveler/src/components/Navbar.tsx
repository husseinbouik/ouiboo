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
  Calendar, 
  Heart,
  ChevronDown
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@ouiboo/ui/utils';
import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Navbar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = pathname === '/';

  return (
    <nav className={cn(
      "fixed top-0 w-full z-50 transition-all duration-300",
      scrolled || !isHome ? "bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 py-3" : "bg-transparent py-5"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xl transition-colors",
              scrolled || !isHome ? "bg-deep-blue text-white" : "bg-white text-deep-blue"
            )}>
              O
            </div>
            <span className={cn(
              "text-2xl font-bold tracking-tight transition-colors",
              scrolled || !isHome ? "text-deep-blue" : "text-white"
            )}>
              Ouiboo
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href="/search" 
              className={cn(
                "font-medium transition-colors hover:text-sunset-orange",
                scrolled || !isHome ? "text-gray-600" : "text-gray-200"
              )}
            >
              Explore
            </Link>
            <Link 
              href="/trips/featured" 
              className={cn(
                "font-medium transition-colors hover:text-sunset-orange",
                scrolled || !isHome ? "text-gray-600" : "text-gray-200"
              )}
            >
              Featured
            </Link>
            
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full border border-gray-200 bg-white hover:shadow-md transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-deep-blue text-white flex items-center justify-center font-bold text-sm">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden py-1"
                      onMouseLeave={() => setProfileOpen(false)}
                    >
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-deep-blue">
                        <User className="h-4 w-4" /> Profile
                      </Link>
                      <Link href="/bookings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-deep-blue">
                        <Calendar className="h-4 w-4" /> My Bookings
                      </Link>
                      <Link href="/wishlist" className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-deep-blue">
                        <Heart className="h-4 w-4" /> Wishlist
                      </Link>
                      <div className="border-t border-gray-50 mt-1">
                        <button 
                          onClick={logout}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="ml-4 border-l border-gray-200 pl-4 flex items-center gap-2">
                    <ThemeToggle />
                    <LanguageSwitcher />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link 
                  href="/login"
                  className={cn(
                    "font-bold transition-colors hover:text-sunset-orange",
                    scrolled || !isHome ? "text-deep-blue" : "text-white"
                  )}
                >
                  Log in
                </Link>
                <Link href="/signup">
                  <Button className="bg-sunset-orange hover:bg-orange-600 text-white border-none rounded-xl font-bold px-6 shadow-lg shadow-orange-900/20">
                    Sign up
                  </Button>
                </Link>
                <div className="border-l border-gray-200 h-6 mx-2"></div>
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 rounded-lg bg-white/10 backdrop-blur-sm text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-6 w-6 text-gray-900" /> : <Menu className={cn("h-6 w-6", scrolled || !isHome ? "text-gray-900" : "text-white")} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              <Link href="/search" className="block text-lg font-medium text-gray-900">Explore</Link>
              <Link href="/trips/featured" className="block text-lg font-medium text-gray-900">Featured Trips</Link>
              <div className="pt-4 border-t border-gray-100">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-deep-blue text-white flex items-center justify-center font-bold">
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <Link href="/bookings" className="block py-2 text-gray-600">My Bookings</Link>
                    <Link href="/profile" className="block py-2 text-gray-600">Profile</Link>
                    <button onClick={logout} className="block w-full text-left py-2 text-red-600 font-medium">Sign Out</button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link href="/login" className="block w-full py-3 text-center rounded-xl border border-gray-200 font-bold text-gray-700">Log in</Link>
                    <Link href="/signup" className="block w-full py-3 text-center rounded-xl bg-sunset-orange text-white font-bold">Sign up</Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
