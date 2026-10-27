// app/layout.tsx
import React from "react";
import { Metadata } from "next";
import { Manrope, Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import "./globals.css";
import { getInitialLanguage, languageInitScript } from '@ouiboo/i18n/server';
import { buildLandingMetadata } from "../lib/metadata";

import Providers from "../components/Providers";
import LoadingSpinner from "../components/LoadingSpinner"; // Import the spinner
import AnalyticsConsent from "../components/AnalyticsConsent";
import { Suspense } from "react";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  // #563/#564: locale-driven metadata (title/description/og:locale per
  // en/fr/ar, canonical tagline shared with email) on the resolved
  // public origin — never the old hard-coded English copy on a
  // localhost metadataBase.
  const locale = await getInitialLanguage();
  return buildLandingMetadata(locale);
}

export default async function RootLayout({
  children
}: { 
  children: React.ReactNode;
}) {
  const currentLocale = await getInitialLanguage();

  return (
    <html lang={currentLocale} dir={currentLocale === 'ar' ? 'rtl' : 'ltr'} data-emphasis="landing" suppressHydrationWarning={true}>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`} suppressHydrationWarning>
        <Script
          id="language-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: languageInitScript }}
        />
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-[#07152f] focus:shadow-lg">
          Skip to content
        </a>
        {/* Pass the current locale to the provider */}
        <Providers locale={currentLocale}>
          {/* Use the new LoadingSpinner as the Suspense fallback */}
<Suspense fallback={<LoadingSpinner />}>
            {children}
          </Suspense>
          <AnalyticsConsent />
        </Providers>
      </body>
    </html>
  );
}
