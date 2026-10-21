import { cookies, headers } from 'next/headers';
import { DEFAULT_LANGUAGE, supportedLanguages, type SupportedLanguage } from './constants';

export { DEFAULT_LANGUAGE, supportedLanguages } from './constants';
export type { SupportedLanguage } from './constants';

export const SUPPORTED_LANGUAGES = [...supportedLanguages] as const;

export async function getInitialLanguage(): Promise<SupportedLanguage> {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  // #336: honor Accept-Language after the explicit header/cookie so a first
  // visit renders in the same language the client detector will pick from
  // navigator.language — otherwise SSR and the client's first render diverge
  // (React hydration error #418) whenever the browser language is not the default.
  const acceptLanguage = (headerStore.get('accept-language') || '')
    .split(',')
    .map((part) => part.split(';')[0]?.trim().split('-')[0]?.toLowerCase())
    .find((code) => code && SUPPORTED_LANGUAGES.includes(code as SupportedLanguage));
  const preferredLanguage =
    headerStore.get('x-ouiboo-language') ||
    cookieStore.get('i18nextLng')?.value ||
    acceptLanguage ||
    DEFAULT_LANGUAGE;
  const language = preferredLanguage.split('-')[0].toLowerCase();

  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)
    ? (language as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}

export const languageInitScript = `
  (function () {
    try {
      var supported = ${JSON.stringify([...supportedLanguages])};
      var params = new URLSearchParams(window.location.search);
      var queryLanguage = params.get('lang');
      var cookieMatch = document.cookie.match(/(?:^|; )i18nextLng=([^;]*)/);
      var cookieLanguage = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
      var storedLanguage = window.localStorage.getItem('i18nextLng');
      var detectedLanguage = queryLanguage || cookieLanguage || storedLanguage || window.navigator.language || '${DEFAULT_LANGUAGE}';
      var language = String(detectedLanguage).split('-')[0].toLowerCase();
      if (supported.indexOf(language) === -1) language = '${DEFAULT_LANGUAGE}';
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
      if (queryLanguage) {
        window.localStorage.setItem('i18nextLng', language);
        document.cookie = 'i18nextLng=' + language + '; path=/; max-age=31536000; SameSite=Lax';
      }
    } catch (error) {}
  })();
`;