'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Map,
  PlusCircle,
  Settings,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { useAuth } from '../AuthContext';

export function AgencySidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { t } = useTranslation();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [isCollapsed, setIsCollapsed] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('sidebar-collapsed') === 'true',
  );

  const navigation = [
    { name: t('sidebar.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('sidebar.analytics'), href: '/dashboard/analytics', icon: BarChart3 },
    { name: t('sidebar.myTrips'), href: '/dashboard/trips', icon: Map },
    { name: t('sidebar.bookings'), href: '/dashboard/bookings', icon: Calendar },
    { name: t('sidebar.reviews'), href: '/dashboard/reviews', icon: Star },
    { name: t('sidebar.wallet'), href: '/dashboard/wallet', icon: CreditCard },
    { name: t('sidebar.compliance'), href: '/dashboard/onboarding', icon: ShieldCheck },
    { name: t('sidebar.settings'), href: '/dashboard/settings', icon: Settings },
  ];

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

  if (!mounted) {
    return <div className="h-full w-64 bg-sidebar border-e border-sidebar-border" suppressHydrationWarning />;
  }

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      className="flex h-full flex-col bg-sidebar border-e border-sidebar-border transition-colors duration-200 relative group"
      suppressHydrationWarning
    >
      <button
        onClick={toggleCollapse}
        aria-label={isCollapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
        className="absolute -end-3 top-20 bg-background border border-border rounded-full p-1.5 shadow-sm text-muted-foreground hover:text-primary z-50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="flex h-16 items-center px-6 overflow-hidden shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold shrink-0 shadow-lg shadow-primary/20">
            O
          </div>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold text-foreground"
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
                'group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-primary',
              )}
              title={isCollapsed ? item.name : ''}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 flex-shrink-0 transition-colors',
                  isCollapsed ? 'mx-auto' : 'ms-3',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary',
                )}
              />

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

        <div className={cn('pt-4 mt-4 border-t border-border', isCollapsed && 'items-center')}>
          <Link
            href="/dashboard/trips/create"
            className={cn(
              'flex items-center text-sm font-bold transition-all duration-200',
              isCollapsed
                ? 'justify-center w-10 h-10 mx-auto bg-accent text-accent-foreground rounded-full shadow-lg shadow-accent/20'
                : 'px-4 py-3 text-accent bg-accent/10 rounded-xl hover:bg-accent/20',
            )}
            title={isCollapsed ? t('sidebar.createNew') : ''}
          >
            <PlusCircle className={cn('h-5 w-5 flex-shrink-0', !isCollapsed && 'ms-3')} />
            {!isCollapsed && <span>{t('sidebar.createNew')}</span>}
          </Link>
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={logout}
          className={cn(
            'flex items-center text-sm font-medium text-muted-foreground rounded-xl hover:bg-danger/10 hover:text-danger transition-all duration-200 w-full',
            isCollapsed ? 'justify-center py-3' : 'px-3 py-2.5',
          )}
        >
          <LogOut className={cn('h-5 w-5 flex-shrink-0', !isCollapsed && 'ms-3')} />
          {!isCollapsed && <span>{t('sidebar.signOut')}</span>}
        </button>
      </div>
    </motion.div>
  );
}
