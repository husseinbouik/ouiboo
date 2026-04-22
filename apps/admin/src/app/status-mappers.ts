import {
  BookingStatus,
  PayoutStatus,
  VerificationStatus,
  type BookingStatusType,
  type PayoutStatusType,
  type VerificationStatusType,
} from '@ouiboo/types';

export const getAdminVerificationBadgeClass = (status?: VerificationStatusType) => {
  if (status === VerificationStatus.Verified) {
    return 'bg-green-100 text-green-700';
  }

  if (status === VerificationStatus.Rejected) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-amber-100 text-amber-700';
};

export const getAdminBookingBadgeLabel = (status: BookingStatusType) => {
  if (status === BookingStatus.AwaitingValidation) {
    return 'Awaiting Validation';
  }

  return status.replace('_', ' ');
};

export const getAdminPayoutBadgeMeta = (status: PayoutStatusType) => {
  if (status === PayoutStatus.Paid) {
    return {
      className: 'bg-emerald-100 text-emerald-700',
      helperText: 'Transfer completed',
      label: 'Paid',
    };
  }

  if (status === PayoutStatus.Rejected) {
    return {
      className: 'bg-rose-100 text-rose-700',
      helperText: 'Funds returned to the agency wallet',
      label: 'Rejected',
    };
  }

  if (status === PayoutStatus.Approved) {
    return {
      className: 'bg-blue-100 text-blue-700',
      helperText: 'Approved and waiting for payout processing',
      label: 'Approved',
    };
  }

  return {
    className: 'bg-amber-100 text-amber-700',
    helperText: 'Pending admin review',
    label: 'Pending',
  };
};

export const isRejectedPayout = (status: PayoutStatusType) => status === PayoutStatus.Rejected;
