import {
    BETA_CATALOG_CURRENCY,
    isCatalogCurrencyAllowed,
    isMadOnlyCatalogEnabled,
} from './catalog-currency.util';

describe('catalog-currency.util (B24(f) MAD-only beta gate)', () => {
    const original = process.env.MAD_ONLY_CATALOG;

    afterEach(() => {
        if (original === undefined) {
            delete process.env.MAD_ONLY_CATALOG;
        } else {
            process.env.MAD_ONLY_CATALOG = original;
        }
    });

    it('defaults the gate ON when the env var is unset', () => {
        delete process.env.MAD_ONLY_CATALOG;
        expect(isMadOnlyCatalogEnabled()).toBe(true);
        expect(isCatalogCurrencyAllowed('EUR')).toBe(false);
        expect(isCatalogCurrencyAllowed('USD')).toBe(false);
    });

    it('stays ON for any value other than the explicit string false', () => {
        process.env.MAD_ONLY_CATALOG = 'true';
        expect(isMadOnlyCatalogEnabled()).toBe(true);
        process.env.MAD_ONLY_CATALOG = '1';
        expect(isMadOnlyCatalogEnabled()).toBe(true);
    });

    it('turns OFF only on MAD_ONLY_CATALOG=false', () => {
        process.env.MAD_ONLY_CATALOG = 'false';
        expect(isMadOnlyCatalogEnabled()).toBe(false);
        expect(isCatalogCurrencyAllowed('EUR')).toBe(true);
    });

    it('admits the beta catalogue currency, case-insensitively', () => {
        delete process.env.MAD_ONLY_CATALOG;
        expect(isCatalogCurrencyAllowed(BETA_CATALOG_CURRENCY)).toBe(true);
        expect(isCatalogCurrencyAllowed('mad')).toBe(true);
    });

    it('treats a missing currency as the schema default (MAD)', () => {
        delete process.env.MAD_ONLY_CATALOG;
        expect(isCatalogCurrencyAllowed(undefined)).toBe(true);
        expect(isCatalogCurrencyAllowed(null)).toBe(true);
        expect(isCatalogCurrencyAllowed('')).toBe(true);
    });
});
