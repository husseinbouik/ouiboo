import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Ouiboo Admin",
  description: "Admin portal for Ouiboo",
};

export const dynamic = 'force-dynamic';

const supportedLanguages = ['en', 'fr', 'ar'] as const;
type SupportedLanguage = typeof supportedLanguages[number];

async function getInitialLanguage(): Promise<SupportedLanguage> {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const preferredLanguage =
    headerStore.get('x-ouiboo-language') ||
    cookieStore.get('i18nextLng')?.value ||
    'en';
  const language = preferredLanguage.split('-')[0].toLowerCase();

  return supportedLanguages.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : 'en';
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
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLanguage = await getInitialLanguage();

  return (
    <html lang={initialLanguage} dir={initialLanguage === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script
          id="language-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: languageInitScript }}
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
