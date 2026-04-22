import {
  BookingPaymentStatus,
  BookingStatus,
  VerificationStatus,
  type BookingPaymentStatusType,
  type BookingStatusType,
  type VerificationStatusType,
} from '@ouiboo/types';

export const getAgencyBookingStatusMeta = (status: BookingStatusType) => {
  if (status === BookingStatus.Confirmed) {
    return {
      className: 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-400/20',
      icon: 'confirmed',
    };
  }

  if (status === BookingStatus.AwaitingValidation) {
    return {
      className: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-400/20',
      icon: 'awaiting',
    };
  }

  if (status === BookingStatus.Pending) {
    return {
      className: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-400/20',
      icon: 'pending',
    };
  }

  return {
    className: 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
    icon: 'default',
  };
};

export const getAgencyProofStatusLabel = (status?: VerificationStatusType | null) => {
  if (!status) {
    return {
      label: 'Not uploaded',
      className: 'bg-slate-100 text-slate-600 ring-slate-200/70 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700/70',
      icon: 'missing',
      displayLabel: 'Not Uploaded',
    };
  }

  if (status === VerificationStatus.Verified) {
    return {
      label: 'Verified',
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-400/20',
      icon: 'verified',
      displayLabel: 'Verified',
    };
  }

  if (status === VerificationStatus.Rejected) {
    return {
      label: 'Rejected',
      className: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-400/20',
      icon: 'rejected',
      displayLabel: 'Rejected',
    };
  }

  return {
    label: 'Pending',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-400/20',
    icon: 'pending',
    displayLabel: 'Awaiting Review',
  };
};

export const getAgencyPaymentStatusMeta = (status: BookingPaymentStatusType) => {
  if (status === BookingPaymentStatus.Paid) {
    return {
      label: 'Paid',
      className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-400/20',
    };
  }

  if (status === BookingPaymentStatus.Failed) {
    return {
      label: 'Payment Failed',
      className: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-400/20',
    };
  }

  if (status === BookingPaymentStatus.Refunded) {
    return {
      label: 'Refunded',
      className: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-400/20',
    };
  }

  return {
    label: 'Unpaid',
    className: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-400/20',
  };
};
