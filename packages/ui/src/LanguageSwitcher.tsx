'use client';

import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '../utils';

const LANGS = ['en', 'fr', 'ar'] as const;

const getLangLabel = (code: string) => {
  switch (code) {
    case 'fr':
      return 'FR';
    case 'ar':
      return 'AR';
    default:
      return 'EN';
  }
};

export function LanguageSwitcher({ isTransparent }: { isTransparent?: boolean }) {
  const { i18n } = useTranslation();

  const handleToggle = () => {
    const current = i18n.language as (typeof LANGS)[number];
    const index = LANGS.indexOf(current);
    const next = LANGS[(index + 1) % LANGS.length] || 'en';
    i18n.changeLanguage(next);
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = next;
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        'flex items-center gap-1.5 px-2.5 h-9 rounded-xl transition-all duration-300 group hover:bg-foreground/5',
        isTransparent
          ? 'text-white/80 hover:text-white'
          : 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border',
      )}
      title={`Switch from ${getLangLabel(i18n.language)}`}
      aria-label={`Switch language current is ${getLangLabel(i18n.language)}`}
    >
      <Globe className="h-4 w-4 transition-transform group-hover:rotate-12" />
      <span className="text-[11px] font-black tracking-tighter">
        {getLangLabel(i18n.language)}
      </span>
    </button>
  );
}