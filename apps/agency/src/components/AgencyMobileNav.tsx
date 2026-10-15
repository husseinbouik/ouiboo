'use client';

import React from 'react';
import { Sheet, SheetContent, SheetTrigger, buttonVariants, Logo } from '@ouiboo/ui';
import { Menu, LayoutDashboard, Map, BookOpen, Wallet, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@ouiboo/ui/utils';
import { useTranslation } from 'react-i18next';

export function AgencyMobileNav() {
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const isRtl = i18n.language === 'ar';

  const navItems = [
    { name: t('sidebar.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('sidebar.myTrips'), href: '/dashboard/trips', icon: Map },
    { name: t('sidebar.bookings'), href: '/dashboard/bookings', icon: BookOpen },
    { name: t('sidebar.wallet'), href: '/dashboard/wallet', icon: Wallet },
    { name: t('sidebar.settings'), href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger aria-label={t('navbar.openNavigation')} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}>
        <Menu className="h-6 w-6" />
      </SheetTrigger>
      <SheetContent side={isRtl ? 'right' : 'left'} className="w-[300px] p-0 bg-background border-e border-border">
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border">
                <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
                    <Logo size={32} />
                    <span className="text-xl font-bold tracking-tight text-foreground">Ouiboo</span>
                </Link>
            </div>
            <nav aria-label={t('navbar.mainNavigation')} className="flex-1 px-4 py-6 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
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
                        </Link>
                    );
                })}
            </nav>
            <div className="p-6 border-t border-border bg-muted/30">
                <p className="text-sm font-medium text-muted-foreground">{t('navbar.mobileCopyright', { year: new Date().getFullYear() })}</p>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}