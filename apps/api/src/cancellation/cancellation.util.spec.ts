import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import {
    CANCELLATION_POLICY_VERSION,
    PLATFORM_DEFAULT_CANCELLATION_BANDS,
    buildCancellationScaleSnapshot,
    computeCancellationRefund,
    normalizeCancellationPolicyInput,
    parseCancellationScale,
    resolveCancellationScale,
    wholeDaysBeforeStart,
} from './cancellation.util';

const D = (value: string) => new Prisma.Decimal(value);
const DAY_MS = 24 * 60 * 60 * 1000;
const START = new Date('2026-12-01T09:00:00.000Z');
const daysBefore = (days: number, extraMs = 0) =>
    new Date(START.getTime() - days * DAY_MS - extraMs);

describe('cancellation scale parsing & validation (#417)', () => {
    it('parses a stored scale and sorts bands highest-threshold first', () => {
        const parsed = parseCancellationScale({
            version: 'whatever-was-stored',
            bands: [
                { minDaysBeforeStart: 0, refundPercent: 0 },
                { minDaysBeforeStart: 30, refundPercent: 100 },
                { minDaysBeforeStart: 7, refundPercent: 50 },
            ],
        });
        expect(parsed).not.toBeNull();
        expect(parsed!.version).toBe(CANCELLATION_POLICY_VERSION);
        expect(parsed!.bands.map((b) => b.minDaysBeforeStart)).toEqual([30, 7, 0]);
    });

    it.each([
        ['null', null],
        ['a string', 'free cancellation'],
        ['an array at top level', [{ minDaysBeforeStart: 0, refundPercent: 0 }]],
        ['no bands', { version: 'x' }],
        ['empty bands', { bands: [] }],
        ['percent above 100', { bands: [{ minDaysBeforeStart: 0, refundPercent: 101 }] }],
        ['negative percent', { bands: [{ minDaysBeforeStart: 0, refundPercent: -5 }] }],
        ['non-integer percent', { bands: [{ minDaysBeforeStart: 0, refundPercent: 50.5 }] }],
        ['negative days', { bands: [{ minDaysBeforeStart: -1, refundPercent: 0 }] }],
        ['no 0-day band (coverage gap)', { bands: [{ minDaysBeforeStart: 7, refundPercent: 50 }] }],
        [
            'duplicate thresholds',
            {
                bands: [
                    { minDaysBeforeStart: 7, refundPercent: 50 },
                    { minDaysBeforeStart: 7, refundPercent: 60 },
                    { minDaysBeforeStart: 0, refundPercent: 0 },
                ],
            },
        ],
    ])('rejects malformed stored scale: %s', (_label, raw) => {
        expect(parseCancellationScale(raw)).toBeNull();
    });

    it('normalize throws on invalid agency input and normalizes valid input', () => {
        expect(() =>
            normalizeCancellationPolicyInput({ bands: [{ minDaysBeforeStart: 7, refundPercent: 50 }] }),
        ).toThrow(BadRequestException);
        expect(() => normalizeCancellationPolicyInput('nope')).toThrow(BadRequestException);
        expect(() =>
            normalizeCancellationPolicyInput({
                bands: [
                    { minDaysBeforeStart: 0, refundPercent: 10 },
                    { minDaysBeforeStart: 0, refundPercent: 20 },
                ],
            }),
        ).toThrow(BadRequestException);

        const normalized = normalizeCancellationPolicyInput({
            bands: [
                { minDaysBeforeStart: 0, refundPercent: 0 },
                { minDaysBeforeStart: 14, refundPercent: 80 },
            ],
        });
        expect(normalized.version).toBe(CANCELLATION_POLICY_VERSION);
        expect(normalized.bands.map((b) => b.minDaysBeforeStart)).toEqual([14, 0]);
    });

    it('falls back to the platform defaults when nothing valid is stored', () => {
        expect(resolveCancellationScale(null).bands).toEqual(PLATFORM_DEFAULT_CANCELLATION_BANDS);
        expect(resolveCancellationScale('garbage').bands).toEqual(PLATFORM_DEFAULT_CANCELLATION_BANDS);
        const snapshot = buildCancellationScaleSnapshot(null);
        expect(snapshot.floorRefundPercent).toBe(100);
        expect(snapshot.refundInitiationDays).toBe(7);
    });
});

