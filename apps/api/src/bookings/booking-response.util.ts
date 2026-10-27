import {
  type BookingDetails,
  type BookingPaymentPlan,
  type BookingPaymentPlanStatusType,
  type BookingPaymentStatusType,
  type BookingAttendanceType,
  type BookingStatusType,
  type PaymentMethodType,
  type RefundStatusType,
  type SessionGroupStatusType,
  type SessionStatusType,
  type VerificationStatusType,
} from '@ouiboo/types';
import { type Prisma } from '@ouiboo/database';
import { type MoneyInput, toMoneyString } from '../common/money.util';
import { buildCancellationScaleSnapshot } from '../cancellation/cancellation.util';

/**
 * #422 (Council P0-20): the only ExternalPayment fields booking/payment
 * responses expose — the bank-confirmation facts rendered read-only by
 * the admin Payment Proofs tab. Include a booking's `externalPayments`
 * with this select wherever mapBookingDetails shapes a response.
 */
export const BANK_CONFIRMATION_EXTERNAL_PAYMENT_SELECT = {
  stage: true,
  confirmedAmount: true,
  bankReference: true,
  bankConfirmedAt: true,
  bankConfirmedBy: true,
  updatedAt: true,
} satisfies Prisma.ExternalPaymentSelect;

type NullableDate = Date | string | null | undefined;

/**
 * #422 (Council P0-20): the bank-confirmation facts recorded on a stage's
 * ExternalPayment when the agency confirms the credit in its own bank
 * account. This is the exact shape the admin Payment Proofs tab renders
 * read-only (`AdminPaymentProof.bankConfirmation`); every field is null
 * until a confirmation exists.
 */
export type BankConfirmationDetails = {
  confirmedAmount: string | null;
  bankReference: string | null;
  bankConfirmedAt: string | null;
  bankConfirmedBy: string | null;
};

type BookingExternalPaymentInput = {
  stage?: string | null;
  confirmedAmount?: MoneyInput | null;
  bankReference?: string | null;
  bankConfirmedAt?: NullableDate;
  bankConfirmedBy?: string | null;
  updatedAt?: NullableDate;
};

type BookingMapperInput = {
  id: string;
  sessionId: string;
  travelerId: string;
  bookingDate: Date | string;
  status: string;
  totalAmount: MoneyInput;
  currency?: string;
  guestsCount: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentProofUrl?: string | null;
  paymentProofId?: string | null;
  refundAmount?: MoneyInput | null;
  refundStatus?: string | null;
  /** #417: cancellation scale snapshot stored on the booking (Json). */
  cancellationScale?: unknown;
  /** #481: booking-terms version accepted at checkout (null if unrecorded). */
  /** #434: attendance recorded by the agency (null until recorded). */
  attendance?: string | null;
  attendanceRecordedAt?: NullableDate;
  attendanceRecordedBy?: string | null;
  termsVersion?: string | null;
  /** #481: server timestamp of the terms acceptance (null if unrecorded). */
  termsAcceptedAt?: NullableDate;
  /** #424 + B9: checkout locale recorded at booking creation (null if unrecorded). */
  locale?: string | null;
  confirmedAt?: NullableDate;
  cancelledAt?: NullableDate;
  paymentGatewayTransactionId?: string | null;
  paymentGatewayMetadata?: unknown;
  fullName?: string | null;
  phoneNumber?: string | null;
  paymentProof?: {
    id: string;
    bookingId: string;
    imageUrl: string;
    uploadedAt: Date | string;
    status: string;
    rejectionReason?: string | null;
  } | null;
  /**
   * #422: the booking's per-stage ExternalPayment records. Only the
   * bank-confirmation fields are read, to expose them on the mapped
   * payment proof; callers that never include the relation simply get
   * `bankConfirmation: null`.
   */
  externalPayments?: BookingExternalPaymentInput[] | null;
  /** #369: staged payment plan snapshot; null for non-staged bookings. */
  paymentPlan?: {
    id: string;
    status: string;
    totalAmount: MoneyInput;
    depositAmount: MoneyInput;
    balanceAmount: MoneyInput;
    currency: string;
    minimumParticipants: number;
    confirmationDeadline: Date | string;
    balanceDueAt?: NullableDate;
    groupConfirmedAt?: NullableDate;
    paymentPolicyVersion: string;
    refundPolicyVersion: string;
  } | null;
  review?: {
    id: string;
  } | null;
  traveler: {
    email: string;
    name?: string | null;
  };
  session: {
    id: string;
    templateId: string;
    startDate: Date | string;
    endDate: Date | string;
    price: MoneyInput;
    deposit: MoneyInput;
    totalSeats: number;
    availableSeats: number;
    status: string;
    currency?: string;
    /** #369: staged-payment session configuration. */
    minBookings?: number;
    confirmationDeadline?: NullableDate;
    groupStatus?: string;
    template: {
      agencyId?: string;
      id: string;
      title: string;
      startLocation: string;
      /** #417: stored cancellation bands (Json); legacy-snapshot fallback. */
      cancellationPolicy?: unknown;
      images: string[];
      /** #332: alt text per image (index-aligned); absent on pre-migration rows. */
      imageAlts?: string[];
      agency?: {
        id: string;
        companyName: string;
        /** #419: trip emergency contact (departure pack); optional so
         * callers that never load it simply omit it. */
        emergencyContactName?: string | null;
        emergencyContactPhone?: string | null;
      } | null;
    };
  };
};

