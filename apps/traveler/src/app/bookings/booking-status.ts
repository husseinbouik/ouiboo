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
      return 'bg-emerald-500 text-white';
    case BookingStatus.AwaitingValidation:
      return 'bg-blue-500 text-white';
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
    return { label: 'Verified', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
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
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    };
  }

  if (paymentStatus === BookingPaymentStatus.Refunded) {
    return {
      label: refundStatus === RefundStatus.Processed ? 'Refunded' : 'Refund in Progress',
      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
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
