// src/components/TranslationsProvider.js
'use client';

import { I18nextProvider } from 'react-i18next';
import initTranslations, { getInitialLanguage } from '../i18n';
import { createInstance } from 'i18next';
import { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner'; // Import the new component

const syncDocumentLanguage = (language) => {
  const lang = language?.split('-')[0] || 'en';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
};

export default function TranslationsProvider({ children, locale = 'en' }) {
  const [i18n, setI18n] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let instance;

    const initializeI18n = async () => {
      try {
        const initialLocale = getInitialLanguage(locale);
        
        instance = createInstance();
        await initTranslations(instance, initialLocale);
        syncDocumentLanguage(instance.language);
        instance.on('languageChanged', syncDocumentLanguage);
        setI18n(instance);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeI18n();

    return () => {
      instance?.off('languageChanged', syncDocumentLanguage);
    };
  }, [locale]);

  if (isLoading) {
    return <LoadingSpinner />; // Use the new loading spinner
  }

  if (!i18n) {
    // You might want to render a proper error component here
    return <div>Error loading translations. Please try refreshing the page.</div>;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
