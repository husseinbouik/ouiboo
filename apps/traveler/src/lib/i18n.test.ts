import { createTravelerI18n, normalizeLanguage } from './i18n';

// F1: the whole point of createTravelerI18n is that the instance is
// usable SYNCHRONOUSLY — the server embeds the active language's
// dictionary, so the first render (server and client) is translated
// with no HTTP fetch and no mount/ready gate. These tests pin that:
// if init regresses to async (e.g. initImmediate flips back, or the
// resources stop being embedded), isInitialized / t() here fail.
describe('createTravelerI18n (F1)', () => {
    const frBundle = {
        common: { skipToContent: 'Aller au contenu' },
        home: { title: 'Accueil' },
    };

    it('initialises synchronously in the initial language with embedded resources', () => {
        const instance = createTravelerI18n('fr', frBundle);
        expect(instance.isInitialized).toBe(true);
        expect(instance.language).toBe('fr');
        expect(instance.hasResourceBundle('fr', 'translation')).toBe(true);
        expect(instance.t('common.skipToContent')).toBe('Aller au contenu');
        expect(instance.t('home.title')).toBe('Accueil');
    });

    it('does not need the HTTP backend for the embedded language', () => {
        const instance = createTravelerI18n('en', { common: { skipToContent: 'Skip to content' } });
        expect(instance.isInitialized).toBe(true);
        // The backend only ever loads languages that were NOT embedded
        // (in-session switches); the initial language resolves locally.
        expect(instance.services.backendConnector?.backend).toBeTruthy();
        expect(instance.t('common.skipToContent')).toBe('Skip to content');
    });
});

describe('normalizeLanguage (F1, mirrors @ouiboo/i18n)', () => {
    it('normalises regional codes and falls back to en', () => {
        expect(normalizeLanguage('fr-CA')).toBe('fr');
        expect(normalizeLanguage('AR')).toBe('ar');
        expect(normalizeLanguage('de')).toBe('en');
        expect(normalizeLanguage(null)).toBe('en');
        expect(normalizeLanguage(undefined)).toBe('en');
    });
});
