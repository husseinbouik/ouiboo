'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Map, 
  BookOpen, 
  Wallet, 
  Settings,
  ChevronRight
} from 'lucide-react';
import { cn } from '@ouiboo/ui/utils';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Trips', href: '/trips', icon: Map },
  { name: 'Bookings', href: '/bookings', icon: BookOpen },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AgencySidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 border-r bg-card h-screen sticky top-0">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xl shadow-lg group-hover:rotate-12 transition-transform">
            O
          </div>
          <span className="text-xl font-bold tracking-tight">Ouiboo Agency</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("h-5 w-5", isActive ? "text-primary-foreground" : "group-hover:text-primary")} />
                {item.name}
              </div>
              {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="bg-muted/50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Support</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Need help with your trips? Contact our support team.</p>
            <button className="text-xs font-bold text-primary hover:underline">Get Help</button>
        </div>
      </div>
    </div>
  );
}
