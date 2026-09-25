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
    expect(getTravelerProofStatus(VerificationStatus.Pending).label).toBe('Pending');
    expect(getTravelerProofStatus(VerificationStatus.Verified).label).toBe('Verified');
    expect(getTravelerProofStatus(VerificationStatus.Rejected).label).toBe('Rejected');
    expect(getTravelerProofStatus(undefined).label).toBe('Not uploaded');
  });

  it('maps canonical payment and refund states for the traveler booking card', () => {
    expect(getTravelerPaymentStatusMeta(BookingPaymentStatus.Unpaid).label).toBe('Unpaid');
    expect(getTravelerPaymentStatusMeta(BookingPaymentStatus.Paid).label).toBe('Paid');
    expect(getTravelerPaymentStatusMeta(BookingPaymentStatus.Failed).label).toBe('Payment Failed');
    expect(getTravelerPaymentStatusMeta(BookingPaymentStatus.Refunded, RefundStatus.Processed).label).toBe('Refunded');
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

