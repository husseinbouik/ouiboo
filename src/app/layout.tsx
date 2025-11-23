// app/layout.js
import { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import Script from 'next/script';
import "./globals.css";

import TranslationsProvider from "../components/TranslationsProvider";
import LoadingSpinner from "../components/LoadingSpinner"; // Import the spinner
import { Suspense } from "react";

// This is a placeholder for your i18n configuration
// You would typically have a file that exports your supported locales.
export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'fr', 'ar'],
};

export const metadata: Metadata = {
  title: "Ouiboo",
  description: "The future of travel planning.", // A more descriptive default
};

// The signature of RootLayout now accepts `params` to get the locale
export default function RootLayout({ children, params: { locale } }) {
  // Use the locale from the URL, or fall back to the default
  const currentLocale = i18n.locales.includes(locale) ? locale : i18n.defaultLocale;

  return (
    // The `lang` attribute is now dynamic
    <html lang={currentLocale} suppressHydrationWarning={true}>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {/* Pass the current locale to the provider */}
        <TranslationsProvider locale={currentLocale}>
          {/* Use the new LoadingSpinner as the Suspense fallback */}
          <Suspense fallback={<LoadingSpinner />}>
            {children}
          </Suspense>
        </TranslationsProvider>
        
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-NGNWG1877Q"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-NGNWG1877Q');
            `,
          }}
        />
      </body>
    </html>
  );
}