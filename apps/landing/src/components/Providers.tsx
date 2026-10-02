'use client';

import { ThemeProvider } from 'next-themes';
import { MotionConfig } from 'framer-motion';
import TranslationsProvider from './TranslationsProvider';

export default function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MotionConfig reducedMotion="user">
        <TranslationsProvider locale={locale}>{children}</TranslationsProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
