import { BookingStatus, LicenceStatus, PayoutStatus, VerificationStatus } from '@ouiboo/types';
import {
  getAdminAuditActionLabel,
  getAdminBankDetailsBadgeClass,
  getAdminBankDetailsBadgeLabel,
  getAdminBookingBadgeLabel,
  getAdminInsuranceBadgeClass,
  getAdminInsuranceBadgeLabel,
  getAdminLicenceBadgeClass,
  getAdminLicenceBadgeLabel,
  getAdminPayoutBadgeMeta,
  getAdminVerificationBadgeClass,
  getEffectiveInsuranceStatus,
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
describe('admin insurance + bank-details mappers (#415/#421)', () => {
  it('derives the effective insurance status mirroring the licence rules', () => {
    // Server-provided effective status wins.
    expect(getEffectiveInsuranceStatus({
      insuranceStatus: 'VERIFIED',
      effectiveInsuranceStatus: 'EXPIRED',
      insuranceExpiry: null,
    })).toBe(LicenceStatus.Expired);
    // A verified policy past its expiry reads as expired.
    expect(getEffectiveInsuranceStatus({
      insuranceStatus: 'VERIFIED',
      insuranceExpiry: '2020-01-01T00:00:00.000Z',
    })).toBe(LicenceStatus.Expired);
    // A verified policy still within validity stays verified.
    expect(getEffectiveInsuranceStatus({
      insuranceStatus: 'VERIFIED',
      insuranceExpiry: '2999-01-01T00:00:00.000Z',
    })).toBe(LicenceStatus.Verified);
    expect(getEffectiveInsuranceStatus({})).toBe(LicenceStatus.NotSubmitted);
  });

  it('maps insurance statuses to badge classes and labels', () => {
    expect(getAdminInsuranceBadgeClass(LicenceStatus.Verified)).toContain('success');
    expect(getAdminInsuranceBadgeClass(LicenceStatus.PendingReview)).toContain('warning');
    expect(getAdminInsuranceBadgeClass(LicenceStatus.Expired)).toContain('danger');
    expect(getAdminInsuranceBadgeLabel(LicenceStatus.Verified, (key) => key)).toBe('dashboard.status.insuranceVerified');
    expect(getAdminInsuranceBadgeLabel(LicenceStatus.NotSubmitted)).toBe('NOT_SUBMITTED');
  });

  it('maps bank-details statuses to badge classes and labels', () => {
    expect(getAdminBankDetailsBadgeClass('VERIFIED')).toContain('success');
    expect(getAdminBankDetailsBadgeClass('PENDING_REVIEW')).toContain('warning');
    expect(getAdminBankDetailsBadgeClass('REJECTED')).toContain('danger');
    expect(getAdminBankDetailsBadgeClass('UNVERIFIED')).toContain('muted');
    expect(getAdminBankDetailsBadgeClass(undefined)).toContain('muted');
    expect(getAdminBankDetailsBadgeLabel('PENDING_REVIEW', (key) => key)).toBe('dashboard.status.bankPendingReview');
    expect(getAdminBankDetailsBadgeLabel(undefined)).toBe('Unverified');
  });
});
describe('admin audit action labels (#423)', () => {
  const t = (key: string) => `translated:${key}`;

  it('maps every intervention audit action to its label key', () => {
    expect(getAdminAuditActionLabel('ADMIN_GROUP_FORCE_CONFIRMED', t)).toBe(
      'translated:dashboard.auditActions.ADMIN_GROUP_FORCE_CONFIRMED',
    );
    expect(getAdminAuditActionLabel('ADMIN_GROUP_CLOSED', t)).toBe(
      'translated:dashboard.auditActions.ADMIN_GROUP_CLOSED',
    );
    expect(getAdminAuditActionLabel('ADMIN_DEADLINE_EXTENDED', t)).toBe(
      'translated:dashboard.auditActions.ADMIN_DEADLINE_EXTENDED',
    );
    expect(getAdminAuditActionLabel('ADMIN_BOOKING_REPAIRED', t)).toBe(
      'translated:dashboard.auditActions.ADMIN_BOOKING_REPAIRED',
    );
    expect(getAdminAuditActionLabel('ADMIN_REFUND_REPAIRED', t)).toBe(
      'translated:dashboard.auditActions.ADMIN_REFUND_REPAIRED',
    );
  });

  it('keeps unknown actions raw, with or without a translator', () => {
    expect(getAdminAuditActionLabel('AGENCY_VERIFIED', t)).toBe('AGENCY_VERIFIED');
    expect(getAdminAuditActionLabel('AGENCY_VERIFIED')).toBe('AGENCY_VERIFIED');
  });

  it('keeps known actions raw when no translator is provided', () => {
    expect(getAdminAuditActionLabel('ADMIN_GROUP_CLOSED')).toBe('ADMIN_GROUP_CLOSED');
  });
});
