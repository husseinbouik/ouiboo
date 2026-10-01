// app/layout.tsx
import React from "react";
import { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Manrope, Space_Grotesk } from 'next/font/google';
import Script from 'next/script';
import "./globals.css";
import { getInitialLanguage, languageInitScript } from '@ouiboo/i18n/server';

import Providers from "../components/Providers";
import LoadingSpinner from "../components/LoadingSpinner"; // Import the spinner
import AnalyticsConsent from "../components/AnalyticsConsent";
import { Suspense } from "react";
import { Analytics } from '@vercel/analytics/react';

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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:3004'),
  applicationName: "Ouiboo",
  title: {
    default: "Ouiboo — Travel experiences, made personal",
    template: "%s | Ouiboo",
  },
  description: "Discover memorable trips from local travel experts and manage every booking with confidence.",
  keywords: ["Ouiboo", "travel marketplace", "travel experiences", "travel agencies", "local travel experts"],
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

export default async function RootLayout({
  children
}: { 
  children: React.ReactNode;
}) {
  const currentLocale = await getInitialLanguage();

  return (
    <html lang={currentLocale} dir={currentLocale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning={true}>
      <body className={`${GeistSans.variable} ${GeistMono.variable} ${manrope.variable} ${spaceGrotesk.variable} antialiased`} suppressHydrationWarning>
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
              <Analytics />
      </body>
    </html>
  );
}
