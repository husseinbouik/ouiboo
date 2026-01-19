'use client';

import { ThemeProvider } from 'next-themes';
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
      <TranslationsProvider locale={locale}>{children}</TranslationsProvider>
    </ThemeProvider>
  );
}
