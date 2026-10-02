import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { AdminShell } from "@/components/AdminShell";
import { getInitialLanguage, languageInitScript, type SupportedLanguage } from '@ouiboo/i18n/server';
import adminEn from '../../public/locales/en/translation.json';
import adminFr from '../../public/locales/fr/translation.json';
import adminAr from '../../public/locales/ar/translation.json';
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

const META_BY_LANGUAGE: Record<SupportedLanguage, { title: string; description: string; skipToContent: string }> = {
  en: {
    title: adminEn.meta.titleDefault,
    description: adminEn.meta.description,
    skipToContent: adminEn.common.skipToContent,
  },
  fr: {
    title: adminFr.meta.titleDefault,
    description: adminFr.meta.description,
    skipToContent: adminFr.common.skipToContent,
  },
  ar: {
    title: adminAr.meta.titleDefault,
    description: adminAr.meta.description,
    skipToContent: adminAr.common.skipToContent,
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const initialLanguage = await getInitialLanguage();
  const meta = META_BY_LANGUAGE[initialLanguage];

  return {
    title: {
      default: meta.title,
      template: adminEn.meta.titleTemplate,
    },
    description: meta.description,
    robots: { index: false, follow: false, noarchive: true },
  };
}

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLanguage = await getInitialLanguage();
  const meta = META_BY_LANGUAGE[initialLanguage];

  return (
    <html lang={initialLanguage} dir={initialLanguage === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
        <Script
          id="language-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: languageInitScript }}
        />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:text-foreground focus:shadow-lg">
          {meta.skipToContent}
        </a>
        <Providers>
          <AdminShell>
            {children}
          </AdminShell>
        </Providers>
              <Analytics />
      </body>
    </html>
  );
}