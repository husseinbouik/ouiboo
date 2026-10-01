'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AgencySidebar } from "./layout/AgencySidebar";
import { AgencyNavbar } from "./layout/AgencyNavbar";
import { AgencyMobileNav } from "./AgencyMobileNav";
import { useAuth } from "./AuthContext";
import { Loader2 } from "lucide-react";

export function AgencyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const authRoutes = ['/login', '/signup', '/verify', '/forgot-password', '/reset-password', '/terms', '/privacy'];
  const isAuthPage = authRoutes.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (!isAuthPage && !isLoading && !user) {
      router.replace('/login');
    }
  }, [isAuthPage, isLoading, user, router]);

  if (isAuthPage) {
    return <main id="main-content" tabIndex={-1} className="min-h-screen">{children}</main>;
  }

  // While checking auth, or when unauthenticated (redirect pending),
  // never render protected content — show a loading state instead.
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden transition-colors duration-200" suppressHydrationWarning>
      <aside className="hidden md:flex flex-shrink-0">
        <AgencySidebar />
      </aside>
      
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden" suppressHydrationWarning>
        <header className="flex items-center bg-background border-b border-border">
            <div className="ps-4 md:hidden">
                <AgencyMobileNav />
            </div>
            <div className="flex-1">
                <AgencyNavbar />
            </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto" suppressHydrationWarning>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