const toIsoString = (value: NullableDate) => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

const timeOf = (value: NullableDate) => {
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

/**
 * #369 plan status → the ExternalPayment stage that status settles(d).
 * DEPOSIT_PAID/REFUND_DUE still point at the deposit (the last settled
 * stage); FULLY_PAID points at the balance. Terminal plan states not
 * listed here fall back to the latest confirmation on any stage.
 */
const STAGE_FOR_PLAN_STATUS: Record<string, string> = {
  DEPOSIT_DUE: 'DEPOSIT',
  DEPOSIT_PAID: 'DEPOSIT',
  REFUND_DUE: 'DEPOSIT',
  BALANCE_DUE: 'BALANCE',
  FULLY_PAID: 'BALANCE',
};

/**
 * #422 (Council P0-20): resolve the bank confirmation to display for a
 * booking's payment proof. Prefers the stage the booking's plan is
 * currently on (FULL for non-staged bookings); otherwise the latest
 * recorded confirmation across stages. Returns null when no stage has a
 * bank confirmation yet — accepting a proof image alone never produces
 * one, because ExternalPaymentsService only stamps these fields at
 * agency bank confirmation.
 */
export const resolveBankConfirmation = (
  booking: Pick<BookingMapperInput, 'externalPayments' | 'paymentPlan'>,
): BankConfirmationDetails | null => {
  const confirmed = (booking.externalPayments ?? []).filter(
    (payment) => payment && payment.bankConfirmedAt,
  );
  if (!confirmed.length) {
    return null;
  }

  const targetStage = booking.paymentPlan
    ? STAGE_FOR_PLAN_STATUS[booking.paymentPlan.status]
    : 'FULL';
  const payment =
    (targetStage ? confirmed.find((entry) => entry.stage === targetStage) : undefined) ??
    confirmed
      .slice()
      .sort(
        (a, b) =>
          timeOf(b.bankConfirmedAt) - timeOf(a.bankConfirmedAt) ||
          timeOf(b.updatedAt) - timeOf(a.updatedAt),
      )[0];

  return {
    confirmedAmount: toMoneyString(payment.confirmedAmount) ?? null,
    bankReference: payment.bankReference ?? null,
    bankConfirmedAt: toIsoString(payment.bankConfirmedAt) ?? null,
    bankConfirmedBy: payment.bankConfirmedBy ?? null,
  };
};

export const mapBookingDetails = (booking: BookingMapperInput): BookingDetails => ({
  id: booking.id,
  sessionId: booking.sessionId,
  travelerId: booking.travelerId,
  bookingDate: toIsoString(booking.bookingDate) || new Date(0).toISOString(),
  status: booking.status as BookingStatusType,
  totalAmount: toMoneyString(booking.totalAmount) || '0.00',
  currency: booking.currency || 'MAD',
  guestsCount: booking.guestsCount,
  paymentMethod: booking.paymentMethod as PaymentMethodType,
  paymentStatus: booking.paymentStatus as BookingPaymentStatusType,
  paymentProofUrl: booking.paymentProofUrl || undefined,
  paymentProofId: booking.paymentProofId || undefined,
  refundAmount: toMoneyString(booking.refundAmount),
  refundStatus: (booking.refundStatus as RefundStatusType | null | undefined) ?? undefined,
  // #417: the cancellation scale snapshotted at booking creation. For
  // legacy bookings without a snapshot, resolve the effective scale
  // from the template's current policy so the confirmation surface can
  // always repeat a scale.
  cancellationScale: buildCancellationScaleSnapshot(
    booking.cancellationScale ?? booking.session?.template?.cancellationPolicy,
  ),
  // #481 + B9: the terms version this booking was made under + the
  // server acceptance timestamp + the checkout locale — the full
  // acceptance record. Null (never omitted) when not recorded, so
  // consumers can distinguish "unrecorded" from a missing field.
  // #434: the attendance record (all null until the agency records it).
  attendance: (booking.attendance as BookingAttendanceType | null | undefined) ?? null,
  attendanceRecordedAt: toIsoString(booking.attendanceRecordedAt) ?? null,
  attendanceRecordedBy: booking.attendanceRecordedBy ?? null,
  termsVersion: booking.termsVersion ?? null,
  termsAcceptedAt: toIsoString(booking.termsAcceptedAt) ?? null,
  locale: booking.locale ?? null,
  cancelledAt: toIsoString(booking.cancelledAt),
  confirmedAt: toIsoString(booking.confirmedAt),
  paymentGatewayTransactionId: booking.paymentGatewayTransactionId || undefined,
  paymentGatewayMetadata:
    booking.paymentGatewayMetadata &&
    typeof booking.paymentGatewayMetadata === 'object' &&
    !Array.isArray(booking.paymentGatewayMetadata)
      ? (booking.paymentGatewayMetadata as Record<string, unknown>)
      : undefined,
  fullName: booking.fullName || undefined,
  phoneNumber: booking.phoneNumber || undefined,
  paymentProof: booking.paymentProof
    ? {
        id: booking.paymentProof.id,
        bookingId: booking.paymentProof.bookingId,
        imageUrl: booking.paymentProof.imageUrl,
        uploadedAt: toIsoString(booking.paymentProof.uploadedAt) || new Date(0).toISOString(),
        status: booking.paymentProof.status as VerificationStatusType,
        rejectionReason: booking.paymentProof.rejectionReason || undefined,
        // #422: read-only bank-confirmation state of the stage's
        // ExternalPayment (null until the agency confirms the bank
        // credit). The admin UI renders this via its AdminPaymentProof
        // contract; there is no admin action behind it.
        bankConfirmation: resolveBankConfirmation(booking),
      }
    : undefined,
  paymentPlan: (booking.paymentPlan
    ? {
        id: booking.paymentPlan.id,
        bookingId: booking.id,
        sessionId: booking.sessionId,
        agencyId: booking.session.template.agencyId || booking.session.template.agency?.id || '',
        status: booking.paymentPlan.status as BookingPaymentPlanStatusType,
        totalAmount: toMoneyString(booking.paymentPlan.totalAmount) || '0.00',
        depositAmount: toMoneyString(booking.paymentPlan.depositAmount) || '0.00',
        balanceAmount: toMoneyString(booking.paymentPlan.balanceAmount) || '0.00',
        currency: booking.paymentPlan.currency || 'MAD',
        minimumParticipants: booking.paymentPlan.minimumParticipants,
        confirmationDeadline:
          toIsoString(booking.paymentPlan.confirmationDeadline) || new Date(0).toISOString(),
        balanceDueAt: toIsoString(booking.paymentPlan.balanceDueAt),
        groupConfirmedAt: toIsoString(booking.paymentPlan.groupConfirmedAt),
        paymentPolicyVersion: booking.paymentPlan.paymentPolicyVersion,
        refundPolicyVersion: booking.paymentPlan.refundPolicyVersion,
      }
    : null) as BookingPaymentPlan | null,
  review: booking.review
    ? {
        id: booking.review.id,
      }
    : undefined,
  traveler: {
    email: booking.traveler.email,
    name: booking.traveler.name,
  },
  session: {
    id: booking.session.id,
    templateId: booking.session.templateId,
    startDate: toIsoString(booking.session.startDate) || new Date(0).toISOString(),
    endDate: toIsoString(booking.session.endDate) || new Date(0).toISOString(),
    price: toMoneyString(booking.session.price) || '0.00',
    deposit: toMoneyString(booking.session.deposit) || '0.00',
    totalSeats: booking.session.totalSeats,
    availableSeats: booking.session.availableSeats,
    status: booking.session.status as SessionStatusType,
    currency: booking.session.currency || 'MAD',
    minBookings: booking.session.minBookings,
    confirmationDeadline: toIsoString(booking.session.confirmationDeadline),
    groupStatus: booking.session.groupStatus as SessionGroupStatusType | undefined,
    template: {
      id: booking.session.template.id,
      title: booking.session.template.title,
      startLocation: booking.session.template.startLocation,
      images: booking.session.template.images,
      imageAlts: booking.session.template.imageAlts,
      agency: {
        id: booking.session.template.agency?.id || booking.session.template.agencyId || '',
        companyName: booking.session.template.agency?.companyName || '',
        // #419: expose the emergency contact on booking responses only —
        // the audience is the traveller holding this booking (departure
        // pack), never public trip pages (which use a different mapper).
        ...(booking.session.template.agency?.emergencyContactPhone
          ? {
              emergencyContactPhone: booking.session.template.agency.emergencyContactPhone,
              ...(booking.session.template.agency.emergencyContactName
                ? { emergencyContactName: booking.session.template.agency.emergencyContactName }
                : {}),
            }
          : {}),
      },
      agencyId: booking.session.template.agencyId || booking.session.template.agency?.id || '',
    },
  },
});
