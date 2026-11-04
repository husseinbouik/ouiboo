import { getBillingConfig, isBillableBookingStatus } from './billing-config';

describe('billing-config (#698)', () => {
    it('defaults ARE the council decision', () => {
        const c = getBillingConfig({});
        expect(c.freeTierPublishable).toBe(true);
        expect(c.serviceFeeOnCompletedOnly).toBe(true);
        expect(c.betaCohortGrandfatherMonths).toBe(12);
    });
    it('only COMPLETED accrues the fee by default', () => {
        const c = getBillingConfig({});
        expect(isBillableBookingStatus('COMPLETED', c)).toBe(true);
        expect(isBillableBookingStatus('CONFIRMED', c)).toBe(false);
        expect(isBillableBookingStatus('CANCELLED', c)).toBe(false);
    });
    it('env can explicitly relax (never the default)', () => {
        const c = getBillingConfig({ OUIBOO_SERVICE_FEE_ON_COMPLETED_ONLY: 'false' } as any);
        expect(c.serviceFeeOnCompletedOnly).toBe(false);
        expect(isBillableBookingStatus('CONFIRMED', c)).toBe(true);
    });
});

describe('billing-config fiscal fields (#426)', () => {
    it('TVA defaults to the 20% working assumption and subscription price to undecided (null)', () => {
        const c = getBillingConfig({});
        expect(c.vatRatePercent).toBe(20);
        expect(c.subscriptionMonthlyPriceHt).toBeNull();
        expect(c.serviceFeeTrigger).toBe('TERMINAL_RETAINED_VALUE');
    });
    it('TVA and subscription price are configurable, invalid values fall back', () => {
        const c = getBillingConfig({ OUIBOO_VAT_RATE_PERCENT: '10', OUIBOO_SUBSCRIPTION_PRICE_HT_MAD: '299' } as any);
        expect(c.vatRatePercent).toBe(10);
        expect(c.subscriptionMonthlyPriceHt).toBe(299);
        const bad = getBillingConfig({ OUIBOO_VAT_RATE_PERCENT: '250', OUIBOO_SUBSCRIPTION_PRICE_HT_MAD: '-5' } as any);
        expect(bad.vatRatePercent).toBe(20);
        expect(bad.subscriptionMonthlyPriceHt).toBeNull();
    });
});
