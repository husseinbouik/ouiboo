'use client';

import { createInstance, type i18n as I18nInstance, type ResourceKey } from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import {
    DEFAULT_LANGUAGE,
    supportedLanguages,
    type SupportedLanguage,
} from '@ouiboo/i18n/constants';

export { supportedLanguages } from '@ouiboo/i18n/constants';
export type { SupportedLanguage } from '@ouiboo/i18n/constants';

/**
 * F1 — traveller-owned i18n instance.
 *
 * Previously this module re-exported the shared @ouiboo/i18n singleton,
 * which loads the active locale over HTTP (i18next-http-backend). The
 * server therefore never had translations, so <Providers> had to return
 * null until mount + fetch completed (#122/#245) and SSR shipped an
 * empty page.
 *
 * Now the root layout resolves the language on the server
 * (getInitialLanguage) and passes that language's dictionary — already
 * statically imported server-side in lib/server-translations.ts — into
 * <Providers>, which creates the instance via createTravelerI18n. The
 * instance is initialised SYNCHRONOUSLY (initImmediate: false) with the
 * embedded resources and an explicit `lng`, so the first render is
 * fully translated and identical on the server and the client: the
 * #122 no-raw-keys and #245 no-hydration-mismatch invariants hold by
 * construction instead of by a mount gate.
 *
 * The HTTP backend remains registered and is used ONLY when the user
 * switches language in-session (changeLanguage loads the other locales
 * from /locales/... as before); detection/caching configuration mirrors
 * @ouiboo/i18n so cookie + localStorage persistence behaviour is
 * unchanged. normalizeLanguage and the URL-param detector are replicated
 * from @ouiboo/i18n rather than imported: importing the package root
 * would initialise the shared singleton (and its HTTP fetch) as a side
 * effect. The shared package itself is untouched — agency keeps using
 * the singleton.
 */
export const normalizeLanguage = (language?: string | null): SupportedLanguage => {
    const baseLanguage = language?.split('-')[0]?.toLowerCase();
    return supportedLanguages.includes(baseLanguage as SupportedLanguage)
        ? (baseLanguage as SupportedLanguage)
        : DEFAULT_LANGUAGE;
};

// Custom language detector that checks URL params first (mirrors @ouiboo/i18n).
export const urlLanguageDetector = {
    name: 'urlParam',
    lookup() {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const language = urlParams.get('lang');
            return language ? normalizeLanguage(language) : undefined;
        }
        return undefined;
    }
};

export function createTravelerI18n(
    initialLanguage: SupportedLanguage,
    initialResources: ResourceKey,
): I18nInstance {
    const languageDetector = new LanguageDetector();
    languageDetector.addDetector(urlLanguageDetector);

    const instance = createInstance();
    void instance
        .use(Backend)
        .use(languageDetector)
        .use(initReactI18next)
        .init({
            // Explicit language + embedded resources for it: i18next can
            // finish initialising synchronously (initImmediate: false),
            // so `ready` is true at the very first render on both the
            // server and the client — no detector race, no HTTP fetch on
            // the first-paint path.
            lng: initialLanguage,
            resources: {
                [initialLanguage]: { translation: initialResources },
            },
            initImmediate: false,
            fallbackLng: DEFAULT_LANGUAGE,
            supportedLngs: [...supportedLanguages],
            nonExplicitSupportedLngs: true,
            load: 'languageOnly',
            cleanCode: true,
            ns: ['translation'],
            defaultNS: 'translation',
            detection: {
                // Same chain/caches as @ouiboo/i18n: the server reads the
                // `i18nextLng` cookie in getInitialLanguage(), so switches
                // must keep persisting there (and localStorage) for the
                // next SSR render to agree with the client.
                order: ['urlParam', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
                caches: ['cookie', 'localStorage'],
                lookupQuerystring: 'lang',
                lookupCookie: 'i18nextLng',
                lookupLocalStorage: 'i18nextLng',
                cookieMinutes: 525600,
                cookieOptions: { path: '/', sameSite: 'lax' },
                convertDetectedLanguage: normalizeLanguage,
            },
            interpolation: {
                escapeValue: false
            },
            backend: {
                loadPath: '/locales/{{lng}}/{{ns}}.json',
            },
            // #122: During SSR, return an empty string instead of the raw
            // key for anything missing from the embedded bundle.
            // Client-side keeps returning keys for easier debugging of
            // missing translations.
            parseMissingKeyHandler: (key: string) => {
                if (typeof window === 'undefined') return '';
                return key;
            },
            react: {
                // Never suspend the shell on a language switch: i18next
                // keeps rendering the previous language until the new
                // bundle has loaded, then flips — the tree never blanks.
                useSuspense: false,
            },
        });

    return instance;
}
