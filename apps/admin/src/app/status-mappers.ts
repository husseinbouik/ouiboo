import {
  BookingPaymentStatus,
  BookingStatus,
  LicenceStatus,
  PayoutStatus,
  SubscriptionStatus,
  VerificationStatus,
  type BookingPaymentStatusType,
  type BookingStatusType,
  type LicenceStatusType,
  type PayoutStatusType,
  type VerificationStatusType,
} from '@ouiboo/types';

type Translate = (key: string) => string;

const VERIFICATION_STATUS_KEYS: Record<string, string> = {
  [VerificationStatus.Pending]: 'dashboard.status.verificationPending',
  [VerificationStatus.Verified]: 'dashboard.status.verificationVerified',
  [VerificationStatus.Rejected]: 'dashboard.status.verificationRejected',
};

// #371: Law 11-16 travel licence lifecycle.
const LICENCE_STATUS_KEYS: Record<string, string> = {
  [LicenceStatus.NotSubmitted]: 'dashboard.status.licenceNotSubmitted',
  [LicenceStatus.PendingReview]: 'dashboard.status.licencePendingReview',
  [LicenceStatus.Verified]: 'dashboard.status.licenceVerified',
  [LicenceStatus.Rejected]: 'dashboard.status.licenceRejected',
  [LicenceStatus.Expired]: 'dashboard.status.licenceExpired',
};

// #415: RC insurance artefact — same lifecycle as the licence, own labels.
const INSURANCE_STATUS_KEYS: Record<string, string> = {
  [LicenceStatus.NotSubmitted]: 'dashboard.status.insuranceNotSubmitted',
  [LicenceStatus.PendingReview]: 'dashboard.status.insurancePendingReview',
  [LicenceStatus.Verified]: 'dashboard.status.insuranceVerified',
  [LicenceStatus.Rejected]: 'dashboard.status.insuranceRejected',
  [LicenceStatus.Expired]: 'dashboard.status.insuranceExpired',
};

// #421: payment-destination (bank details) verification lifecycle.
const BANK_DETAILS_STATUS_KEYS: Record<string, string> = {
  UNVERIFIED: 'dashboard.status.bankUnverified',
  PENDING_REVIEW: 'dashboard.status.bankPendingReview',
  VERIFIED: 'dashboard.status.bankVerified',
  REJECTED: 'dashboard.status.bankRejected',
};

const SUBSCRIPTION_STATUS_KEYS: Record<string, string> = {
  [SubscriptionStatus.Trial]: 'dashboard.status.subscriptionTrial',
  [SubscriptionStatus.Active]: 'dashboard.status.subscriptionActive',
  [SubscriptionStatus.Cancelled]: 'dashboard.status.subscriptionCancelled',
  [SubscriptionStatus.Expired]: 'dashboard.status.subscriptionExpired',
};

const BOOKING_STATUS_KEYS: Record<string, string> = {
  [BookingStatus.Pending]: 'dashboard.status.bookingPending',
  [BookingStatus.AwaitingValidation]: 'dashboard.status.bookingAwaitingValidation',
  [BookingStatus.Confirmed]: 'dashboard.status.bookingConfirmed',
  [BookingStatus.Rejected]: 'dashboard.status.bookingRejected',
  [BookingStatus.Cancelled]: 'dashboard.status.bookingCancelled',
  [BookingStatus.Completed]: 'dashboard.status.bookingCompleted',
  [BookingStatus.NoShow]: 'dashboard.status.bookingNoShow',
};

const BOOKING_PAYMENT_STATUS_KEYS: Record<string, string> = {
  [BookingPaymentStatus.Unpaid]: 'dashboard.status.paymentUnpaid',
  [BookingPaymentStatus.Paid]: 'dashboard.status.paymentPaid',
  [BookingPaymentStatus.Refunded]: 'dashboard.status.paymentRefunded',
  [BookingPaymentStatus.Failed]: 'dashboard.status.paymentFailed',
};

const statusLabel = (status: string | undefined, keys: Record<string, string>, fallback: string, t?: Translate) => {
  const key = status ? keys[status] : undefined;
  if (key) {
    return t ? t(key) : status;
  }
  return status || fallback;
};

export const getAdminVerificationBadgeClass = (status?: VerificationStatusType) => {
  if (status === VerificationStatus.Verified) {
    return 'bg-success/15 text-success';
  }

  if (status === VerificationStatus.Rejected) {
    return 'bg-danger/15 text-danger';
  }

  return 'bg-warning/15 text-warning';
};

