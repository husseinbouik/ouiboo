import type { Metadata, Viewport } from "next";

// #491: viewport-fit=cover makes env(safe-area-inset-*) real on notched
// devices; the pb-safe / pt-safe utilities in @ouiboo/tokens consume them.
export const viewport: Viewport = {
  viewportFit: "cover",
};
import Script from "next/script";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { OG_LOCALES, SITE_COPY, SITE_NAME, TRAVELER_URL } from "@/lib/site";

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

/**
 * #563 traveller remainder (mirrors the landing alignment, PR #590):
 * metadata is locale-driven — title, description, og:locale (plus
 * alternateLocale) and Twitter copy come from SITE_COPY for the
 * visitor's active locale (the same getInitialLanguage chain the layout
 * renders with), carrying the ONE canonical tagline instead of the old
 * hard-coded English "Find trips worth remembering" + en_US.
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getInitialLanguage();
  const copy = SITE_COPY[locale];
  return {
    metadataBase: new URL(TRAVELER_URL),
    applicationName: SITE_NAME,
    title: {
      default: copy.title,
      template: "%s | Ouiboo",
    },
    description: copy.description,
    // #690 (Council S6): PWA — installable traveller app; the Booking
    // Pass renders offline once loaded (auth-aware service worker).
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "default", title: SITE_NAME },
    keywords: ["travel marketplace", "travel experiences", "local travel agencies", "Morocco trips", "Ouiboo"],
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: copy.title,
      description: copy.description,
      locale: copy.ogLocale,
      alternateLocale: OG_LOCALES.filter((value) => value !== copy.ogLocale),
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
    },
    robots: { index: true, follow: true },
  };
}

import { getInitialLanguage, languageInitScript, type SupportedLanguage } from '@ouiboo/i18n/server';
import { SkipLink } from '@/components/SkipLink';
import { WebVitals } from '@/components/WebVitals';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLanguage = await getInitialLanguage();

  return (
    <html lang={initialLanguage} dir={initialLanguage === 'ar' ? 'rtl' : 'ltr'} data-emphasis="traveler" suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} antialiased selection:bg-accent selection:text-accent-foreground`} suppressHydrationWarning>
        <Script
          id="language-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: languageInitScript }}
        />
        <SkipLink />
        <ServiceWorkerRegister />
        <Providers>
          <Navbar />
          <main id="main-content" className="min-h-screen" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </Providers>
              <WebVitals />
      </body>
    </html>
  );
}

