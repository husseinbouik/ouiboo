'use client';

import React from 'react';
import { Sheet, SheetContent, SheetTrigger, buttonVariants, LogoLockup } from '@ouiboo/ui';
import { Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { getAgencyNavGroups } from './layout/agency-nav';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@ouiboo/ui/utils';
import { useTranslation } from 'react-i18next';

export function AgencyMobileNav() {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const isRtl = i18n.language === 'ar';

  // Phase 4 (Nav A): mobile exposes the SAME grouped 17 items as the
  // desktop sidebar — nothing is dropped (Compliance/Refunds/Reviews
  // were previously unreachable on mobile).
  const navGroups = getAgencyNavGroups(t);
  const { data: navStats } = useQuery<{ payments?: { pendingVerificationCount?: number } }>({
    queryKey: ['agency-dashboard-stats'],
    queryFn: async () => (await apiClient.get('/agency/stats')).data,
    staleTime: 60_000,
  });
  const pendingProofs = navStats?.payments?.pendingVerificationCount ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger aria-label={t('navbar.openNavigation')} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}>
        <Menu className="h-6 w-6" />
      </SheetTrigger>
      <SheetContent side={isRtl ? 'right' : 'left'} className="w-[300px] p-0 bg-background border-e border-border">
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border">
                <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
                    <LogoLockup height={28} tone="auto" />
                </Link>
            </div>
            <nav aria-label={t('navbar.mainNavigation')} className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
                {navGroups.map((group) => (
                  <div key={group.label} className="space-y-1">
                    <p className="px-4 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{group.label}</p>
                    {group.items.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        const showBadge = item.badgeKey === 'proofs' && pendingProofs > 0;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-md font-medium transition-all",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                                {item.name}
                                {showBadge && (
                                  <span data-testid="nav-proof-badge" className="ms-auto inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-black text-accent-foreground">{pendingProofs}</span>
                                )}
                            </Link>
                        );
                    })}
                  </div>
                ))}
            </nav>
            <div className="p-6 border-t border-border bg-muted/30">
                <p className="text-sm font-medium text-muted-foreground">{t('navbar.mobileCopyright', { year: new Date().getFullYear() })}</p>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