export const getAdminVerificationBadgeLabel = (status?: VerificationStatusType, t?: Translate) => {
  return statusLabel(status, VERIFICATION_STATUS_KEYS, t ? t('dashboard.status.verificationPending') : 'Pending', t);
};

// #422 (Council P0-20): read-only bank-confirmation state for a payment
// proof, derived from the proof status. ACCEPTED means the image was
// accepted but the payment is NOT settled — settlement is the agency's
// bank confirmation, and there is deliberately no admin bank-confirm
// action (founder decision D3: only the agency sees its bank account).
export const getAdminProofBankConfirmationMeta = (status?: VerificationStatusType | null, t?: Translate) => {
  if (status === VerificationStatus.Accepted) {
    return {
      state: 'AWAITING_BANK_CONFIRMATION' as const,
      label: t ? t('dashboard.status.proofAwaitingBankConfirmation') : 'Awaiting agency bank confirmation',
      className: 'bg-warning/15 text-warning',
    };
  }

  if (status === VerificationStatus.Verified) {
    return {
      state: 'BANK_CONFIRMED' as const,
      label: t ? t('dashboard.status.proofBankConfirmed') : 'Bank confirmation recorded',
      className: 'bg-success/15 text-success',
    };
  }

  return null;
};

// #371: licence status derivation mirrors the API — prefer the
// server-provided effective status; fall back to deriving expiry locally.
export const getEffectiveLicenceStatus = (agency: {
  travelLicenceStatus?: string | null;
  effectiveLicenceStatus?: string | null;
  licenceExpiry?: string | null;
}): LicenceStatusType => {
  if (agency.effectiveLicenceStatus) {
    return agency.effectiveLicenceStatus as LicenceStatusType;
  }
  const status = (agency.travelLicenceStatus || LicenceStatus.NotSubmitted) as LicenceStatusType;
  if (status === LicenceStatus.Verified && agency.licenceExpiry && new Date(agency.licenceExpiry).getTime() <= Date.now()) {
    return LicenceStatus.Expired;
  }
  return status;
};

export const getAdminLicenceBadgeClass = (status?: LicenceStatusType) => {
  if (status === LicenceStatus.Verified) {
    return 'bg-success/15 text-success';
  }

  if (status === LicenceStatus.Rejected || status === LicenceStatus.Expired) {
    return 'bg-danger/15 text-danger';
  }

  if (status === LicenceStatus.PendingReview) {
    return 'bg-warning/15 text-warning';
  }

  return 'bg-muted text-muted-foreground';
};

export const getAdminLicenceBadgeLabel = (status?: LicenceStatusType, t?: Translate) => {
  return statusLabel(status, LICENCE_STATUS_KEYS, t ? t('dashboard.status.licenceNotSubmitted') : 'Not submitted', t);
};

// #415: insurance status derivation mirrors the licence one exactly —
// prefer the server-provided effective status; fall back to deriving
// expiry locally.
export const getEffectiveInsuranceStatus = (agency: {
  insuranceStatus?: string | null;
  effectiveInsuranceStatus?: string | null;
  insuranceExpiry?: string | null;
}): LicenceStatusType => {
  if (agency.effectiveInsuranceStatus) {
    return agency.effectiveInsuranceStatus as LicenceStatusType;
  }
  const status = (agency.insuranceStatus || LicenceStatus.NotSubmitted) as LicenceStatusType;
  if (status === LicenceStatus.Verified && agency.insuranceExpiry && new Date(agency.insuranceExpiry).getTime() <= Date.now()) {
    return LicenceStatus.Expired;
  }
  return status;
};

export const getAdminInsuranceBadgeClass = (status?: LicenceStatusType) => getAdminLicenceBadgeClass(status);

export const getAdminInsuranceBadgeLabel = (status?: LicenceStatusType, t?: Translate) => {
  return statusLabel(status, INSURANCE_STATUS_KEYS, t ? t('dashboard.status.insuranceNotSubmitted') : 'Not submitted', t);
};

// #421: bank-details badge — verified destination is the only state a
// traveller may ever see, so it is the only green one.
export const getAdminBankDetailsBadgeClass = (status?: string | null) => {
  if (status === 'VERIFIED') {
    return 'bg-success/15 text-success';
  }

  if (status === 'REJECTED') {
    return 'bg-danger/15 text-danger';
  }

  if (status === 'PENDING_REVIEW') {
    return 'bg-warning/15 text-warning';
  }

  return 'bg-muted text-muted-foreground';
};

export const getAdminBankDetailsBadgeLabel = (status?: string | null, t?: Translate) => {
  return statusLabel(status ?? undefined, BANK_DETAILS_STATUS_KEYS, t ? t('dashboard.status.bankUnverified') : 'Unverified', t);
};

