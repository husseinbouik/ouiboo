// src/components/TranslationsProvider.js
'use client';

import { I18nextProvider } from 'react-i18next';
import initTranslations from '../i18n';
import { createInstance } from 'i18next';
import { useEffect, useState } from 'react';

export default function TranslationsProvider({ children, locale = 'en' }) {
  const [i18n, setI18n] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeI18n = async () => {
      try {
        const instance = createInstance();
        await initTranslations(instance, locale);
        setI18n(instance);
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeI18n();
  }, [locale]);

  if (isLoading) {
    return <div>Loading translations...</div>;
  }

  if (!i18n) {
    return <div>Error loading translations</div>;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}