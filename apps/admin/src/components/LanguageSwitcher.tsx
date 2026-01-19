'use client';

import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANGS = ['en', 'fr', 'ar'] as const;

const getLabel = (code: string) => {
  switch (code) {
    case 'fr':
      return 'FR';
    case 'ar':
      return 'AR';
    default:
      return 'EN';
  }
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleToggle = () => {
    const current = i18n.language as (typeof LANGS)[number];
    const index = LANGS.indexOf(current);
    const next = LANGS[(index + 1) % LANGS.length] || 'en';
    i18n.changeLanguage(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="h-9 px-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
      aria-label={`Switch language current is ${getLabel(i18n.language)}`}
      title={`Switch from ${getLabel(i18n.language)}`}
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-bold">{getLabel(i18n.language)}</span>
    </button>
  );
}
