import { cookies, headers } from 'next/headers';
import { DEFAULT_LANGUAGE, supportedLanguages, type SupportedLanguage } from './constants';

export { DEFAULT_LANGUAGE, supportedLanguages } from './constants';
export type { SupportedLanguage } from './constants';

export const SUPPORTED_LANGUAGES = [...supportedLanguages] as const;

export async function getInitialLanguage(): Promise<SupportedLanguage> {
  const [headerStore, cookieStore] = await Promise.all([headers(), cookies()]);
  const preferredLanguage =
    headerStore.get('x-ouiboo-language') ||
    cookieStore.get('i18nextLng')?.value ||
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
      var storedLanguage = window.localStorage.getItem('i18nextLng');
      var detectedLanguage = queryLanguage || storedLanguage || window.navigator.language || '${DEFAULT_LANGUAGE}';
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