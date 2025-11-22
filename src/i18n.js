// src/i18n.js
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

const initTranslations = async (i18n, lng = 'en') => {
  return i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      lng: lng, // Set initial language
      fallbackLng: 'en',
      debug: process.env.NODE_ENV === 'development',
      ns: ['translation'],
      defaultNS: 'translation',

      detection: {
        order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
        caches: ['localStorage', 'cookie'],
        excludeCacheFor: ['cimode'],
      },

      interpolation: {
        escapeValue: false,
      },
      
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },

      react: {
        useSuspense: true,
      },
    });
};

export default initTranslations;