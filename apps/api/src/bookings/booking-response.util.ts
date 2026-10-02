import {
  type BookingDetails,
  type BookingPaymentStatusType,
  type BookingStatusType,
  type PaymentMethodType,
  type RefundStatusType,
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
    template: {
      agencyId?: string;
      id: string;
      title: string;
      startLocation: string;
      images: string[];
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
    template: {
      id: booking.session.template.id,
      title: booking.session.template.title,
      startLocation: booking.session.template.startLocation,
      images: booking.session.template.images,
      agency: {
        id: booking.session.template.agency?.id || booking.session.template.agencyId || '',
        companyName: booking.session.template.agency?.companyName || '',
      },
      agencyId: booking.session.template.agencyId || booking.session.template.agency?.id || '',
    },
  },
});
