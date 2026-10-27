import en from '../../public/locales/en/translation.json';
import fr from '../../public/locales/fr/translation.json';
import ar from '../../public/locales/ar/translation.json';

// #567 (Council S3 P1-9): locale key parity for the landing app — the
// traveller app has enforced this since #424; the other apps had no
// parity test, so a key added to one locale silently fell back in the
// others. Plural forms are compared by BASE key: i18next plural
// categories legitimately differ per language (Arabic has six forms,
// English two), so `key_zero` / `key_one` / ... normalise to `key`.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function keySet(value: unknown, prefix = ''): string[] {
    if (value === null || typeof value !== 'object') return [prefix.replace(PLURAL_SUFFIX, '')];
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        keySet(child, prefix ? `${prefix}.${key}` : key),
    );
}

// The ONE documented empty-string exception: `pricing.enterprise.currency`
// is '' by design in every locale — the enterprise tier's price is the word
// "Custom" ("Sur mesure" / "حسب الطلب"), so there is no currency suffix to
// render after it. Any OTHER empty translation, in any locale, still fails
// this suite: the exception is an exact path set, not a pattern or a count.
const EMPTY_PATH_EXCEPTIONS = new Set(['pricing.enterprise.currency']);

function emptyPaths(value: unknown, prefix = ''): string[] {
    if (typeof value === 'string') return value.trim() === '' ? [prefix] : [];
    if (value === null || typeof value !== 'object') return [];
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        emptyPaths(child, prefix ? `${prefix}.${key}` : key),
    );
}

describe('landing locale parity (#567)', () => {
    it('fr and ar expose exactly the same keys as en (plural-normalised)', () => {
        const enKeys = [...new Set(keySet(en))].sort();
        expect([...new Set(keySet(fr))].sort()).toEqual(enKeys);
        expect([...new Set(keySet(ar))].sort()).toEqual(enKeys);
    });

    it('has no empty translation  (one documented exception)', () => {
        const unexpectedEmpties = (locale: unknown) =>
            emptyPaths(locale).filter((path) => !EMPTY_PATH_EXCEPTIONS.has(path));
        expect(unexpectedEmpties(en)).toEqual([]);
        expect(unexpectedEmpties(fr)).toEqual([]);
        expect(unexpectedEmpties(ar)).toEqual([]);
        // Pin the exception itself: the documented path must actually be
        // the empty one in every locale, so the set cannot silently drift
        // into excusing a different (genuinely missing) translation.
        expect(emptyPaths(en)).toEqual([...EMPTY_PATH_EXCEPTIONS]);
        expect(emptyPaths(fr)).toEqual([...EMPTY_PATH_EXCEPTIONS]);
        expect(emptyPaths(ar)).toEqual([...EMPTY_PATH_EXCEPTIONS]);
    });
});
