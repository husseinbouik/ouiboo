import { BookingStatus, LicenceStatus, PayoutStatus, VerificationStatus } from '@ouiboo/types';
import {
  getAdminBookingBadgeLabel,
  getAdminLicenceBadgeClass,
  getAdminLicenceBadgeLabel,
  getAdminPayoutBadgeMeta,
  getAdminVerificationBadgeClass,
  getEffectiveLicenceStatus,
  isRejectedPayout,
} from './status-mappers';

describe('admin status mappers', () => {
  it('formats canonical booking statuses for display', () => {
    expect(getAdminBookingBadgeLabel(BookingStatus.AwaitingValidation)).toBe('Awaiting Validation');
    expect(getAdminBookingBadgeLabel(BookingStatus.Confirmed)).toBe('CONFIRMED');
  });

  it('maps verification status to badge classes', () => {
    expect(getAdminVerificationBadgeClass(VerificationStatus.Verified)).toContain('success');
    expect(getAdminVerificationBadgeClass(VerificationStatus.Rejected)).toContain('danger');
    expect(getAdminVerificationBadgeClass(VerificationStatus.Pending)).toContain('warning');
  });

  it('identifies rejected payouts using the canonical payout enum', () => {
    expect(isRejectedPayout(PayoutStatus.Rejected)).toBe(true);
    expect(isRejectedPayout(PayoutStatus.Paid)).toBe(false);
  });

  it('maps payout statuses to consistent badge metadata', () => {
    expect(getAdminPayoutBadgeMeta(PayoutStatus.Pending).label).toBe('Pending');
    expect(getAdminPayoutBadgeMeta(PayoutStatus.Rejected).helperText).toContain('returned');
    expect(getAdminPayoutBadgeMeta(PayoutStatus.Paid).className).toContain('success');
  });

  it('maps licence statuses to badge classes (#371)', () => {
    expect(getAdminLicenceBadgeClass(LicenceStatus.Verified)).toContain('success');
    expect(getAdminLicenceBadgeClass(LicenceStatus.PendingReview)).toContain('warning');
    expect(getAdminLicenceBadgeClass(LicenceStatus.Rejected)).toContain('danger');
    expect(getAdminLicenceBadgeClass(LicenceStatus.Expired)).toContain('danger');
    // Without a translator the raw status is returned (same contract as the
    // verification labels); with one, the licence key is translated.
    expect(getAdminLicenceBadgeLabel(LicenceStatus.NotSubmitted)).toBe('NOT_SUBMITTED');
    expect(getAdminLicenceBadgeLabel(LicenceStatus.Expired, (key) => key)).toBe('dashboard.status.licenceExpired');
  });

  it('derives the effective licence status with expiry on read (#371)', () => {
    // Server-provided effective status wins.
    expect(getEffectiveLicenceStatus({
      travelLicenceStatus: 'VERIFIED',
      effectiveLicenceStatus: 'EXPIRED',
      licenceExpiry: null,
    })).toBe(LicenceStatus.Expired);
    // A verified licence past its expiry reads as expired.
    expect(getEffectiveLicenceStatus({
      travelLicenceStatus: 'VERIFIED',
      licenceExpiry: '2020-01-01T00:00:00.000Z',
    })).toBe(LicenceStatus.Expired);
    // A verified licence still within validity stays verified.
    expect(getEffectiveLicenceStatus({
      travelLicenceStatus: 'VERIFIED',
      licenceExpiry: '2999-01-01T00:00:00.000Z',
    })).toBe(LicenceStatus.Verified);
    expect(getEffectiveLicenceStatus({})).toBe(LicenceStatus.NotSubmitted);
  });
});