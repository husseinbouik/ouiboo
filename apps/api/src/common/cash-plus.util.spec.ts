import { isCashPlusDestinationVerified, visibleCashPlus } from './cash-plus.util';

describe('cash-plus.util (#988)', () => {
    const verified = {
        cashPlusBeneficiaryName: 'Atlas Voyages SARL',
        cashPlusPhone: '+212612345678',
        cashPlusEnabled: true,
        cashPlusStatus: 'VERIFIED',
        cashPlusVerifiedAt: new Date('2026-11-20T00:00:00Z'),
    };

    it('exposes a verified + enabled destination', () => {
        expect(visibleCashPlus(verified)).toEqual({
            beneficiaryName: 'Atlas Voyages SARL',
            phone: '+212612345678',
        });
    });

    it('hides a verified destination while the toggle is off', () => {
        expect(visibleCashPlus({ ...verified, cashPlusEnabled: false })).toBeNull();
    });

    it('never exposes pending-review infos that were never verified', () => {
        expect(
            visibleCashPlus({ ...verified, cashPlusStatus: 'PENDING_REVIEW', cashPlusVerifiedAt: null }),
        ).toBeNull();
        expect(
            isCashPlusDestinationVerified({ cashPlusStatus: 'PENDING_REVIEW', cashPlusVerifiedAt: null }),
        ).toBe(false);
    });

    it('keeps the previously verified destination live during a replacement review', () => {
        expect(isCashPlusDestinationVerified(verified)).toBe(true);
        expect(
            visibleCashPlus({ ...verified, cashPlusStatus: 'PENDING_REVIEW' }),
        ).toEqual({ beneficiaryName: 'Atlas Voyages SARL', phone: '+212612345678' });
    });

    it('hides rejected, unverified and incomplete destinations', () => {
        expect(visibleCashPlus({ ...verified, cashPlusStatus: 'REJECTED' })).toBeNull();
        expect(visibleCashPlus({ ...verified, cashPlusStatus: 'UNVERIFIED' })).toBeNull();
        expect(visibleCashPlus({ ...verified, cashPlusPhone: null })).toBeNull();
        expect(visibleCashPlus(null)).toBeNull();
        expect(visibleCashPlus(undefined)).toBeNull();
    });
});
