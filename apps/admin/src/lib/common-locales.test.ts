/**
 * #730: admin login failed Lighthouse's label-content-name-mismatch.
 * Root cause: the admin locale files had no common.switchLanguage /
 * common.switchFrom / common.toggleTheme keys at all (agency and
 * traveler have them), so the shared LanguageSwitcher/ThemeToggle in
 * @ouiboo/ui rendered the raw key as the accessible name — e.g. the
 * language button showed "EN" but was named "common.switchLanguage",
 * which does not contain the visible text. Keep the keys present in
 * every locale so the computed name always contains the visible label.
 */
import en from '../../public/locales/en/translation.json';
import fr from '../../public/locales/fr/translation.json';
import ar from '../../public/locales/ar/translation.json';

const locales = { en, fr, ar } as const;
const LANGUAGE_PLACEHOLDER = '{{language}}';

describe('admin common locale keys (#730)', () => {
  it.each(Object.entries(locales))(
    '%s defines the switcher/toggle keys so accessible names are real text',
    (_name, locale) => {
      const common = (locale as { common: Record<string, string> }).common;
      expect(common.switchLanguage).toContain(LANGUAGE_PLACEHOLDER);
      expect(common.switchFrom).toContain(LANGUAGE_PLACEHOLDER);
      expect(common.toggleTheme?.length).toBeGreaterThan(0);
      // The rendered accessible name ("... current is EN") must contain
      // the button's visible text (the language code).
      const rendered = common.switchLanguage.replace(LANGUAGE_PLACEHOLDER, 'EN');
      expect(rendered).toContain('EN');
    },
  );
});
