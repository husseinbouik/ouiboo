import { BookingStatus, PayoutStatus, VerificationStatus } from '@ouiboo/types';
import {
  getAdminBookingBadgeLabel,
  getAdminPayoutBadgeMeta,
  getAdminVerificationBadgeClass,
  isRejectedPayout,
} from './status-mappers';

describe('admin status mappers', () => {
  it('formats canonical booking statuses for display', () => {
    expect(getAdminBookingBadgeLabel(BookingStatus.AwaitingValidation)).toBe('Awaiting Validation');
    expect(getAdminBookingBadgeLabel(BookingStatus.Confirmed)).toBe('CONFIRMED');
  });

  it('maps verification status to badge classes', () => {
    expect(getAdminVerificationBadgeClass(VerificationStatus.Verified)).toContain('green');
    expect(getAdminVerificationBadgeClass(VerificationStatus.Rejected)).toContain('red');
    expect(getAdminVerificationBadgeClass(VerificationStatus.Pending)).toContain('amber');
  });

  it('identifies rejected payouts using the canonical payout enum', () => {
    expect(isRejectedPayout(PayoutStatus.Rejected)).toBe(true);
    expect(isRejectedPayout(PayoutStatus.Paid)).toBe(false);
  });

  it('maps payout statuses to consistent badge metadata', () => {
    expect(getAdminPayoutBadgeMeta(PayoutStatus.Pending).label).toBe('Pending');
    expect(getAdminPayoutBadgeMeta(PayoutStatus.Rejected).helperText).toContain('returned');
    expect(getAdminPayoutBadgeMeta(PayoutStatus.Paid).className).toContain('emerald');
  });
});
