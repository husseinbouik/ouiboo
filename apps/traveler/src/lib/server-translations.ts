import { getInitialLanguage, type SupportedLanguage } from '@ouiboo/i18n/server';
import en from '../../public/locales/en/translation.json';
import fr from '../../public/locales/fr/translation.json';
import ar from '../../public/locales/ar/translation.json';

type Dictionary = Record<string, unknown>;

const DICTIONARIES: Record<SupportedLanguage, Dictionary> = { en, fr, ar };

function lookup(dictionary: Dictionary, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Dictionary)) {
      return (acc as Dictionary)[part];
    }
    return undefined;
  }, dictionary);

  return typeof value === 'string' ? value : undefined;
}

export async function getServerTranslations() {
  const language = await getInitialLanguage();
  const dictionary = DICTIONARIES[language] ?? DICTIONARIES.en;

  const t = (key: string, vars?: Record<string, string | number>): string => {
    let value = lookup(dictionary, key) ?? lookup(DICTIONARIES.en, key) ?? key;
    if (vars) {
      for (const [name, replacement] of Object.entries(vars)) {
        value = value.replace(new RegExp(`{{\\s*${name}\\s*}}`, 'g'), String(replacement));
      }
    }
    return value;
  };

  return { t, language };
}
