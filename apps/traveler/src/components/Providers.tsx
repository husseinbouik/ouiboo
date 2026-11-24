'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { AuthProvider } from './AuthContext';
import { DisplayCurrencyProvider } from '@/lib/display-currency';
import { AuthModal } from './AuthModal';
import { ToastProvider } from '@ouiboo/ui';
import { ThemeProvider } from 'next-themes';
import { createTravelerI18n, type SupportedLanguage } from '@/lib/i18n';
import type { ResourceKey } from 'i18next';
import { SkipLink } from './SkipLink';
import { restorePublicQueryCache, subscribePublicQueryCache } from '@/lib/query-persistence';

export default function Providers({
    children,
    initialLanguage,
    initialResources,
}: {
    children: React.ReactNode;
    initialLanguage: SupportedLanguage;
    initialResources: ResourceKey;
}) {
    // F1: the traveller i18n instance is created once, synchronously,
    // from the language + dictionary the server embedded in this render
    // (root layout → getInitialLanguage + lib/server-translations). The
    // first render is therefore fully translated on the server AND on
    // the client — identical output, so the #122 (no raw keys) and #245
    // (no hydration mismatch) invariants hold by construction and the
    // old mount/ready null gate is gone: SSR now ships real page
    // content instead of an empty shell. Language switches still load
    // the other locales over HTTP via the backend, and i18next keeps
    // rendering the previous language until the new bundle arrives, so
    // the tree never blanks mid-switch either.
    const [i18n] = useState(() => createTravelerI18n(initialLanguage, initialResources));

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

    useEffect(() => {
        const syncDocumentLanguage = (language: string) => {
            const lng = language.split('-')[0];
            document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
            document.documentElement.lang = lng;
        };
        syncDocumentLanguage(i18n.language);
        i18n.on('languageChanged', syncDocumentLanguage);
        return () => {
            i18n.off('languageChanged', syncDocumentLanguage);
        };
    }, [i18n]);

    return (
        <I18nextProvider i18n={i18n}>
            {/* F1: SkipLink lives inside the provider now so it renders
                server-side too (it previously sat outside <Providers>
                behind its own #245 mount gate). It stays the first
                focusable element in the body. */}
            <SkipLink />
            <QueryClientProvider client={queryClient}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <MotionConfig reducedMotion="user">
                        <AuthProvider>
                            {/* #498 rework: display-currency context (profile
                                value for signed-in travellers, local guest
                                preference otherwise). Inside AuthProvider —
                                it reads the profile — and inside the query
                                client, which caches the FX rates. */}
                            <DisplayCurrencyProvider>
                            {/* #485: shared toast host (Undo actions, error
                                surfacing for optimistic mutations). */}
                            <ToastProvider>
                                {children}
                                <AuthModal />
                            </ToastProvider>
                            </DisplayCurrencyProvider>
                        </AuthProvider>
                    </MotionConfig>
                </ThemeProvider>
                {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
            </QueryClientProvider>
        </I18nextProvider>
    );
}
