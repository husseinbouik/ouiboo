import {
  type BookingDetails,
  type BookingPaymentPlan,
  type BookingPaymentPlanStatusType,
  type BookingPaymentStatusType,
  type BookingStatusType,
  type PaymentMethodType,
  type RefundStatusType,
  type SessionGroupStatusType,
  type SessionStatusType,
  type VerificationStatusType,
} from '@ouiboo/types';
import { type MoneyInput, toMoneyString } from '../common/money.util';

type NullableDate = Date | string | null | undefined;

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
  confirmedAt?: NullableDate;
  cancelledAt?: NullableDate;
  paymentGatewayTransactionId?: string | null;
  paymentGatewayMetadata?: unknown;
  fullName?: string | null;
  phoneNumber?: string | null;
  documentNumber?: string | null;
  paymentProof?: {
    id: string;
    bookingId: string;
    imageUrl: string;
    uploadedAt: Date | string;
    status: string;
    rejectionReason?: string | null;
  } | null;
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
      images: string[];
      /** #332: alt text per image (index-aligned); absent on pre-migration rows. */
      imageAlts?: string[];
      agency?: {
        id: string;
        companyName: string;
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
  documentNumber: booking.documentNumber || undefined,
  paymentProof: booking.paymentProof
    ? {
        id: booking.paymentProof.id,
        bookingId: booking.paymentProof.bookingId,
        imageUrl: booking.paymentProof.imageUrl,
        uploadedAt: toIsoString(booking.paymentProof.uploadedAt) || new Date(0).toISOString(),
        status: booking.paymentProof.status as VerificationStatusType,
        rejectionReason: booking.paymentProof.rejectionReason || undefined,
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
      },
      agencyId: booking.session.template.agencyId || booking.session.template.agency?.id || '',
    },
  },
});
