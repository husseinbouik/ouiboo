import {
  TRAVELER_REFUND_DISPUTE_WINDOW_DAYS,
  canConfirmTravelerRefundReceipt,
  canDisputeTravelerRefund,
  travelerRefundDisputeDeadline,
} from '@ouiboo/utils';

const DAY_MS = 24 * 60 * 60 * 1000;
const COMPLETED_AT = '2026-10-05T10:00:00.000Z';

describe('traveler refund receipt actions (#416C)', () => {
  it('allows confirming receipt only while the refund is initiated and unconfirmed', () => {
    expect(
      canConfirmTravelerRefundReceipt({ status: 'REFUND_INITIATED', travellerConfirmedAt: null }),
    ).toBe(true);
    expect(
      canConfirmTravelerRefundReceipt({
        status: 'REFUND_INITIATED',
        travellerConfirmedAt: '2026-10-06T10:00:00.000Z',
      }),
    ).toBe(false);
    expect(
      canConfirmTravelerRefundReceipt({ status: 'REFUND_COMPLETED', travellerConfirmedAt: null }),
    ).toBe(false);
    expect(
      canConfirmTravelerRefundReceipt({ status: 'AGENCY_ACTION_REQUIRED', travellerConfirmedAt: null }),
    ).toBe(false);
  });

  it('computes the dispute deadline 60 days after completion', () => {
    const deadline = travelerRefundDisputeDeadline(COMPLETED_AT);
    expect(deadline?.getTime()).toBe(
      new Date(COMPLETED_AT).getTime() + TRAVELER_REFUND_DISPUTE_WINDOW_DAYS * DAY_MS,
    );
    expect(travelerRefundDisputeDeadline(null)).toBeNull();
    expect(travelerRefundDisputeDeadline('not-a-date')).toBeNull();
  });

  it('allows disputing a completed refund inside the window, only once', () => {
    const inside = new Date(new Date(COMPLETED_AT).getTime() + 30 * DAY_MS);
    expect(
      canDisputeTravelerRefund({ status: 'REFUND_COMPLETED', completedAt: COMPLETED_AT, disputedAt: null }, inside),
    ).toBe(true);
    expect(
      canDisputeTravelerRefund(
        { status: 'REFUND_COMPLETED', completedAt: COMPLETED_AT, disputedAt: '2026-10-20T10:00:00.000Z' },
        inside,
      ),
    ).toBe(false);
  });

  it('refuses disputes after the window or for non-completed cases', () => {
    const outside = new Date(new Date(COMPLETED_AT).getTime() + 61 * DAY_MS);
    expect(
      canDisputeTravelerRefund({ status: 'REFUND_COMPLETED', completedAt: COMPLETED_AT, disputedAt: null }, outside),
    ).toBe(false);
    expect(
      canDisputeTravelerRefund({ status: 'REFUND_INITIATED', completedAt: null, disputedAt: null }, outside),
    ).toBe(false);
    expect(
      canDisputeTravelerRefund({ status: 'REFUND_COMPLETED', completedAt: null, disputedAt: null }, outside),
    ).toBe(false);
  });
});
