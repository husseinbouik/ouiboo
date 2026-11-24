'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut, PlusCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { getAgencyNavGroups } from './agency-nav';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@ouiboo/ui/utils';
import { Logo, LogoLockup } from '@ouiboo/ui';
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

  // Phase 4 (Nav A): pending proof-review count from the stats payload
  // the dashboard already consumes — shown as a badge on Bookings.
  const { data: navStats } = useQuery<{ payments?: { pendingVerificationCount?: number } }>({
    queryKey: ['agency-dashboard-stats'],
    queryFn: async () => (await apiClient.get('/agency/stats')).data,
    staleTime: 60_000,
  });
  const pendingProofs = navStats?.payments?.pendingVerificationCount ?? 0;
  const navGroups = getAgencyNavGroups(t);

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
        // #573: the collapse toggle was hover-only — unreachable on
        // touch and invisible to keyboard users until hovered. It is
        // now always visible on coarse pointers, fully visible on
        // focus, and `hit-slop` keeps its 44px target (#490).
        className="hit-slop absolute -end-3 top-20 bg-background border border-border rounded-full p-1.5 shadow-sm text-muted-foreground hover:text-primary z-50 opacity-100 [@media(hover:hover)]:opacity-40 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="flex h-16 items-center px-6 overflow-hidden shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3">
          {/* #794: expanded sidebar carries the final lockup; collapsed
              it cannot fit, so the Route-End symbol stands alone. */}
          {isCollapsed ? (
            <Logo size={32} tone="auto" />
          ) : (
            <>
              <LogoLockup height={28} tone="auto" />
            </>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!isCollapsed && (
              <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{group.label}</p>
            )}
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const showBadge = item.badgeKey === 'proofs' && pendingProofs > 0;
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
                  aria-label={showBadge ? t('sidebar.proofsToReview', { count: pendingProofs }) : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0 transition-colors',
                      isCollapsed ? 'mx-auto' : 'ms-3',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary',
                    )}
                  />
                  {!isCollapsed && (
                    <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="whitespace-nowrap">
                      {item.name}
                    </motion.span>
                  )}
                  {showBadge && (
                    <span data-testid="nav-proof-badge" className={cn('ms-auto inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-black text-accent-foreground', isCollapsed && 'absolute end-1 top-1 ms-0')}>
                      {pendingProofs}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

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
