'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Map, 
  Calendar, 
  CreditCard,
  ShieldCheck,
  Settings, 
  LogOut,
  ChevronRight,
  PlusCircle,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@ouiboo/ui/utils';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';

export function AgencySidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const navigation = [
    { name: t('sidebar.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('sidebar.myTrips'), href: '/dashboard/trips', icon: Map },
    { name: t('sidebar.bookings'), href: '/dashboard/bookings', icon: Calendar },
    { name: 'Wallet & Payouts', href: '/dashboard/wallet', icon: CreditCard },
    { name: 'Compliance', href: '/dashboard/onboarding', icon: ShieldCheck },
    { name: t('sidebar.settings'), href: '/dashboard/settings', icon: Settings },
  ];

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  if (!mounted) return <div className="h-full w-64 bg-white border-r border-gray-200" suppressHydrationWarning />;

  return (
    <motion.div 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      className="flex h-full flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-colors duration-200 relative group"
      suppressHydrationWarning
    >
      <button 
        onClick={toggleCollapse}
        className="absolute -right-3 top-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full p-1.5 shadow-sm text-gray-500 hover:text-deep-blue dark:hover:text-blue-400 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="flex h-16 items-center px-6 overflow-hidden shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-deep-blue dark:bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shrink-0 shadow-lg shadow-blue-900/20">
            O
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold text-deep-blue dark:text-gray-100"
            >
              Ouiboo
            </motion.span>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative",
                isActive 
                  ? "bg-deep-blue text-white shadow-lg shadow-blue-950/20 dark:bg-blue-600" 
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-deep-blue dark:hover:text-blue-400"
              )}
              title={isCollapsed ? item.name : ''}
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0 transition-colors",
                isCollapsed ? "mx-auto" : "mr-3",
                isActive ? "text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-deep-blue dark:group-hover:text-blue-400"
              )} />
              
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="whitespace-nowrap"
                >
                  {item.name}
                </motion.span>
              )}
            </Link>
          );
        })}

        <div className={cn("pt-4 mt-4 border-t border-gray-100 dark:border-slate-800", isCollapsed && "items-center")}>
          <Link
            href="/dashboard/trips/create"
            className={cn(
              "flex items-center text-sm font-bold transition-all duration-200",
              isCollapsed 
                ? "justify-center w-10 h-10 mx-auto bg-sunset-orange text-white rounded-full shadow-lg shadow-orange-900/20" 
                : "px-4 py-3 text-sunset-orange bg-orange-50 dark:bg-orange-950/20 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/30"
            )}
            title={isCollapsed ? t('sidebar.createNew') : ""}
          >
            <PlusCircle className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3")} />
            {!isCollapsed && <span>{t('sidebar.createNew')}</span>}
          </Link>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-slate-800">
        <button 
          onClick={logout}
          className={cn(
            "flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-all duration-200 w-full",
            isCollapsed ? "justify-center py-3" : "px-3 py-2.5"
          )}
        >
          <LogOut className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span>{t('sidebar.signOut')}</span>}
        </button>
      </div>
    </motion.div>
  );
}
