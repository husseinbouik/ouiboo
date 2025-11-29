// src/i18n.js

import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// The 'i18n' instance is passed in from your TranslationsProvider
const initTranslations = (i18n, lng = 'en') => {
  // Check for stored language preference first (client-side only)
  let initialLng = lng;
  if (typeof window !== 'undefined') {
    const storedLang = localStorage.getItem('i18nextLng');
    if (storedLang && ['en', 'fr', 'ar'].includes(storedLang)) {
      initialLng = storedLang;
    }
  }

  return i18n
    .use(Backend) // Loads translations from a server (e.g., /public/locales)
    .use(LanguageDetector) // This plugin detects the user's language
    .use(initReactI18next) // Passes the i18n instance to react-i18next
    .init({
      // Use stored preference if available, otherwise use the passed lng
      // The LanguageDetector will still run and can override this, but this ensures
      // we start with the user's saved preference
      lng: initialLng,
      fallbackLng: 'en', // Use 'en' if the detected language is not available
      debug: process.env.NODE_ENV === 'development', // Logs info to console in dev mode

      // Define which namespaces to load. Your translations are in 'translation.json'
      ns: ['translation'],
      defaultNS: 'translation',

      // --- THIS IS THE KEY CONFIGURATION FOR PERSISTENCE ---
      detection: {
        // Order to check for language:
        // 1. 'localStorage': Checks for a 'i18nextLng' key in localStorage.
        // 2. 'cookie': Checks for a language cookie.
        // 3. 'navigator': Checks the browser's language setting.
        // 4. 'htmlTag': Checks the `lang` attribute on the <html> tag.
        order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],

        // Where to cache the user's chosen language.
        // When you call `i18n.changeLanguage('fr')`, this plugin will
        // automatically save 'fr' to localStorage and a cookie.
        caches: ['localStorage', 'cookie'],
        
        // A key to exclude from caching (standard setting)
        excludeCacheFor: ['cimode'],
        
        // Lookup localStorage key
        lookupLocalStorage: 'i18nextLng',
      },

      interpolation: {
        escapeValue: false, // React already safes from XSS
      },
      
      backend: {
        // Path where your translation files are located in the `public` folder
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },

      react: {
        // Enables React Suspense for asynchronous translation loading
        useSuspense: true,
      },
    });
};

export default initTranslations;