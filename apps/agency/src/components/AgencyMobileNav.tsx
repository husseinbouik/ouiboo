'use client';

import React from 'react';
import { Sheet, SheetContent, SheetTrigger, buttonVariants, Logo } from '@ouiboo/ui';
import { Menu, LayoutDashboard, Map, BookOpen, Wallet, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@ouiboo/ui/utils';

const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'My Trips', href: '/dashboard/trips', icon: Map },
    { name: 'Bookings', href: '/dashboard/bookings', icon: BookOpen },
    { name: 'Wallet & Payouts', href: '/dashboard/wallet', icon: Wallet },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function AgencyMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}>
        <Menu className="h-6 w-6" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800">
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
                    <Logo size={32} />
                    <span className="text-xl font-bold tracking-tight text-deep-blue dark:text-gray-100">Ouiboo</span>
                </Link>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1">
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
                                    ? "bg-deep-blue text-white shadow-lg shadow-blue-900/20 dark:bg-blue-600" 
                                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-gray-400")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="p-6 border-t bg-muted/30">
                <p className="text-sm font-medium text-muted-foreground">Copyright 2024 Ouiboo Platform</p>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
