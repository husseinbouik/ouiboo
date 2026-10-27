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

    it('has a paymentPlan namespace in every locale, actually translated (#588)', () => {
        for (const locale of [en, fr, ar]) {
            const paymentPlan = (locale as Record<string, unknown>).paymentPlan as Record<string, unknown>;
            expect(paymentPlan).toBeDefined();
            expect(Object.keys(paymentPlan).sort()).toEqual([
                'balanceDue',
                'balancePayBefore',
                'depositDue',
                'depositPaid',
                'refundDue',
                'uploadBalanceReceipt',
            ]);
        }
        const enPlan = (en as any).paymentPlan;
        const frPlan = (fr as any).paymentPlan;
        const arPlan = (ar as any).paymentPlan;
        for (const key of Object.keys(enPlan)) {
            expect(frPlan[key]).not.toBe(enPlan[key]);
            expect(arPlan[key]).not.toBe(enPlan[key]);
        }
    });

    it('translates the home catalogue load-error strings (#575)', () => {
        for (const key of ['loadErrorTitle', 'loadErrorSubtitle']) {
            expect((fr as any).featured[key]).not.toBe((en as any).featured[key]);
            expect((ar as any).featured[key]).not.toBe((en as any).featured[key]);
        }
    });

    it('keeps the zero-review label localised for the trip page (#579)', () => {
        expect((en as any).reviews.noReviewsYet).toBe('No reviews yet');
        expect((fr as any).reviews.noReviewsYet).not.toBe((en as any).reviews.noReviewsYet);
        expect((ar as any).reviews.noReviewsYet).not.toBe((en as any).reviews.noReviewsYet);
    });

    it('isolates the interpolated Latin trip title in the AR share text and spells the brand Ouiboo in AR seller.poweredBy (#577)', () => {
        // U+2068 FIRST STRONG ISOLATE … U+2069 POP DIRECTIONAL ISOLATE
        // around {{title}} so a Latin title cannot scramble the RTL sentence.
        expect((ar as any).share.text).toContain('\u2068{{title}}\u2069');
        expect((ar as any).seller.poweredBy).toBe('مدعوم من Ouiboo');
        expect((ar as any).seller.poweredBy).not.toContain('OuiBoo');
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
