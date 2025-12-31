'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Custom language detector that checks URL params first
const urlLanguageDetector = {
    name: 'urlParam',
    lookup() {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('lang') || undefined;
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
        detection: {
            order: ['urlParam', 'localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupQuerystring: 'lang'
        },
        interpolation: {
            escapeValue: false
        },
        backend: {
            loadPath: '/locales/{{lng}}/{{ns}}.json',
        }
    });

export default i18n;
