'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AgencySidebar } from "./layout/AgencySidebar";
import { AgencyNavbar } from "./layout/AgencyNavbar";
import { AgencyMobileNav } from "./AgencyMobileNav";

export function AgencyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/verify');

  if (isAuthPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex h-screen bg-off-white dark:bg-slate-950 overflow-hidden transition-colors duration-200" suppressHydrationWarning>
      <aside className="hidden md:flex flex-shrink-0">
        <AgencySidebar />
      </aside>
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" suppressHydrationWarning>
        <header className="flex items-center bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
            <div className="pl-4 md:hidden">
                <AgencyMobileNav />
            </div>
            <div className="flex-1">
                <AgencyNavbar />
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto" suppressHydrationWarning>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
