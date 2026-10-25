'use client';

import {
  BookingPaymentPlanStatus,
  VerificationStatus,
  type BookingDetails,
  type VerificationStatusType,
} from '@ouiboo/types';

export type ProofFileType = 'image' | 'pdf' | 'unknown';

export const getFileTypeFromUrl = (url: string): ProofFileType => {
  if (!url) return 'unknown';
  const extension = url.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
    return 'image';
  } else if (extension === 'pdf') {
    return 'pdf';
  }
  return 'unknown';
};

/**
 * #422 (Council P0-20): the manual payment review is two steps, not one.
 * - `review`: the proof image is still PENDING — accept or reject it.
 *   Accepting is NOT settlement.
 * - `bank-confirmation`: the proof is ACCEPTED — the payment only settles
 *   once the agency confirms the credit in its bank account.
 * - `final`: the proof is VERIFIED (bank-confirmed) or REJECTED — nothing
 *   left to do.
 * - `none`: no proof uploaded yet.
 */
export type ProofReviewStage = 'review' | 'bank-confirmation' | 'final' | 'none';

export const getProofReviewStage = (
  status?: VerificationStatusType | null,
): ProofReviewStage => {
  switch (status) {
    case VerificationStatus.Pending:
      return 'review';
    case VerificationStatus.Accepted:
      return 'bank-confirmation';
    case VerificationStatus.Verified:
    case VerificationStatus.Rejected:
      return 'final';
    default:
      return 'none';
  }
};

/**
 * #422: the amount the agency must observe in its bank account for the
 * stage currently awaiting confirmation — the deposit while DEPOSIT_DUE,
 * the balance while BALANCE_DUE, otherwise the booking total. The API
 * applies the same rule and blocks a confirmation whose amount differs.
 */
export const getExpectedStageAmount = (booking: BookingDetails): number => {
  const plan = booking.paymentPlan;
  if (plan) {
    if (plan.status === BookingPaymentPlanStatus.DepositDue) {
      return Number(plan.depositAmount);
    }
    if (plan.status === BookingPaymentPlanStatus.BalanceDue) {
      return Number(plan.balanceAmount);
    }
  }
  return Number(booking.totalAmount);
};

/**
 * #422: bank confirmation guard — a bank reference is mandatory (it is the
 * audit anchor binding the confirmed amount to a real bank credit) and the
 * confirmed amount must be a positive number. The confirm action stays
 * disabled until both hold; the API re-checks everything server-side.
 */
export const isBankConfirmationReady = (
  confirmedAmount: string,
  bankReference: string,
): boolean => {
  const amount = Number(confirmedAmount);
  return (
    confirmedAmount.trim() !== '' &&
    Number.isFinite(amount) &&
    amount > 0 &&
    bankReference.trim() !== ''
  );
};

/**
 * #422: the verify-payment / confirm-bank-payment endpoints return the
 * bare booking row (no relations), so the review modal's booking state is
 * refreshed by merging the returned scalars into the loaded booking and
 * applying the proof transition the API just performed (accept →
 * ACCEPTED, bank confirmation → VERIFIED). Relations the modal renders
 * (session, traveler, payment plan) are preserved from the loaded booking;
 * the bookings list itself refetches via query invalidation.
 */
export const applyProofDecision = (
  booking: BookingDetails,
  updated: Partial<BookingDetails>,
  proofStatus: VerificationStatus,
): BookingDetails => ({
  ...booking,
  ...updated,
  session: booking.session,
  traveler: booking.traveler,
  paymentPlan: booking.paymentPlan,
  paymentProof: booking.paymentProof
    ? {
        ...booking.paymentProof,
        status: proofStatus,
        ...(proofStatus === VerificationStatus.Accepted
          ? { rejectionReason: undefined }
          : {}),
      }
    : booking.paymentProof,
});
