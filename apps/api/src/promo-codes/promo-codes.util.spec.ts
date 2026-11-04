import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import {
    assertPromoUsable,
    computePromoDiscount,
    normalizePromoCode,
    resolvePromoDiscount,
    type PromoCodeForBooking,
} from './promo-codes.util';

const D = (v: string) => new Prisma.Decimal(v);

function promo(overrides: Partial<PromoCodeForBooking> = {}): PromoCodeForBooking {
    return {
        id: 'promo-1',
        agencyId: 'agency-1',
        code: 'SAVE10',
        discountType: 'PERCENT',
        discountValue: D('10'),
        startsAt: null,
        endsAt: null,
        maxUses: null,
        usedCount: 0,
        isActive: true,
        ...overrides,
    };
}

describe('normalizePromoCode', () => {
    it('trims and upper-cases', () => {
        expect(normalizePromoCode('  save10 ')).toBe('SAVE10');
        expect(normalizePromoCode(undefined)).toBe('');
        expect(normalizePromoCode(42)).toBe('');
    });
});

describe('computePromoDiscount', () => {
    it('percent: 10% off 1000.00 reconciles exactly', () => {
        const { discountAmount, totalAmount } = computePromoDiscount(D('1000.00'), promo());
        expect(discountAmount.toFixed(2)).toBe('100.00');
        expect(totalAmount.toFixed(2)).toBe('900.00');
        expect(discountAmount.add(totalAmount).toFixed(2)).toBe('1000.00');
    });

    it('percent: rounds the discount to 2dp (15% of 333.33)', () => {
        const { discountAmount, totalAmount } = computePromoDiscount(
            D('333.33'),
            promo({ discountValue: D('15') }),
        );
        expect(discountAmount.toFixed(2)).toBe('50.00');
        expect(totalAmount.toFixed(2)).toBe('283.33');
    });

    it('percent: 100% off floors the total at 0', () => {
        const { discountAmount, totalAmount } = computePromoDiscount(
            D('250.00'),
            promo({ discountValue: D('100') }),
        );
        expect(discountAmount.toFixed(2)).toBe('250.00');
        expect(totalAmount.toFixed(2)).toBe('0.00');
    });

    it('fixed MAD: subtracts the flat amount', () => {
        const { discountAmount, totalAmount } = computePromoDiscount(
            D('1000.00'),
            promo({ discountType: 'FIXED_MAD', discountValue: D('200') }),
        );
        expect(discountAmount.toFixed(2)).toBe('200.00');
        expect(totalAmount.toFixed(2)).toBe('800.00');
    });

    it('fixed MAD: never discounts below a zero total', () => {
        const { discountAmount, totalAmount } = computePromoDiscount(
            D('150.00'),
            promo({ discountType: 'FIXED_MAD', discountValue: D('200') }),
        );
        expect(discountAmount.toFixed(2)).toBe('150.00');
        expect(totalAmount.toFixed(2)).toBe('0.00');
    });
});

describe('assertPromoUsable', () => {
    const now = new Date('2026-11-04T10:00:00Z');

    it('accepts an active code inside its window and under its cap', () => {
        expect(() =>
            assertPromoUsable(
                promo({
                    startsAt: new Date('2026-11-01T00:00:00Z'),
                    endsAt: new Date('2026-11-30T00:00:00Z'),
                    maxUses: 5,
                    usedCount: 4,
                }),
                { agencyId: 'agency-1', now },
            ),
        ).not.toThrow();
    });

    it.each([
        ['another agency', { agencyId: 'agency-2' }],
        ['inactive', { isActive: false }],
        ['not started', { startsAt: new Date('2026-12-01T00:00:00Z') }],
        ['expired', { endsAt: new Date('2026-10-01T00:00:00Z') }],
        ['cap reached', { maxUses: 3, usedCount: 3 }],
        ['percent above 100', { discountValue: D('101') }],
        ['percent zero', { discountValue: D('0') }],
        ['fixed zero', { discountType: 'FIXED_MAD' as const, discountValue: D('0') }],
    ])('rejects: %s', (_label, overrides) => {
        expect(() => assertPromoUsable(promo(overrides), { agencyId: 'agency-1', now })).toThrow(
            BadRequestException,
        );
    });
});

describe('resolvePromoDiscount', () => {
    it('returns the reconciled snapshot stamped for the booking', () => {
        const resolved = resolvePromoDiscount({
            promo: promo(),
            agencyId: 'agency-1',
            undiscountedTotal: D('800.00'),
            currency: 'MAD',
            now: new Date('2026-11-04T10:00:00Z'),
        });
        expect(resolved.discountAmount.toFixed(2)).toBe('80.00');
        expect(resolved.totalAmount.toFixed(2)).toBe('720.00');
        expect(resolved.snapshot).toEqual({
            code: 'SAVE10',
            discountType: 'PERCENT',
            discountValue: '10.00',
            undiscountedTotal: '800.00',
            discountAmount: '80.00',
            totalAmount: '720.00',
            currency: 'MAD',
        });
    });
});
