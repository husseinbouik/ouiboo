'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { DEFAULT_LANGUAGE, supportedLanguages, type SupportedLanguage } from './constants';

export { supportedLanguages } from './constants';
export type { SupportedLanguage } from './constants';

export const normalizeLanguage = (language?: string | null): SupportedLanguage => {
    const baseLanguage = language?.split('-')[0]?.toLowerCase();
    return supportedLanguages.includes(baseLanguage as SupportedLanguage)
        ? (baseLanguage as SupportedLanguage)
        : DEFAULT_LANGUAGE;
};

// Custom language detector that checks URL params first
export const urlLanguageDetector = {
    name: 'urlParam',
    lookup() {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const language = urlParams.get('lang');
            return language ? normalizeLanguage(language) : undefined;
        }
        return undefined;
    }
};

const languageDetector = new LanguageDetector();
languageDetector.addDetector(urlLanguageDetector);

i18n
    .use(Backend)
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: [...supportedLanguages],
        nonExplicitSupportedLngs: true,
        load: 'languageOnly',
        cleanCode: true,
        ns: ['translation'],
        defaultNS: 'translation',
        detection: {
            // The server reads the `i18nextLng` cookie in getInitialLanguage(), so the
            // client must persist the active language to that same cookie. Without this,
            // a language switched in-session was only cached in localStorage and the next
            // SSR render fell back to the default language, flashing LTR (wrong `dir`)
            // before hydration on Arabic.
            order: ['urlParam', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
            caches: ['cookie', 'localStorage'],
            lookupQuerystring: 'lang',
            lookupCookie: 'i18nextLng',
            lookupLocalStorage: 'i18nextLng',
            cookieMinutes: 525600,
            cookieOptions: { path: '/', sameSite: 'lax' },
            convertDetectedLanguage: normalizeLanguage,
        },
        interpolation: {
            escapeValue: false
        },
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        }
    });

export { i18n };
export default i18n;