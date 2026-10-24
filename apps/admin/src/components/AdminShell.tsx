'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  // Portal role isolation (#367): only an ADMIN user counts as signed in on
  // this app. A valid non-admin session (e.g. a traveler signed in on the
  // same browser — the API session is shared across portals) can never
  // establish an admin BFF session, so treating it as "signed in" here sent
  // /login into an endless redirect loop with the proxy (/login -> / -> /login)
  // and the login form never rendered. Non-admin users are treated as
  // signed out for shell purposes: the login form renders for them.
  const isAdminUser = user?.role === 'ADMIN';
  const authRoutes = ['/login'];
  const isAuthPage = authRoutes.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthPage && !isAdminUser) {
        router.replace('/login');
      } else if (isAuthPage && isAdminUser) {
        router.replace('/');
      }
    }
  }, [isAuthPage, isLoading, isAdminUser, router]);

  if (isAuthPage) {
    // Admin users are redirected to the dashboard; show loading during redirect.
    // Anyone else (signed out or non-admin session) gets the login form.
    if (isLoading || isAdminUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      );
    }
    return <main id="main-content" tabIndex={-1} className="min-h-screen">{children}</main>;
  }

  // While checking auth, or when not an admin (redirect pending),
  // never render protected content — show a loading state instead.
  if (isLoading || !isAdminUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  return <>{children}</>;
}
