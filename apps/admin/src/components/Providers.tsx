'use client';

import { AppProviders } from '@ouiboo/auth';
import { ToastProvider } from '@ouiboo/ui';
import { AuthProvider } from './AuthContext';
import '@/lib/i18n';

/**
 * Admin providers — since #1018 (finding D8) the common shell
 * (QueryClient defaults, theme nesting, RTL document-language sync,
 * devtools) comes from `@ouiboo/auth`'s `AppProviders`; this file
 * composes only the admin-specific providers inside it.
 *
 * `motion={false}` preserves admin's existing behaviour exactly:
 * unlike traveller/agency, admin never wrapped its tree in
 * framer-motion's MotionConfig. The drift is recorded here rather
 * than silently changed.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AppProviders motion={false}>
            <AuthProvider>
                {/* M2 (Design Council 2026-11-24): admin was the only
                    app with no toast host, so operator actions
                    confirmed silently. The shared ToastProvider
                    animates 200ms in / 150ms out (MOTION_TOKENS). */}
                <ToastProvider>
                    {children}
                </ToastProvider>
            </AuthProvider>
        </AppProviders>
    );
}
