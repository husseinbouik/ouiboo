import { Prisma } from '@ouiboo/database';
import { resolvePricingSelection, variantUnits } from './pricing-selection.util';

const variant = (over: any = {}) => ({
    id: 'v1', name: { fr: 'Confort' }, pricingUnit: 'PER_PERSON', unitSize: 1,
    price: new Prisma.Decimal('1200.00'), currency: 'MAD', isActive: true, ...over,
});
const addOn = (over: any = {}) => ({
    id: 'a1', name: { fr: 'Transfert' }, pricingUnit: 'PER_BOOKING',
    price: new Prisma.Decimal('200.00'), currency: 'MAD', isActive: true, ...over,
});

describe('resolvePricingSelection (#695)', () => {
    it('no selection: session price x guests', () => {
        const r = resolvePricingSelection({ sessionPrice: new Prisma.Decimal('1000'), currency: 'MAD', guestsCount: 2 });
        expect(r.totalAmount.toFixed(2)).toBe('2000.00');
        expect(r.snapshot.variant).toBeNull();
    });
    it('PER_PERSON variant replaces the session price', () => {
        const r = resolvePricingSelection({ sessionPrice: new Prisma.Decimal('1000'), currency: 'MAD', guestsCount: 2, variant: variant() });
        expect(r.snapshot.baseAmount).toBe('2400.00');
    });
    it('PER_GROUP variant is flat', () => {
        const r = resolvePricingSelection({ sessionPrice: new Prisma.Decimal('1000'), currency: 'MAD', guestsCount: 5, variant: variant({ pricingUnit: 'PER_GROUP', price: new Prisma.Decimal('3000') }) });
        expect(r.snapshot.baseAmount).toBe('3000.00');
    });
    it('PER_VEHICLE rounds up by unit size', () => {
        expect(variantUnits(variant({ pricingUnit: 'PER_VEHICLE', unitSize: 4 }), 9)).toBe(3);
        const r = resolvePricingSelection({ sessionPrice: new Prisma.Decimal('1000'), currency: 'MAD', guestsCount: 9, variant: variant({ pricingUnit: 'PER_VEHICLE', unitSize: 4, price: new Prisma.Decimal('900') }) });
        expect(r.snapshot.baseAmount).toBe('2700.00');
    });
    it('add-ons reconcile into the total (per-booking and per-person)', () => {
        const r = resolvePricingSelection({
            sessionPrice: new Prisma.Decimal('1000'), currency: 'MAD', guestsCount: 2,
            variant: variant(),
            addOns: [
                { addOn: addOn(), quantity: 1 },
                { addOn: addOn({ id: 'a2', pricingUnit: 'PER_PERSON', price: new Prisma.Decimal('50') }), quantity: 1 },
            ],
        });
        expect(r.snapshot.addOnsTotal).toBe('300.00');
        expect(r.snapshot.totalAmount).toBe('2700.00');
        expect(r.totalAmount.toFixed(2)).toBe(r.snapshot.totalAmount);
    });
    it('rejects an inactive variant and a foreign-currency add-on', () => {
        expect(() => resolvePricingSelection({ sessionPrice: new Prisma.Decimal('1000'), currency: 'MAD', guestsCount: 1, variant: variant({ isActive: false }) })).toThrow();
        expect(() => resolvePricingSelection({ sessionPrice: new Prisma.Decimal('1000'), currency: 'MAD', guestsCount: 1, addOns: [{ addOn: addOn({ currency: 'EUR' }), quantity: 1 }] })).toThrow();
    });
});
