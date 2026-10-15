'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const authRoutes = ['/login'];
  const isAuthPage = authRoutes.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthPage && !user) {
        router.replace('/login');
      } else if (isAuthPage && user) {
        router.replace('/');
      }
    }
  }, [isAuthPage, isLoading, user, router]);

  if (isAuthPage) {
    // Authenticated users are redirected to dashboard; show loading during redirect
    if (isLoading || user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      );
    }
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

  return <>{children}</>;
}
