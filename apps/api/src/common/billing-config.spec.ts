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
