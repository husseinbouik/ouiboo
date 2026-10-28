'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './AuthContext';
import { AuthModal } from './AuthModal';
import { ToastProvider } from '@ouiboo/ui';
import { ThemeProvider } from 'next-themes';
import '@/lib/i18n';
import { restorePublicQueryCache, subscribePublicQueryCache } from '@/lib/query-persistence';

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => {
        const client = new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 60 * 1000,
                    refetchOnWindowFocus: false,
                    retry: 1,
                },
            },
        });
        // #333: repeat visits paint instantly from the persisted public
        // catalog snapshot; fresh data refetches in the background.
        restorePublicQueryCache(client);
        return client;
    });

    useEffect(() => subscribePublicQueryCache(queryClient), [queryClient]);
    const { i18n, ready } = useTranslation();
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.dir = dir;
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    // Don't render until translations are loaded to avoid flash of raw keys (#122).
    // The mount gate (#245) makes that deterministic across hydration: SSR
    // always renders null here (translations load over HTTP), and the first
    // client render must render null too — if the translation load wins
    // the race against hydration, `ready` is already true at first render
    // and the full tree mismatches the server HTML (React error #418,
    // caught by the production smoke suite on the SkipLink, which sits
    // outside this gate; same race applies here).
    if (!mounted || !ready) {
        return null;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <MotionConfig reducedMotion="user">
                    <AuthProvider>
                        {/* #485: shared toast host (Undo actions, error
                            surfacing for optimistic mutations). */}
                        <ToastProvider>
                            {children}
                            <AuthModal />
                        </ToastProvider>
                    </AuthProvider>
                </MotionConfig>
            </ThemeProvider>
            {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </QueryClientProvider>
    );
}

