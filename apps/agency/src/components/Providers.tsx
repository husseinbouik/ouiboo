'use client';

import { AppProviders } from '@ouiboo/auth';
import { ToastProvider } from '@ouiboo/ui';
import { AuthProvider } from './AuthContext';
import '@/lib/i18n';

/**
 * Agency providers — since #1018 (finding D8) the common shell
 * (QueryClient defaults, theme/motion nesting, RTL document-language
 * sync, devtools) comes from `@ouiboo/auth`'s `AppProviders`; this
 * file composes only the agency-specific providers inside it.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AppProviders>
            <AuthProvider>
                {/* #867: shared toast host (same as traveller) —
                    without it, saves had no visible confirmation. */}
                <ToastProvider>
                    {children}
                </ToastProvider>
            </AuthProvider>
        </AppProviders>
    );
}
