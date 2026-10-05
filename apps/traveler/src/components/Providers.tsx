'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './AuthContext';
import { AuthModal } from './AuthModal';
import { ThemeProvider } from 'next-themes';
import '@/lib/i18n';

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
                refetchOnWindowFocus: false,
                retry: 1,
            },
        },
    }));
    const { i18n, ready } = useTranslation();

    useEffect(() => {
        const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.dir = dir;
        document.documentElement.lang = i18n.language;
    }, [i18n.language]);

    // Don't render until translations are loaded to avoid flash of raw keys (#122)
    if (!ready) {
        return null;
    }

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <MotionConfig reducedMotion="user">
                    <AuthProvider>
                        {children}
                        <AuthModal />
                    </AuthProvider>
                </MotionConfig>
            </ThemeProvider>
            {process.env.NODE_ENV === 'development' ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </QueryClientProvider>
    );
}

