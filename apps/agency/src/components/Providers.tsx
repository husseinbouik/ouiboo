'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from './AuthContext';
import '@/lib/i18n';

export default function Providers({ children }: { children: React.ReactNode }) {
    const { i18n } = useTranslation();
    const mounted = useSyncExternalStore(
        () => () => undefined,
        () => true,
        () => false,
    );
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                refetchOnWindowFocus: false,
                retry: 1,
            },
        },
    }));

    useEffect(() => {
        // Set document direction for RTL support
        const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.dir = dir;
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    if (!mounted) {
        return <div className="min-h-screen bg-background" />;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </ThemeProvider>
            {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </QueryClientProvider>
    );
}
