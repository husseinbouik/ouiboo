import { summarizeCancellation, FREE_CANCELLATION_MIN_DAYS } from './cancellation.util';

describe('summarizeCancellation (#687 standardised definition)', () => {
    it('platform defaults are free cancellation up to 30 days', () => {
        const summary = summarizeCancellation(null);
        expect(summary.freeCancellation).toBe(true);
        expect(summary.freeCancellationDays).toBe(30);
        expect(summary.bestRefundPercent).toBe(100);
    });

    it('a 100% band starting at 0 days only is NOT free cancellation', () => {
        const summary = summarizeCancellation({
            bands: [
                { minDaysBeforeStart: 0, refundPercent: 100 },
            ],
        });
        expect(summary.freeCancellation).toBe(false);
        expect(summary.freeCancellationDays).toBeNull();
    });

    it('a 100% band at exactly the minimum threshold counts', () => {
        const summary = summarizeCancellation({
            bands: [
                { minDaysBeforeStart: FREE_CANCELLATION_MIN_DAYS, refundPercent: 100 },
                { minDaysBeforeStart: 0, refundPercent: 0 },
            ],
        });
        expect(summary.freeCancellation).toBe(true);
        expect(summary.freeCancellationDays).toBe(FREE_CANCELLATION_MIN_DAYS);
    });

    it('no 100% band means no free tier; best percent still reported', () => {
        const summary = summarizeCancellation({
            bands: [
                { minDaysBeforeStart: 10, refundPercent: 50 },
                { minDaysBeforeStart: 0, refundPercent: 0 },
            ],
        });
        expect(summary.freeCancellation).toBe(false);
        expect(summary.bestRefundPercent).toBe(50);
    });

    it('malformed stored policy falls back to the platform defaults', () => {
        const summary = summarizeCancellation({ bands: 'nope' });
        expect(summary.freeCancellation).toBe(true);
        expect(summary.freeCancellationDays).toBe(30);
    });
});
