'use client';

/**
 * Shared app-providers shell (#1018, finding D8).
 *
 * Every portal cloned the same Providers.tsx boilerplate — identical
 * React Query defaults, the RTL document-language effect, the
 * ThemeProvider / MotionConfig nesting and the dev-only devtools —
 * and the clones drifted (the #245 hydration fix landed in traveler's
 * copy only). `AppProviders` + `makeQueryClient` are now the single
 * implementation of that common shell; each app's Providers.tsx keeps
 * only what is app-specific (its AuthProvider, toast host, and extras
 * like traveler's currency provider / auth modal), composed as
 * children inside the shell.
 *
 * Nesting order is the one all three portals already used:
 * QueryClientProvider → ThemeProvider → MotionConfig → children,
 * with ReactQueryDevtools last in development.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { i18n as I18nInstance } from 'i18next';

/** The React Query defaults every portal had cloned verbatim. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

/**
 * Keeps `<html dir lang>` in sync with the active language (RTL for
 * Arabic). Event-driven so it also follows in-session language
 * switches, not just the language at first render.
 */
function DocumentLanguageSync({ instance }: { instance?: I18nInstance }) {
  const { i18n } = useTranslation();
  const active = instance ?? i18n;

  useEffect(() => {
    const syncDocumentLanguage = (language: string) => {
      const lng = language.split('-')[0];
      document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = lng;
    };
    syncDocumentLanguage(active.language);
    active.on('languageChanged', syncDocumentLanguage);
    return () => {
      active.off('languageChanged', syncDocumentLanguage);
    };
  }, [active]);

  return null;
}

export interface AppProvidersProps {
  children: ReactNode;
  /**
   * A pre-built QueryClient (traveler restores its persisted public
   * cache into one). Defaults to a fresh `makeQueryClient()`.
   */
  queryClient?: QueryClient;
  /**
   * The i18n instance to sync the document language from (traveler's
   * per-render instance, F1). Defaults to the instance from context /
   * the global singleton (agency/admin).
   */
  i18nInstance?: I18nInstance;
  /**
   * Wrap children in framer-motion's MotionConfig
   * (reducedMotion="user"). Default true — traveler and agency had it.
   * Admin passes false to preserve its existing behaviour exactly;
   * the drift is recorded here rather than silently changed.
   */
  motion?: boolean;
}

export function AppProviders({
  children,
  queryClient,
  i18nInstance,
  motion = true,
}: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? makeQueryClient());

  return (
    <QueryClientProvider client={client}>
      <DocumentLanguageSync instance={i18nInstance} />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {motion ? <MotionConfig reducedMotion="user">{children}</MotionConfig> : children}
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
