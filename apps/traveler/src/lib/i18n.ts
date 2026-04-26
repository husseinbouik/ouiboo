'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const supportedLanguages = ['en', 'fr', 'ar'] as const;
type SupportedLanguage = (typeof supportedLanguages)[number];

const normalizeLanguage = (language?: string | null): SupportedLanguage => {
    const baseLanguage = language?.split('-')[0]?.toLowerCase();
    return supportedLanguages.includes(baseLanguage as SupportedLanguage)
        ? (baseLanguage as SupportedLanguage)
        : 'en';
};

// Custom language detector that checks URL params first
const urlLanguageDetector = {
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
        fallbackLng: 'en',
        supportedLngs: [...supportedLanguages],
        nonExplicitSupportedLngs: true,
        load: 'languageOnly',
        cleanCode: true,
        ns: ['translation'],
        defaultNS: 'translation',
        detection: {
            order: ['urlParam', 'localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupQuerystring: 'lang',
            lookupLocalStorage: 'i18nextLng',
            convertDetectedLanguage: normalizeLanguage,
        },
        interpolation: {
            escapeValue: false
        },
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        }
    });

export default i18n;