describe('cancellation timing boundaries (#417)', () => {
    it('counts whole days: exactly 30×24h before start is 30 days', () => {
        expect(wholeDaysBeforeStart(START, daysBefore(30))).toBe(30);
        expect(wholeDaysBeforeStart(START, daysBefore(30, -1))).toBe(29); // 1ms inside the window
        expect(wholeDaysBeforeStart(START, START)).toBe(0);
        expect(wholeDaysBeforeStart(START, new Date(START.getTime() + DAY_MS))).toBe(-1);
    });

    it.each([
        [45, 100],
        [30, 100], // boundary: the 30-day band starts exactly at 30
        [29, 75],
        [15, 75],
        [14, 50],
        [7, 50],
        [6, 25],
        [3, 25],
        [2, 0],
        [0, 0],
    ])('default scale: cancelling %i days before start refunds %i%%', (days, percent) => {
        const result = computeCancellationRefund({
            paidAmount: D('200.00'),
            sessionStart: START,
            cancelledAt: daysBefore(days),
            scale: resolveCancellationScale(null),
            trigger: 'TRAVELLER',
        });
        expect(result.percent).toBe(percent);
        expect(result.daysBeforeStart).toBe(days);
    });

    it('a cancellation after the trip started resolves to the 0-day band', () => {
        const result = computeCancellationRefund({
            paidAmount: D('200.00'),
            sessionStart: START,
            cancelledAt: new Date(START.getTime() + 60_000),
            scale: resolveCancellationScale(null),
            trigger: 'TRAVELLER',
        });
        expect(result.percent).toBe(0);
        expect(result.amount.toString()).toBe('0');
    });
});

describe('cancellation refund amounts (#417)', () => {
    it('quantizes to 2 decimal places, half-up', () => {
        const scale = resolveCancellationScale(null);
        const seventyFive = computeCancellationRefund({
            paidAmount: D('199.99'),
            sessionStart: START,
            cancelledAt: daysBefore(20),
            scale,
            trigger: 'TRAVELLER',
        });
        expect(seventyFive.amount.toString()).toBe('149.99'); // 149.9925 → 149.99

        const twentyFive = computeCancellationRefund({
            paidAmount: D('199.99'),
            sessionStart: START,
            cancelledAt: daysBefore(5),
            scale,
            trigger: 'TRAVELLER',
        });
        expect(twentyFive.amount.toString()).toBe('50'); // 49.9975 → 50.00

        const halfCent = computeCancellationRefund({
            paidAmount: D('0.01'),
            sessionStart: START,
            cancelledAt: daysBefore(10),
            scale,
            trigger: 'TRAVELLER',
        });
        expect(halfCent.amount.toString()).toBe('0.01'); // 0.005 → 0.01 half-up
    });

    it('records the applied band in the rule marker', () => {
        const result = computeCancellationRefund({
            paidAmount: D('200.00'),
            sessionStart: START,
            cancelledAt: daysBefore(10),
            scale: resolveCancellationScale(null),
            trigger: 'TRAVELLER',
        });
        expect(result.rule).toBe('CANCELLATION_SCALE_BAND_7D_50PCT');
        expect(result.band).toEqual({ minDaysBeforeStart: 7, refundPercent: 50 });
    });

    it('the floor ignores the bands: agency fault refunds 100% even inside the 0% window', () => {
        const result = computeCancellationRefund({
            paidAmount: D('200.00'),
            sessionStart: START,
            cancelledAt: daysBefore(1),
            scale: resolveCancellationScale(null),
            trigger: 'AGENCY_FAULT',
        });
        expect(result.percent).toBe(100);
        expect(result.amount.toString()).toBe('200');
        expect(result.rule).toBe('AGENCY_FAULT_FULL_REFUND');
        expect(result.band).toBeNull();
    });

    it('the floor ignores the bands: minimum not reached refunds 100% with the existing rule marker', () => {
        const result = computeCancellationRefund({
            paidAmount: D('60.00'),
            sessionStart: START,
            cancelledAt: daysBefore(1),
            scale: resolveCancellationScale(null),
            trigger: 'MINIMUM_NOT_REACHED',
        });
        expect(result.percent).toBe(100);
        expect(result.amount.toString()).toBe('60');
        expect(result.rule).toBe('MINIMUM_GROUP_NOT_REACHED_DEPOSIT_REFUNDABLE');
    });

    it('an agency custom scale replaces the defaults for traveller cancellations', () => {
        const scale = resolveCancellationScale({
            bands: [
                { minDaysBeforeStart: 14, refundPercent: 80 },
                { minDaysBeforeStart: 0, refundPercent: 10 },
            ],
        });
        const early = computeCancellationRefund({
            paidAmount: D('100.00'),
            sessionStart: START,
            cancelledAt: daysBefore(20),
            scale,
            trigger: 'TRAVELLER',
        });
        expect(early.percent).toBe(80);
        const late = computeCancellationRefund({
            paidAmount: D('100.00'),
            sessionStart: START,
            cancelledAt: daysBefore(2),
            scale,
            trigger: 'TRAVELLER',
        });
        expect(late.percent).toBe(10);
        expect(late.amount.toString()).toBe('10');
    });
});