export const getAdminSubscriptionBadgeLabel = (status?: string | null, t?: Translate) => {
  return statusLabel(status ?? undefined, SUBSCRIPTION_STATUS_KEYS, t ? t('dashboard.status.subscriptionTrial') : 'Trial', t);
};

const titleCase = (value: string) =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

export const getAdminBookingBadgeLabel = (status: BookingStatusType, t?: Translate) => {
  const key = BOOKING_STATUS_KEYS[status];
  if (key) {
    if (t) {
      return t(key);
    }
    // Without a translator the pending-validation status reads as a human label,
    // mirroring the historical display contract.
    return status === BookingStatus.AwaitingValidation ? titleCase(status) : status;
  }
  return status.replace('_', ' ');
};

export const getAdminBookingPaymentBadgeLabel = (status: BookingPaymentStatusType, t?: Translate) => {
  const key = BOOKING_PAYMENT_STATUS_KEYS[status];
  if (key) {
    return t ? t(key) : status;
  }
  return status;
};

export const getAdminPayoutBadgeMeta = (status: PayoutStatusType, t?: Translate) => {
  if (status === PayoutStatus.Paid) {
    return {
      className: 'bg-success/15 text-success',
      helperText: t ? t('dashboard.status.payoutPaidHelper') : 'Transfer completed',
      label: t ? t('dashboard.status.payoutPaidLabel') : 'Paid',
    };
  }

  if (status === PayoutStatus.Rejected) {
    return {
      className: 'bg-danger/15 text-danger',
      helperText: t ? t('dashboard.status.payoutRejectedHelper') : 'Funds returned to the agency',
      label: t ? t('dashboard.status.payoutRejectedLabel') : 'Rejected',
    };
  }

  if (status === PayoutStatus.Approved) {
    return {
      className: 'bg-secondary text-secondary-foreground',
      helperText: t ? t('dashboard.status.payoutApprovedHelper') : 'Approved and waiting for processing',
      label: t ? t('dashboard.status.payoutApprovedLabel') : 'Approved',
    };
  }

  return {
    className: 'bg-warning/15 text-warning',
    helperText: t ? t('dashboard.status.payoutPendingHelper') : 'Pending admin review',
    label: t ? t('dashboard.status.payoutPendingLabel') : 'Pending',
  };
};

export const isRejectedPayout = (status: PayoutStatusType) => status === PayoutStatus.Rejected;

// #423: human-readable labels for the admin intervention audit actions,
// so the audit trail reads as operations, not constants. Unknown actions
// keep their raw value.
const AUDIT_ACTION_KEYS: Record<string, string> = {
  ADMIN_GROUP_FORCE_CONFIRMED: 'dashboard.auditActions.ADMIN_GROUP_FORCE_CONFIRMED',
  ADMIN_GROUP_CLOSED: 'dashboard.auditActions.ADMIN_GROUP_CLOSED',
  ADMIN_DEADLINE_EXTENDED: 'dashboard.auditActions.ADMIN_DEADLINE_EXTENDED',
  ADMIN_BOOKING_REPAIRED: 'dashboard.auditActions.ADMIN_BOOKING_REPAIRED',
  ADMIN_REFUND_REPAIRED: 'dashboard.auditActions.ADMIN_REFUND_REPAIRED',
  // #418: admin identity-hardening events (sign-ins, MFA, break-glass).
  ADMIN_LOGIN_SUCCEEDED: 'dashboard.auditActions.ADMIN_LOGIN_SUCCEEDED',
  ADMIN_LOGIN_FAILED: 'dashboard.auditActions.ADMIN_LOGIN_FAILED',
  ADMIN_MFA_ENROLLED: 'dashboard.auditActions.ADMIN_MFA_ENROLLED',
  ADMIN_MFA_RECOVERY_USED: 'dashboard.auditActions.ADMIN_MFA_RECOVERY_USED',
  ADMIN_BREAK_GLASS_CREATED: 'dashboard.auditActions.ADMIN_BREAK_GLASS_CREATED',
  ADMIN_BREAK_GLASS_USED: 'dashboard.auditActions.ADMIN_BREAK_GLASS_USED',
  ADMIN_BREAK_GLASS_REVOKED: 'dashboard.auditActions.ADMIN_BREAK_GLASS_REVOKED',
  ADMIN_BREAK_GLASS_FAILED: 'dashboard.auditActions.ADMIN_BREAK_GLASS_FAILED',
};

export const getAdminAuditActionLabel = (action: string, t?: Translate) => {
  const key = AUDIT_ACTION_KEYS[action];
  if (key && t) {
    return t(key);
  }
  return action;
};