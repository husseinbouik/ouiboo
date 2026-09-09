// app/layout.tsx
import React from "react";
import { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Script from 'next/script';
import "./globals.css";

import Providers from "../components/Providers";
import LoadingSpinner from "../components/LoadingSpinner"; // Import the spinner
import AnalyticsConsent from "../components/AnalyticsConsent";
import { Suspense } from "react";

// This is a placeholder for your i18n configuration
// You would typically have a file that exports your supported locales.
const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'fr', 'ar'],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:3004'),
  applicationName: "Ouiboo",
  title: {
    default: "Ouiboo — Travel experiences, made personal",
    template: "%s | Ouiboo",
  },
  description: "Discover memorable trips from local travel experts and manage every booking with confidence.",
  keywords: ["Ouiboo", "travel marketplace", "travel experiences", "travel agencies", "Morocco travel"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Ouiboo",
    title: "Ouiboo — Travel experiences, made personal",
    description: "Discover memorable trips from local travel experts and manage every booking with confidence.",
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ouiboo — Travel experiences, made personal",
    description: "Discover memorable trips from local travel experts and manage every booking with confidence.",
  },
  robots: { index: true, follow: true },
};

export const dynamic = 'force-dynamic';

type SupportedLanguage = typeof i18n.locales[number];

async function getInitialLanguage(): Promise<SupportedLanguage> {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const preferredLanguage =
    headerStore.get('x-ouiboo-language') ||
    cookieStore.get('i18nextLng')?.value ||
    i18n.defaultLocale;
  const language = preferredLanguage.split('-')[0].toLowerCase();

  return i18n.locales.includes(language)
    ? language
    : i18n.defaultLocale;
}

const languageInitScript = `
  (function () {
    try {
      var supported = ['en', 'fr', 'ar'];
      var params = new URLSearchParams(window.location.search);
      var queryLanguage = params.get('lang');
      var storedLanguage = window.localStorage.getItem('i18nextLng');
      var detectedLanguage = queryLanguage || storedLanguage || window.navigator.language || 'en';
      var language = String(detectedLanguage).split('-')[0].toLowerCase();
      if (supported.indexOf(language) === -1) language = 'en';
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      if (queryLanguage) {
        window.localStorage.setItem('i18nextLng', language);
        document.cookie = 'i18nextLng=' + language + '; path=/; max-age=31536000; SameSite=Lax';
      }
    } catch (error) {}
  })();
`;

export default async function RootLayout({ 
  children
}: { 
  children: React.ReactNode;
}) {
  const currentLocale = await getInitialLanguage();

  return (
    <html lang={currentLocale} dir={currentLocale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning={true}>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`} suppressHydrationWarning>
        <Script
          id="language-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: languageInitScript }}
        />
        {/* Pass the current locale to the provider */}
        <Providers locale={currentLocale}>
          {/* Use the new LoadingSpinner as the Suspense fallback */}
          <Suspense fallback={<LoadingSpinner />}>
            {children}
          </Suspense>
        </Providers>
        <AnalyticsConsent />
      </body>
    </html>
  );
}
