import {
    classifyTerminalEvent,
    computeCreditNoteLine,
    computeFeeLine,
    computeRetainedBase,
    computeSubscriptionLine,
} from './fiscal-computation';

/**
 * #426 (Council P0-10) — the Council Session #1 Debate 5 worked
 * examples (a)–(e), encoded against the fiscal computation.
 * Source: hidden_files/council/run-2026-10-24/debate/
 * collision-5-numeric-examples.md. Working parameters throughout:
 * trip price 2,000 MAD, fee rate 10%, TVA 20% (working assumption
 * pending written confirmation).
 *
 * Outcomes:
 * (a) completed 2,000 → fee 200.00 HT + 40.00 TVA = 240.00 TTC.
 * (b) deposit-cancel, 200 retained → 20.00 HT + 4.00 TVA = 24.00 TTC.
 * (c) group confirmed, agency cancels, 2,000 refunded → fee 0; a fee
 *     invoiced before the refund reverses by an avoir of
 *     200.00 HT + 40.00 TVA = 240.00 TTC.
 * (d) trial agency, 200,000 MAD month → the fee computation gives
 *     20,000.00 HT + 4,000.00 TVA = 24,000.00 TTC on terminal events
 *     (the Tax reading). The Product/Trust reading adopted in the
 *     #435 draft trial terms bills only post-expiry terminal events:
 *     on an even spread, 16/30 of the base is billable →
 *     10,666.67 HT + 2,133.33 TVA = 12,800.00 TTC. Both arithmetics
 *     are pinned here; the trial split itself is enforced in
 *     InvoicesService (terminalAt before trialEndsAt is excluded) and
 *     covered at service level in invoices.service.spec.ts.
 * (e) traveller no-show, full 2,000 retained → 240.00 TTC, identical
 *     to (a) by rule (not by blindness). A later goodwill refund of
 *     1,000 reverses by an avoir of 100.00 HT + 20.00 TVA = 120.00 TTC,
 *     leaving a net fee of 120.00 TTC.
 * The foreign-agency example of Round 1 Tax F7 was explicitly replaced
 * by Debate 5's (e) and is DEFERRABLE (P2-06) — no computation here.
 */
