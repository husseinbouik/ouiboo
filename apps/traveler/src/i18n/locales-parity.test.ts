import en from '../../public/locales/en/translation.json';
import fr from '../../public/locales/fr/translation.json';
import ar from '../../public/locales/ar/translation.json';

// #424 (Council P0-22): FR/AR are first-class locales, not a backlog item.
// Every key in the English source must exist in French and Arabic (and
// vice versa) — a missing translation fails CI instead of silently
// falling back to English in the UI.
function keySet(value: unknown, prefix = ''): string[] {
    if (value === null || typeof value !== 'object') return [prefix];
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

describe('traveller locale parity (#424)', () => {
    it('fr and ar expose exactly the same keys as en', () => {
        const enKeys = keySet(en).sort();
        expect(keySet(fr).sort()).toEqual(enKeys);
        expect(keySet(ar).sort()).toEqual(enKeys);
    });

    it('has a dedicated checkout namespace in every locale', () => {
        for (const locale of [en, fr, ar]) {
            const checkout = (locale as Record<string, unknown>).checkout as Record<string, unknown>;
            expect(checkout).toBeDefined();
            expect(Object.keys(checkout).length).toBeGreaterThan(40);
        }
    });

    it('has no empty translation strings', () => {
        expect(emptyPaths(en)).toEqual([]);
        expect(emptyPaths(fr)).toEqual([]);
        expect(emptyPaths(ar)).toEqual([]);
    });

    it('actually translates the binding checkout strings (no English copies in fr/ar)', () => {
        const enCheckout = (en as any).checkout;
        const frCheckout = (fr as any).checkout;
        const arCheckout = (ar as any).checkout;
        for (const key of ['disclaimerBody', 'proofNotSettlement', 'prevailingLanguage', 'completeBooking']) {
            expect(frCheckout[key]).not.toBe(enCheckout[key]);
            expect(arCheckout[key]).not.toBe(enCheckout[key]);
        }
        // The prevailing-language clause names the French version in all three.
        expect(enCheckout.prevailingLanguage).toContain('French version prevails');
        expect(frCheckout.prevailingLanguage).toContain('version française prévaut');
    });
});
