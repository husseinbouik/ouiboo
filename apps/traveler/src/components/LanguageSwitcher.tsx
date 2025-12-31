'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@ouiboo/ui';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const current = i18n.language;
    const next = current === 'en' ? 'fr' : current === 'fr' ? 'ar' : 'en';
    i18n.changeLanguage(next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="text-gray-500 hover:text-deep-blue"
      title={`Current: ${(i18n.language || 'en').toUpperCase()}`}
    >
      <Globe className="h-5 w-5" />
      <span className="sr-only">Switch Language</span>
      <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-gray-100 rounded-full w-4 h-4 flex items-center justify-center">
        {i18n.language === 'en' ? 'EN' : i18n.language === 'fr' ? 'FR' : 'AR'}
      </span>
    </Button>
  );
}
