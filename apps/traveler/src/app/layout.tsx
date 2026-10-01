import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { SITE_DESCRIPTION, SITE_NAME, TRAVELER_URL } from "@/lib/site";

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
  metadataBase: new URL(TRAVELER_URL),
  applicationName: SITE_NAME,
  title: {
    default: "Ouiboo — Find trips worth remembering",
    template: "%s | Ouiboo",
  },
  description: SITE_DESCRIPTION,
  keywords: ["travel marketplace", "travel experiences", "local travel agencies", "Morocco trips", "Ouiboo"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Ouiboo — Find trips worth remembering",
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ouiboo — Find trips worth remembering",
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

import { getInitialLanguage, languageInitScript, type SupportedLanguage } from '@ouiboo/i18n/server';
import travelerEn from '../../public/locales/en/translation.json';
import travelerFr from '../../public/locales/fr/translation.json';
import travelerAr from '../../public/locales/ar/translation.json';
import { Analytics } from '@vercel/analytics/react';

const SKIP_LINK_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: travelerEn.common.skipToContent,
  fr: travelerFr.common.skipToContent,
  ar: travelerAr.common.skipToContent,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLanguage = await getInitialLanguage();
  const skipToContent = SKIP_LINK_BY_LANGUAGE[initialLanguage];

  return (
    <html lang={initialLanguage} dir={initialLanguage === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} antialiased selection:bg-accent selection:text-accent-foreground`} suppressHydrationWarning>
        <Script
          id="language-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: languageInitScript }}
        />
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:text-foreground focus:shadow-lg">
          {skipToContent}
        </a>
        <Providers>
          <Navbar />
          <main id="main-content" className="min-h-screen" tabIndex={-1}>
            {children}
          </main>
        </Providers>
              <Analytics />
      </body>
    </html>
  );
}

