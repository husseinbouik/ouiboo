export const supportedLanguages = ['en', 'fr', 'ar'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';