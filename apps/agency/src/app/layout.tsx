import type { Metadata } from "next";
import Script from "next/script";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import "@/lib/i18n";
import { getInitialLanguage, languageInitScript } from '@ouiboo/i18n/server';
import { AgencyShell } from "@/components/AgencyShell";
import { TrialBanner } from "@/components/TrialBanner";
import en from '../../public/locales/en/translation.json';
import fr from '../../public/locales/fr/translation.json';
import ar from '../../public/locales/ar/translation.json';

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

type LocaleJson = {
  meta: {
    titleDefault: string;
    titleTemplate: string;
    description: string;
  };
  common: {
    skipToContent: string;
  };
};

const LOCALE_FILES: Record<string, LocaleJson> = {
  en: en as LocaleJson,
  fr: fr as LocaleJson,
  ar: ar as LocaleJson,
};

const META_BY_LANGUAGE: Record<string, { default: string; template: string; description: string }> = {
  en: {
    default: en.meta.titleDefault,
    template: en.meta.titleTemplate,
    description: en.meta.description,
  },
  fr: {
    default: fr.meta.titleDefault,
    template: fr.meta.titleTemplate,
    description: fr.meta.description,
  },
  ar: {
    default: ar.meta.titleDefault,
    template: ar.meta.titleTemplate,
    description: ar.meta.description,
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const initialLanguage = await getInitialLanguage();
  const meta = META_BY_LANGUAGE[initialLanguage] ?? META_BY_LANGUAGE.en;

  return {
    title: {
      default: meta.default,
      template: meta.template,
    },
    description: meta.description,
    robots: { index: false, follow: false, noarchive: true },
  };
}

// Force dynamic rendering for all pages - prevents i18n HTTP backend
// from hanging during static generation (no server to fetch translations from)
export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLanguage = await getInitialLanguage();
  const copy = LOCALE_FILES[initialLanguage] ?? LOCALE_FILES.en;

  return (
    <html lang={initialLanguage} dir={initialLanguage === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} bg-muted/20`} suppressHydrationWarning>
        <Script
          id="language-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: languageInitScript }}
        />
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:font-semibold focus:text-foreground focus:shadow-lg">
          {copy.common.skipToContent}
        </a>
        <Providers>
          <AgencyShell>
            {children}
          </AgencyShell>
          <TrialBanner />
        </Providers>
      </body>
    </html>
  );
}