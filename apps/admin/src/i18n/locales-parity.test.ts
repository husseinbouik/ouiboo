import en from '../../public/locales/en/translation.json';
import fr from '../../public/locales/fr/translation.json';
import ar from '../../public/locales/ar/translation.json';

// #567 (Council S3 P1-9): locale key parity for the admin app — the
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

function emptyPaths(value: unknown, prefix = ''): string[] {
    if (typeof value === 'string') return value.trim() === '' ? [prefix] : [];
    if (value === null || typeof value !== 'object') return [];
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        emptyPaths(child, prefix ? `${prefix}.${key}` : key),
    );
}

describe('admin locale parity (#567)', () => {
    it('fr and ar expose exactly the same keys as en (plural-normalised)', () => {
        const enKeys = [...new Set(keySet(en))].sort();
        expect([...new Set(keySet(fr))].sort()).toEqual(enKeys);
        expect([...new Set(keySet(ar))].sort()).toEqual(enKeys);
    });

    it('has no empty translation strings', () => {
        expect(emptyPaths(en)).toEqual([]);
        expect(emptyPaths(fr)).toEqual([]);
        expect(emptyPaths(ar)).toEqual([]);
    });
});
