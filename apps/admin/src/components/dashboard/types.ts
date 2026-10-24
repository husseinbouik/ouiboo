import type {
  BookingDetails,
  TripStatusType,
  VerificationStatusType,
} from '@ouiboo/types';

export type AdminTab = 'PENDING' | 'AGENCIES' | 'BOOKINGS' | 'PAYMENT_PROOFS' | 'AUDIT' | 'INVOICES' | 'REFUNDS';

export type AdminRefundCase = {
  id: string;
  bookingId: string;
  travelerId: string;
  agencyId: string;
  status: string;
  reason: string;
  requestedAmount: string;
  approvedAmount: string | null;
  currency: string;
  requestedAt: string;
  refundDueAt: string | null;
  initiatedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
  agency?: { id: string; companyName: string } | null;
  traveler?: { id: string; name: string | null; email: string } | null;
  booking?: {
    id: string;
    session?: { template?: { title?: string | null } | null } | null;
  } | null;
};

export type AdminInvoiceLineItem = {
  id: string;
  bookingId: string;
  description: string;
  bookingDate: string;
  grossAmount: string;
  commissionRate: string;
  commissionAmount: string;
};

export type AdminInvoice = {
  id: string;
  number: string;
  agencyId: string;
  agencyName: string;
  agencyIce: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  commissionRate: string;
  subtotalAmount: string;
  totalAmount: string;
  status: string;
  issuedAt: string;
  lineItems?: AdminInvoiceLineItem[];
};

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
  // #371: legal identity + Law 11-16 travel licence
  legalName?: string | null;
  rc?: string | null;
  taxId?: string | null;
  legalRepresentative?: string | null;
  businessAddress?: string | null;
  travelLicenceType?: string | null;
  travelLicenceNumber?: string | null;
  travelLicenceStatus?: string | null;
  /** Server-derived licence status (VERIFIED + past expiry reads EXPIRED). */
  effectiveLicenceStatus?: string | null;
  licenceVerifiedAt?: string | null;
  licenceExpiry?: string | null;
  licenceRejectionReason?: string | null;
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
  auditLogs: number;
};

export type FeedbackState = {
  type: 'success' | 'error';
  message: string;
};

export type PendingConfirmation =
  | { kind: 'prune-audits'; days: number }
  | { kind: 'refund-booking'; booking: AdminBooking };
