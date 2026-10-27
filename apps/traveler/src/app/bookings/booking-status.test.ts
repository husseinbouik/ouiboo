import { BookingPaymentStatus, BookingStatus, PaymentMethod, RefundStatus, VerificationStatus } from '@ouiboo/types';
import {
  canRetryTravelerPayment,
  canCancelTravelerBooking,
  getTravelerBookingStatusTone,
  getTravelerPaymentStatusMeta,
  getTravelerProofStatus,
  shouldShowUploadAction,
} from '@ouiboo/utils';

describe('traveler booking status helpers', () => {
  it('maps canonical booking states to the expected badge tone', () => {
    expect(getTravelerBookingStatusTone(BookingStatus.Confirmed)).toContain('success');
    expect(getTravelerBookingStatusTone(BookingStatus.AwaitingValidation)).toContain('ocean');
    expect(getTravelerBookingStatusTone(BookingStatus.Pending)).toContain('amber');
    expect(getTravelerBookingStatusTone(BookingStatus.Cancelled)).toContain('rose');
  });

  it('only shows the upload action for pending bookings without a proof', () => {
    expect(shouldShowUploadAction(BookingStatus.Pending, false)).toBe(true);
    expect(shouldShowUploadAction(BookingStatus.Pending, true)).toBe(false);
    expect(shouldShowUploadAction(BookingStatus.AwaitingValidation, false)).toBe(false);
  });

  it('disables cancellation only for completed and cancelled bookings', () => {
    expect(canCancelTravelerBooking(BookingStatus.Pending)).toBe(true);
    expect(canCancelTravelerBooking(BookingStatus.Confirmed)).toBe(true);
    expect(canCancelTravelerBooking(BookingStatus.Cancelled)).toBe(false);
    expect(canCancelTravelerBooking(BookingStatus.Completed)).toBe(false);
  });

  it('maps proof verification states to user-facing labels', () => {
    expect(getTravelerProofStatus(VerificationStatus.Pending).label).toBe('Received — awaiting review');
    expect(getTravelerProofStatus(VerificationStatus.Verified).label).toBe('Payment confirmed');
    expect(getTravelerProofStatus(VerificationStatus.Rejected).label).toBe('Rejected');
    expect(getTravelerProofStatus(undefined).label).toBe('Not uploaded');
  });

  // #422 (Council P0-20): an accepted proof is NOT a settled payment —
  // it must read as pending bank confirmation and never reuse the
  // confirmed/paid styling.
  it('never presents an accepted proof as paid or confirmed', () => {
    const accepted = getTravelerProofStatus(VerificationStatus.Accepted);
    expect(accepted.label).toBe('Accepted — pending bank confirmation');
    expect(accepted.label).not.toMatch(/paid/i);
    expect(accepted.className).not.toContain('success');
    expect(getTravelerProofStatus(VerificationStatus.Pending).className).not.toContain('success');
  });

  it('maps canonical payment and refund states for the traveler booking card', () => {
    expect(getTravelerPaymentStatusMeta(BookingPaymentStatus.Unpaid).label).toBe('Unpaid');
    expect(getTravelerPaymentStatusMeta(BookingPaymentStatus.Paid).label).toBe('Paid');
    expect(getTravelerPaymentStatusMeta(BookingPaymentStatus.Failed).label).toBe('Payment Failed');
    expect(getTravelerPaymentStatusMeta(BookingPaymentStatus.Refunded, RefundStatus.Processed).label).toBe('Refunded');
  });

  // #412 (Council Session #2, B15): the badge derives from
  // paymentStatus + refundStatus together — a processed refund on a
  // booking that is not fully refunded reads as a partial refund,
  // never as plain "Paid"/"Deposit paid".
  it('derives the badge from payment and refund status together', () => {
    expect(
      getTravelerPaymentStatusMeta(BookingPaymentStatus.Paid, RefundStatus.Processed).label,
    ).toBe('Partially refunded');
    expect(
      getTravelerPaymentStatusMeta(BookingPaymentStatus.PartiallyPaid, RefundStatus.Processed).label,
    ).toBe('Partially refunded');
    // An in-flight refund does not rewrite the paid badge.
    expect(
      getTravelerPaymentStatusMeta(BookingPaymentStatus.Paid, RefundStatus.Pending).label,
    ).toBe('Paid');
    expect(
      getTravelerPaymentStatusMeta(BookingPaymentStatus.PartiallyPaid, RefundStatus.Pending).label,
    ).toBe('Deposit paid');
    // A full refund still wins outright.
    expect(
      getTravelerPaymentStatusMeta(BookingPaymentStatus.Refunded, RefundStatus.Pending).label,
    ).toBe('Refund in Progress');
  });

  it('only shows retry payment for retryable gateway bookings', () => {
    expect(
      canRetryTravelerPayment({
        paymentMethod: PaymentMethod.Gateway,
        paymentStatus: BookingPaymentStatus.Failed,
        status: BookingStatus.Cancelled,
      }),
    ).toBe(true);

    expect(
      canRetryTravelerPayment({
        paymentMethod: PaymentMethod.Manual,
        paymentStatus: BookingPaymentStatus.Failed,
        status: BookingStatus.Rejected,
      }),
    ).toBe(false);

    expect(
      canRetryTravelerPayment({
        paymentMethod: PaymentMethod.Gateway,
        paymentStatus: BookingPaymentStatus.Paid,
        refundStatus: RefundStatus.Processed,
        status: BookingStatus.Confirmed,
      }),
    ).toBe(false);
  });
});

