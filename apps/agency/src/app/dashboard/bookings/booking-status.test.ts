import { BookingPaymentStatus, BookingStatus, VerificationStatus } from '@ouiboo/types';
import { getAgencyBookingStatusMeta, getAgencyPaymentStatusMeta, getAgencyProofStatusLabel } from './booking-status';

describe('agency booking status helpers', () => {
  it('maps canonical booking statuses to status badge metadata', () => {
    expect(getAgencyBookingStatusMeta(BookingStatus.Confirmed).icon).toBe('confirmed');
    expect(getAgencyBookingStatusMeta(BookingStatus.AwaitingValidation).icon).toBe('awaiting');
    expect(getAgencyBookingStatusMeta(BookingStatus.Pending).icon).toBe('pending');
  });

  it('maps proof verification states to review labels', () => {
    expect(getAgencyProofStatusLabel(VerificationStatus.Pending).displayLabel).toBe('Awaiting Review');
    expect(getAgencyProofStatusLabel(VerificationStatus.Verified).displayLabel).toBe('Verified');
    expect(getAgencyProofStatusLabel(VerificationStatus.Rejected).displayLabel).toBe('Rejected');
    expect(getAgencyProofStatusLabel(undefined).displayLabel).toBe('Not Uploaded');
  });

  it('maps canonical payment states for the agency booking table', () => {
    expect(getAgencyPaymentStatusMeta(BookingPaymentStatus.Paid).label).toBe('Paid');
    expect(getAgencyPaymentStatusMeta(BookingPaymentStatus.Failed).label).toBe('Payment Failed');
    expect(getAgencyPaymentStatusMeta(BookingPaymentStatus.Unpaid).label).toBe('Unpaid');
  });
});
