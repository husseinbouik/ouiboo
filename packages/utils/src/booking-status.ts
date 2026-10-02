import {
  BookingPaymentStatus,
  BookingStatus,
  PaymentMethod,
  RefundStatus,
  VerificationStatus,
  type BookingPaymentStatusType,
  type BookingStatusType,
  type PaymentMethodType,
  type RefundStatusType,
  type VerificationStatusType,
} from '@ouiboo/types';

export const getTravelerBookingStatusTone = (status: BookingStatusType) => {
  switch (status) {
    case BookingStatus.Confirmed:
      return 'bg-success text-success-foreground';
    case BookingStatus.AwaitingValidation:
      return 'bg-ocean-500 text-white';
    case BookingStatus.Pending:
      return 'bg-amber-500 text-white';
    case BookingStatus.Cancelled:
    case BookingStatus.Rejected:
      return 'bg-rose-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

export const shouldShowUploadAction = (status: BookingStatusType, hasPaymentProof: boolean) =>
  status === BookingStatus.Pending && !hasPaymentProof;

export const canCancelTravelerBooking = (status: BookingStatusType) =>
  status !== BookingStatus.Cancelled && status !== BookingStatus.Completed;

export const getTravelerProofStatus = (status?: VerificationStatusType | null) => {
  if (!status) {
    return { label: 'Not uploaded', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  }

  if (status === VerificationStatus.Verified) {
    return { label: 'Verified', className: 'bg-success/10 text-success border-success/20' };
  }

  if (status === VerificationStatus.Rejected) {
    return { label: 'Rejected', className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
  }

  return { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
};

export const getTravelerPaymentStatusMeta = (
  paymentStatus: BookingPaymentStatusType,
  refundStatus?: RefundStatusType,
) => {
  if (paymentStatus === BookingPaymentStatus.Paid) {
    return {
      label: 'Paid',
      className: 'bg-success/10 text-success border-success/20',
    };
  }

  if (paymentStatus === BookingPaymentStatus.Refunded) {
    return {
      label: refundStatus === RefundStatus.Processed ? 'Refunded' : 'Refund in Progress',
      className: 'bg-ocean-500/10 text-ocean-600 dark:text-ocean-300 border-blue-500/20',
    };
  }

  if (paymentStatus === BookingPaymentStatus.Failed) {
    return {
      label: 'Payment Failed',
      className: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    };
  }

  return {
    label: 'Unpaid',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  };
};

type TravelerRetryBooking = {
  paymentMethod: PaymentMethodType;
  paymentStatus: BookingPaymentStatusType;
  refundStatus?: RefundStatusType;
  status: BookingStatusType;
};

export const canRetryTravelerPayment = (booking: TravelerRetryBooking) => {
  if (booking.paymentMethod !== PaymentMethod.Gateway) {
    return false;
  }

  if (booking.paymentStatus === BookingPaymentStatus.Paid || booking.paymentStatus === BookingPaymentStatus.Refunded) {
    return false;
  }

  if (booking.refundStatus === RefundStatus.Processed) {
    return false;
  }

  return (
    booking.status === BookingStatus.Cancelled ||
    booking.status === BookingStatus.Rejected ||
    booking.paymentStatus === BookingPaymentStatus.Failed
  );
};

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