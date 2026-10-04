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
import { Analytics } from '@vercel/analytics/react';
import { SkipLink } from '@/components/SkipLink';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLanguage = await getInitialLanguage();

  return (
    <html lang={initialLanguage} dir={initialLanguage === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} antialiased selection:bg-accent selection:text-accent-foreground`} suppressHydrationWarning>
        <Script
          id="language-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: languageInitScript }}
        />
        <SkipLink />
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

