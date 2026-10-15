import type {
  BookingDetails,
  PayoutDetails,
  TripStatusType,
  VerificationStatusType,
} from '@ouiboo/types';

export type AdminTab = 'PENDING' | 'AGENCIES' | 'BOOKINGS' | 'PAYMENT_PROOFS' | 'PAYOUTS' | 'AUDIT';

export type ApiErrorResponse = {
  message?: string;
};

export type AdminUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  createdAt?: string;
};

export type AdminAgency = {
  id: string;
  companyName: string;
  ice?: string | null;
  logo?: string | null;
  verificationStatus?: VerificationStatusType;
  subscriptionStatus?: string | null;
  address?: string | null;
  profile?: {
    address?: string | null;
  } | null;
  user?: AdminUser | null;
};

export type AdminTrip = {
  id: string;
  title: string;
  status?: TripStatusType;
  images?: string[];
  agency: {
    companyName: string;
  };
};

export type AdminBooking = BookingDetails;

export type AdminPaymentProof = {
  id: string;
  bookingId?: string;
  amount?: number;
  downloadUrl?: string;
  uploadedAt?: string | null;
  booking?: AdminBooking | null;
};

export type AdminPayoutRequest = PayoutDetails;

export type BankDetailsMap = Record<string, unknown>;

export type AdminAuditLog = {
  id: string;
  createdAt: string;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AdminOverviewCounts = {
  pendingAgencies: number;
  pendingTrips: number;
  agencies: number;
  bookings: number;
  bookingsToday: number;
  pendingPaymentProofs: number;
  pendingPayouts: number;
  auditLogs: number;
};

export type FeedbackState = {
  type: 'success' | 'error';
  message: string;
};

export type PendingConfirmation =
  | { kind: 'prune-audits'; days: number }
  | { kind: 'refund-booking'; booking: AdminBooking };
