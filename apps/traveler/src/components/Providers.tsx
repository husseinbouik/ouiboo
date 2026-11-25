'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { AppProviders, makeQueryClient } from '@ouiboo/auth';
import { AuthProvider } from './AuthContext';
import { DisplayCurrencyProvider } from '@/lib/display-currency';
import { ToastProvider } from '@ouiboo/ui';
import { createTravelerI18n, type SupportedLanguage } from '@/lib/i18n';
import type { ResourceKey } from 'i18next';
import { SkipLink } from './SkipLink';
import { restorePublicQueryCache, subscribePublicQueryCache } from '@/lib/query-persistence';

// #1027 (F2): AuthModal is interaction-only chrome — split it out of
// the shared first-load bundle and fetch its chunk on mount instead.
const AuthModal = dynamic(() => import('./AuthModal').then((m) => m.AuthModal), { ssr: false });

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

    // #1018 (D8): the QueryClient defaults, theme/motion nesting, the
    // document-language (RTL) sync and the devtools now come from the
    // shared `@ouiboo/auth` shell — this file keeps only the
    // traveller-specific pieces: the persisted public cache (#333),
    // the currency provider, the toast host and the auth modal.
    const [queryClient] = useState(() => {
        const client = makeQueryClient();
        // #333: repeat visits paint instantly from the persisted public
        // catalog snapshot; fresh data refetches in the background.
        restorePublicQueryCache(client);
        return client;
    });

    useEffect(() => subscribePublicQueryCache(queryClient), [queryClient]);

    return (
        <I18nextProvider i18n={i18n}>
            {/* F1: SkipLink lives inside the provider now so it renders
                server-side too (it previously sat outside <Providers>
                behind its own #245 mount gate). It stays the first
                focusable element in the body. */}
            <SkipLink />
            <AppProviders queryClient={queryClient} i18nInstance={i18n}>
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
            </AppProviders>
        </I18nextProvider>
    );
}
