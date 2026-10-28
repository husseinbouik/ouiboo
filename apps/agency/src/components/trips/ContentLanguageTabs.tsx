import type { TFunction } from 'i18next';
import { supportedLanguages, type SupportedLanguage } from '@ouiboo/i18n/constants';

/**
 * #546/#584: the languages a trip's content can be written in.
 *
 * Founder scalability rule: the tabs DERIVE from the platform's
 * supported-languages list (@ouiboo/i18n) — adding a language there
 * adds a tab here with no component change. One language is canonical
 * (it binds the top-level form fields and is required to publish):
 * French for the Morocco launch, expressed as configuration
 * (NEXT_PUBLIC_CONTENT_CANONICAL_LOCALE) to mirror the API's
 * TRIP_CONTENT_CANONICAL_LOCALE market rule — not a hardcoded trio.
 */
export const CANONICAL_LANGUAGE: string =
  process.env.NEXT_PUBLIC_CONTENT_CANONICAL_LOCALE || 'fr';

export type ContentLanguageCode = SupportedLanguage;

type LanguagePresentation = { labelKey?: string; dir: string };

/** Presentation metadata per language; unlisted codes fall back to the code itself + LTR. */
const LANGUAGE_PRESENTATION: Record<string, LanguagePresentation> = {
  fr: { labelKey: 'trips.create.languageFr', dir: 'ltr' },
  ar: { labelKey: 'trips.create.languageAr', dir: 'rtl' },
  en: { labelKey: 'trips.create.languageEn', dir: 'ltr' },
};

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur']);

export function languagePresentation(code: string): LanguagePresentation {
  return (
    LANGUAGE_PRESENTATION[code] ?? {
      dir: RTL_LANGUAGES.has(code) ? 'rtl' : 'ltr',
    }
  );
}

/** Canonical first (it is the publish-required language), then the rest of the supported list. */
export const CONTENT_LANGUAGES: Array<{ code: string }> = [
  ...(supportedLanguages.includes(CANONICAL_LANGUAGE as SupportedLanguage)
    ? [{ code: CANONICAL_LANGUAGE }]
    : []),
  ...supportedLanguages
    .filter((code) => code !== CANONICAL_LANGUAGE)
    .map((code) => ({ code })),
];

export function isCanonicalLanguage(code: string): boolean {
  return code === CANONICAL_LANGUAGE;
}

/** The tab a step opens on: the canonical language when supported, else the first supported one. */
export const DEFAULT_CONTENT_LANGUAGE: ContentLanguageCode = (
  supportedLanguages.includes(CANONICAL_LANGUAGE as SupportedLanguage)
    ? CANONICAL_LANGUAGE
    : supportedLanguages[0]
) as ContentLanguageCode;

export function contentLanguageDir(code: string): string {
  return languagePresentation(code).dir;
}

type Props = {
  t: TFunction;
  activeLanguage: string;
  onChange: (code: string) => void;
  ariaLabel: string;
  /** Distinct testid prefix per step (defaults to the basics step's ids). */
  testIdPrefix?: string;
};

export function ContentLanguageTabs({ t, activeLanguage, onChange, ariaLabel, testIdPrefix = 'trip-language-tab' }: Props) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
      {CONTENT_LANGUAGES.map(({ code }) => {
        const { labelKey } = languagePresentation(code);
        return (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={activeLanguage === code}
            data-testid={`${testIdPrefix}-${code}`}
            onClick={() => onChange(code)}
            className={`h-9 px-4 rounded-full text-sm font-semibold border transition-all ${
              activeLanguage === code
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:border-primary/50'
            }`}
          >
            {labelKey ? t(labelKey) : code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
