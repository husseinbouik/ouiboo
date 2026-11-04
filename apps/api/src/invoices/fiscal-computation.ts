import { Prisma } from '@ouiboo/database';
import { toMoneyDecimal } from '../common/money.util';

/**
 * #426 (Council P0-10, Debate 5 resolution): the fiscal computation.
 *
 * The adopted fee rule, in one sentence: charge the platform service
 * fee when a booking reaches a terminal retained-value event — trip
 * completion, traveller cancellation with a charge retained, or
 * traveller no-show — on a base equal to the amount definitively
 * retained by the agency for that booking (total verified paid minus
 * all refunds completed), and reverse any fee already invoiced on
 * amounts later refunded by issuing a sequential credit note (avoir)
 * for rate × refunded amount plus its TVA in the period in which the
 * refund completes.
 *
 * TVA: fee and subscription are quoted and invoiced HT with TVA added
 * as a separate amount. The rate (default 20%, from billing config) is
 * the council's working assumption PENDING WRITTEN CONFIRMATION from
 * the expert-comptable — no source classifies a marketplace fee
 * expressly. It is a parameter everywhere in this module, never a
 * literal at a call site.
 *
 * All money is Prisma.Decimal at 2dp, rounded per line (the rounding
 * mechanics the Tax seat signed in Round 1 and which survive unchanged).
 */

export type TerminalEventType = 'COMPLETION' | 'CANCELLATION_RETAINED' | 'NO_SHOW';

export interface TerminalEvent {
    type: TerminalEventType;
    /** When the terminal event occurred (UTC); decides the billing period. */
    terminalAt: Date;
}

export interface BookingTerminalFacts {
    status: string;
    cancelledAt?: Date | null;
    attendanceRecordedAt?: Date | null;
    sessionEndDate?: Date | null;
}

/**
 * Classify a booking's terminal retained-value event from the facts the
 * code can actually produce today:
 * - COMPLETED → completion, at the session end date (the completion
 *   sweep flips the status once the session has ended).
 * - NO_SHOW → traveller no-show, at the attendance recording when the
 *   agency stamped one, else the session end date.
 * - CANCELLED → a cancellation, at cancelledAt. Whether it is
 *   *charge-retaining* is decided by the retained base (> 0): agency
 *   cancellations and minimum-unmet outcomes owe a full refund, so
 *   their retained base computes to 0 once refunds complete and they
 *   are excluded by the base, explicitly — never by a payment-status
 *   side effect (Debate 5, example (c)).
 * Anything else (PENDING, CONFIRMED, NOT_CONFIRMED, REJECTED, ...) has
 * no terminal event and can never accrue a fee.
 */
export function classifyTerminalEvent(facts: BookingTerminalFacts): TerminalEvent | null {
    switch (facts.status) {
        case 'COMPLETED':
            return facts.sessionEndDate
                ? { type: 'COMPLETION', terminalAt: facts.sessionEndDate }
                : null;
        case 'NO_SHOW':
            return facts.attendanceRecordedAt || facts.sessionEndDate
                ? { type: 'NO_SHOW', terminalAt: (facts.attendanceRecordedAt ?? facts.sessionEndDate) as Date }
                : null;
        case 'CANCELLED':
            return facts.cancelledAt
                ? { type: 'CANCELLATION_RETAINED', terminalAt: facts.cancelledAt }
                : null;
        default:
            return null;
    }
}

/** Retained base = verified paid − refunds completed, floored at 0. */
export function computeRetainedBase(
    verifiedPaid: Prisma.Decimal | number | string,
    refundsCompleted: Prisma.Decimal | number | string,
): Prisma.Decimal {
    const base = toMoneyDecimal(verifiedPaid, 'verifiedPaid').sub(
        toMoneyDecimal(refundsCompleted, 'refundsCompleted'),
    );
    return base.lt(0) ? new Prisma.Decimal(0) : base.toDecimalPlaces(2);
}

export interface FiscalLineAmounts {
    amountHt: Prisma.Decimal;
    vatRate: Prisma.Decimal;
    vatAmount: Prisma.Decimal;
    amountTtc: Prisma.Decimal;
}

/** HT + TVA breakdown for one HT amount at a TVA rate percent. */
export function computeVatBreakdown(
    amountHt: Prisma.Decimal | number | string,
    vatRatePercent: Prisma.Decimal | number | string,
): FiscalLineAmounts {
    const ht = toMoneyDecimal(amountHt, 'amountHt').toDecimalPlaces(2);
    const rate = toMoneyDecimal(vatRatePercent, 'vatRatePercent');
    const vatAmount = ht.mul(rate).div(100).toDecimalPlaces(2);
    return { amountHt: ht, vatRate: rate, vatAmount, amountTtc: ht.add(vatAmount) };
}

/** Fee HT for a retained base at the agency's fee rate percent. */
export function computeFeeHt(
    retainedBase: Prisma.Decimal | number | string,
    feeRatePercent: Prisma.Decimal | number | string,
): Prisma.Decimal {
    return toMoneyDecimal(retainedBase, 'retainedBase')
        .mul(toMoneyDecimal(feeRatePercent, 'feeRatePercent'))
        .div(100)
        .toDecimalPlaces(2);
}

/** One billed fee line: fee HT on the retained base, plus its TVA. */
export function computeFeeLine(
    retainedBase: Prisma.Decimal | number | string,
    feeRatePercent: Prisma.Decimal | number | string,
    vatRatePercent: Prisma.Decimal | number | string,
): FiscalLineAmounts & { feeHt: Prisma.Decimal } {
    const feeHt = computeFeeHt(retainedBase, feeRatePercent);
    return { feeHt, ...computeVatBreakdown(feeHt, vatRatePercent) };
}

/**
 * One credit-note (avoir) line reversing the fee on a refunded amount:
 * rate × refunded amount, plus its TVA, as NEGATIVE amounts.
 */
export function computeCreditNoteLine(
    refundedAmount: Prisma.Decimal | number | string,
    feeRatePercent: Prisma.Decimal | number | string,
    vatRatePercent: Prisma.Decimal | number | string,
): FiscalLineAmounts & { feeHt: Prisma.Decimal } {
    const feeHt = computeFeeHt(refundedAmount, feeRatePercent);
    const breakdown = computeVatBreakdown(feeHt, vatRatePercent);
    const neg = (d: Prisma.Decimal) => (d.isZero() ? d : d.neg());
    return {
        feeHt: neg(feeHt),
        amountHt: neg(breakdown.amountHt),
        vatRate: breakdown.vatRate,
        vatAmount: neg(breakdown.vatAmount),
        amountTtc: neg(breakdown.amountTtc),
    };
}

/** Subscription line: the configured monthly HT price plus its TVA. */
export function computeSubscriptionLine(
    monthlyPriceHt: Prisma.Decimal | number | string,
    vatRatePercent: Prisma.Decimal | number | string,
): FiscalLineAmounts {
    return computeVatBreakdown(monthlyPriceHt, vatRatePercent);
}
