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
    // #369: deposit paid, waiting for the group minimum outcome.
    case BookingStatus.PendingMinimum:
      return 'bg-amber-500 text-white';
    case BookingStatus.Cancelled:
    case BookingStatus.Rejected:
    // #369: the trip was not confirmed (minimum not reached).
    case BookingStatus.NotConfirmed:
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

  // #422 (Council P0-20): in the manual bank-transfer flow a proof only
  // reaches VERIFIED once the agency has confirmed the credit in its bank
  // account (or a PSP captured it) — so VERIFIED reads as what it now
  // means: the payment itself is confirmed, not just the image.
  if (status === VerificationStatus.Verified) {
    return { label: 'Payment confirmed', className: 'bg-success/10 text-success border-success/20' };
  }

  if (status === VerificationStatus.Rejected) {
    return { label: 'Rejected', className: 'bg-rose-500/10 text-rose-600 border-rose-500/20' };
  }

  // #422: the agency accepted the proof image, but acceptance is NOT
  // settlement — the payment stays unsettled until bank confirmation.
  // This state must never read as paid/confirmed.
  if (status === VerificationStatus.Accepted) {
    return {
      label: 'Accepted — pending bank confirmation',
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    };
  }

  // Uploaded and waiting for the agency to review the image.
  return { label: 'Received — awaiting review', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
};

export const getTravelerPaymentStatusMeta = (
  paymentStatus: BookingPaymentStatusType,
  refundStatus?: RefundStatusType,
) => {
  // #412 (Council Session #2, B15): the badge is derived from
  // paymentStatus AND refundStatus together. A processed refund on a
  // booking that is not fully refunded is a partial refund — it must
  // never present as plain "Paid"/"Deposit paid" (a fully refunded
  // booking carries paymentStatus REFUNDED and is handled below).
  if (
    refundStatus === RefundStatus.Processed &&
    (paymentStatus === BookingPaymentStatus.Paid ||
      paymentStatus === BookingPaymentStatus.PartiallyPaid)
  ) {
    return {
      label: 'Partially refunded',
      className: 'bg-ocean-500/10 text-ocean-600 dark:text-ocean-300 border-blue-500/20',
    };
  }

  // #369: staged booking — deposit verified, balance still outstanding.
  if (paymentStatus === BookingPaymentStatus.PartiallyPaid) {
    return {
      label: 'Deposit paid',
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    };
  }

  // #422: paymentStatus only flips to PAID/PARTIALLY_PAID at bank
  // confirmation (or PSP capture), never on proof upload/acceptance —
  // so these labels are truthful without rewording.
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

/**
 * #416C (Council P0-09): traveller refund receipt actions. Mirrors the
 * API rules in RefundsService: receipt can be confirmed only while the
 * refund is REFUND_INITIATED (sent by the agency, arrival pending) and
 * not yet confirmed; a completed refund can be disputed only within
 * the dispute window after completion (API REFUND_DISPUTE_WINDOW_DAYS
 * = 60). The traveller's confirmation is corroboration only — it never
 * completes the case; completion rests on bank/provider evidence.
 */
export const TRAVELER_REFUND_DISPUTE_WINDOW_DAYS = 60;

type TravelerRefundActionCase = {
  status: string;
  travellerConfirmedAt?: string | null;
  completedAt?: string | null;
  disputedAt?: string | null;
};

export const canConfirmTravelerRefundReceipt = (refundCase: TravelerRefundActionCase) =>
  refundCase.status === 'REFUND_INITIATED' && !refundCase.travellerConfirmedAt;

export const travelerRefundDisputeDeadline = (completedAt?: string | null) => {
  if (!completedAt) return null;
  const completed = new Date(completedAt);
  if (Number.isNaN(completed.getTime())) return null;
  return new Date(completed.getTime() + TRAVELER_REFUND_DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
};

export const canDisputeTravelerRefund = (
  refundCase: TravelerRefundActionCase,
  now: Date = new Date(),
) => {
  if (refundCase.status !== 'REFUND_COMPLETED' || refundCase.disputedAt) {
    return false;
  }
  const deadline = travelerRefundDisputeDeadline(refundCase.completedAt);
  return deadline !== null && now.getTime() <= deadline.getTime();
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

  // #369: deposit paid, waiting for the group minimum outcome.
  if (status === BookingStatus.PendingMinimum) {
    return {
      className: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-400/20',
      icon: 'pending',
    };
  }

  // #369: the trip was not confirmed (minimum not reached).
  if (status === BookingStatus.NotConfirmed) {
    return {
      className: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-400/20',
      icon: 'rejected',
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

  // #422 (Council P0-20): the proof image was accepted, but the payment is
  // NOT settled — settlement requires the agency's bank confirmation.
  // This state must never read as verified/paid.
  if (status === VerificationStatus.Accepted) {
    return {
      label: 'Accepted',
      className: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-400/20',
      icon: 'accepted',
      displayLabel: 'Accepted — Pending Bank Confirmation',
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
  // #369: staged booking — deposit verified, balance still outstanding.
  if (status === BookingPaymentStatus.PartiallyPaid) {
    return {
      label: 'Deposit paid',
      className: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-400/20',
    };
  }

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