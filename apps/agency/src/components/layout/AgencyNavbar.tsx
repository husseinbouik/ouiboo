'use client';

import { Bell, User, LogOut, Sun, Moon, Languages } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { cn } from '@ouiboo/ui/utils';

export function AgencyNavbar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '??';

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'fr' : i18n.language === 'fr' ? 'ar' : 'en';
    i18n.changeLanguage(nextLang);
  };

  if (!mounted) return null;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10 transition-colors duration-200">
      <div className="flex-1">
        {/* Search removed as requested */}
      </div>

      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <button 
          onClick={toggleLanguage}
          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
          title="Switch Language"
        >
          <Languages className="h-5 w-5" />
          <span className="text-xs font-bold uppercase">{i18n.language || 'en'}</span>
        </button>

        {/* Theme Toggle */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg relative transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-700">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-sunset-orange rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>
        
        <div className="h-8 w-px bg-gray-200 dark:bg-slate-800 mx-2"></div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 p-1 pr-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors group">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-deep-blue dark:text-blue-400 font-bold text-xs border border-deep-blue/10 dark:border-blue-400/10">
              {initials}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-deep-blue dark:group-hover:text-blue-400 transition-colors">
                {user?.name || 'Loading...'}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">
                {user?.agencyProfile?.companyName || 'Agency Profile Pending'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