describe('Debate 5 worked examples (#426)', () => {
    const FEE = 10;
    const TVA = 20;

    it('(a) completed trip: fee on the full retained 2,000', () => {
        const base = computeRetainedBase(2000, 0);
        expect(base.toFixed(2)).toBe('2000.00');
        const line = computeFeeLine(base, FEE, TVA);
        expect(line.feeHt.toFixed(2)).toBe('200.00');
        expect(line.vatAmount.toFixed(2)).toBe('40.00');
        expect(line.amountTtc.toFixed(2)).toBe('240.00');
        // The TTC-quoted alternative the debate rejected: if "10%" had
        // been quoted TTC, Ouiboo would net HT 166.67 (effective 8.33%).
        expect((200 / 1.2).toFixed(2)).toBe('166.67');
    });

    it('(b) traveller cancels after the 600 deposit, agency retains 200, refunds 400', () => {
        const base = computeRetainedBase(600, 400);
        expect(base.toFixed(2)).toBe('200.00');
        const line = computeFeeLine(base, FEE, TVA);
        expect(line.feeHt.toFixed(2)).toBe('20.00');
        expect(line.vatAmount.toFixed(2)).toBe('4.00');
        expect(line.amountTtc.toFixed(2)).toBe('24.00');
        // Stage-independence: full payment then the same retention
        // (2,000 paid, 1,800 refunded) yields the identical fee.
        const twin = computeFeeLine(computeRetainedBase(2000, 1800), FEE, TVA);
        expect(twin.amountTtc.toFixed(2)).toBe('24.00');
    });

    it('(c) agency cancels a confirmed, fully paid group trip and refunds everything: fee 0', () => {
        const base = computeRetainedBase(2000, 2000);
        expect(base.toFixed(2)).toBe('0.00');
        const line = computeFeeLine(base, FEE, TVA);
        expect(line.amountTtc.toFixed(2)).toBe('0.00');
        // Minimum-unmet base case: deposit 600 fully refunded → also 0,
        // by the explicit base rule, not by a payment-status filter.
        expect(computeRetainedBase(600, 600).toFixed(2)).toBe('0.00');
    });

    it('(c-reversal) a fee invoiced before the agency cancellation reverses by avoir 240.00 TTC', () => {
        const avoir = computeCreditNoteLine(2000, FEE, TVA);
        expect(avoir.feeHt.toFixed(2)).toBe('-200.00');
        expect(avoir.vatAmount.toFixed(2)).toBe('-40.00');
        expect(avoir.amountTtc.toFixed(2)).toBe('-240.00');
    });

    it('(d) trial agency 200,000 month: full-base arithmetic (Tax reading)', () => {
        const line = computeFeeLine(computeRetainedBase(200000, 0), FEE, TVA);
        expect(line.feeHt.toFixed(2)).toBe('20000.00');
        expect(line.vatAmount.toFixed(2)).toBe('4000.00');
        expect(line.amountTtc.toFixed(2)).toBe('24000.00');
    });

    it('(d) post-expiry-only arithmetic (Product/Trust reading, adopted in the #435 draft terms)', () => {
        // Even spread over a 30-day month, trial expires day 14:
        // post-expiry base = 16/30 × 200,000 = 106,666.67.
        const postExpiryBase = computeRetainedBase('106666.67', 0);
        const line = computeFeeLine(postExpiryBase, FEE, TVA);
        expect(line.feeHt.toFixed(2)).toBe('10666.67');
        expect(line.vatAmount.toFixed(2)).toBe('2133.33');
        expect(line.amountTtc.toFixed(2)).toBe('12800.00');
        // The disputed difference between the two readings:
        expect((24000 - 12800).toFixed(2)).toBe('11200.00');
    });

    it('(d-subscription) the illustrative 299 HT subscription bills 358.80 TTC', () => {
        const line = computeSubscriptionLine(299, TVA);
        expect(line.amountHt.toFixed(2)).toBe('299.00');
        expect(line.vatAmount.toFixed(2)).toBe('59.80');
        expect(line.amountTtc.toFixed(2)).toBe('358.80');
    });

    it('(e) traveller no-show with full retention: same fee as completion, by rule', () => {
        const event = classifyTerminalEvent({
            status: 'NO_SHOW',
            attendanceRecordedAt: new Date(Date.UTC(2026, 9, 12)),
            sessionEndDate: new Date(Date.UTC(2026, 9, 12)),
        });
        expect(event?.type).toBe('NO_SHOW');
        const line = computeFeeLine(computeRetainedBase(2000, 0), FEE, TVA);
        expect(line.amountTtc.toFixed(2)).toBe('240.00');
    });

    it('(e-goodwill) a later 1,000 goodwill refund reverses 120.00 TTC, net fee 120.00 TTC', () => {
        const avoir = computeCreditNoteLine(1000, FEE, TVA);
        expect(avoir.feeHt.toFixed(2)).toBe('-100.00');
        expect(avoir.vatAmount.toFixed(2)).toBe('-20.00');
        expect(avoir.amountTtc.toFixed(2)).toBe('-120.00');
        const net = computeFeeLine(computeRetainedBase(2000, 1000), FEE, TVA);
        expect(net.amountTtc.toFixed(2)).toBe('120.00');
    });

    it('terminal classification: only completion / cancellation / no-show classify', () => {
        const end = new Date(Date.UTC(2026, 9, 10));
        expect(classifyTerminalEvent({ status: 'COMPLETED', sessionEndDate: end })?.type).toBe('COMPLETION');
        expect(
            classifyTerminalEvent({ status: 'CANCELLED', cancelledAt: end })?.type,
        ).toBe('CANCELLATION_RETAINED');
        expect(classifyTerminalEvent({ status: 'CONFIRMED', sessionEndDate: end })).toBeNull();
        expect(classifyTerminalEvent({ status: 'NOT_CONFIRMED', sessionEndDate: end })).toBeNull();
        expect(classifyTerminalEvent({ status: 'PENDING', sessionEndDate: end })).toBeNull();
    });
});
