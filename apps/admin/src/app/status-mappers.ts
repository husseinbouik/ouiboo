import {
  BookingPaymentStatus,
  BookingStatus,
  PayoutStatus,
  SubscriptionStatus,
  VerificationStatus,
  type BookingPaymentStatusType,
  type BookingStatusType,
  type PayoutStatusType,
  type VerificationStatusType,
} from '@ouiboo/types';

type Translate = (key: string) => string;

const VERIFICATION_STATUS_KEYS: Record<string, string> = {
  [VerificationStatus.Pending]: 'dashboard.status.verificationPending',
  [VerificationStatus.Verified]: 'dashboard.status.verificationVerified',
  [VerificationStatus.Rejected]: 'dashboard.status.verificationRejected',
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
      helperText: t ? t('dashboard.status.payoutRejectedHelper') : 'Funds returned to the agency wallet',
      label: t ? t('dashboard.status.payoutRejectedLabel') : 'Rejected',
    };
  }

  if (status === PayoutStatus.Approved) {
    return {
      className: 'bg-secondary text-secondary-foreground',
      helperText: t ? t('dashboard.status.payoutApprovedHelper') : 'Approved and waiting for payout processing',
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