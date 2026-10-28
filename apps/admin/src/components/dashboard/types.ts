import type {
  BookingDetails,
  TripStatusType,
  VerificationStatusType,
} from '@ouiboo/types';

export type AdminTab = 'PENDING' | 'AGENCIES' | 'BOOKINGS' | 'GROUPS' | 'PAYMENT_PROOFS' | 'AUDIT' | 'INVOICES' | 'REFUNDS' | 'SECURITY';

/** #418: admin MFA status from GET /auth/mfa/status. */
export type AdminMfaStatus = {
  mfaEnabled: boolean;
  mfaEnrolledAt: string | null;
  recoveryCodesRemaining: number;
  adminMfaRequired: boolean;
};

/** #418: break-glass credential metadata (secrets are never returned). */
export type AdminBreakGlassCredential = {
  id: string;
  label: string;
  createdById: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  usedByEmail: string | null;
  revokedAt: string | null;
  status: 'ACTIVE' | 'USED' | 'REVOKED' | 'EXPIRED';
};

/** #423: a staged session still waiting for its minimum group. */
export type AdminPendingGroup = {
  sessionId: string;
  tripTitle: string;
  agencyName: string | null;
  startDate: string;
  confirmationDeadline: string | null;
  minBookings: number;
  paidParticipants: number;
  depositPaidBookings: number;
  currency: string;
};

/** #416C: one row of a refund case's completion-evidence trail. */
export type AdminRefundEvidence = {
  id: string;
  tier: string;
  source: string;
  reference: string | null;
  amount: string | null;
  createdAt: string;
};

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
  /** #416: strongest qualifying evidence tier at completion. */
  completionTier?: string | null;
  /** #416B/#416C: risk-based audit queue fields. */
  auditRequired?: boolean;
  auditedAt?: string | null;
  auditedBy?: string | null;
  evidence?: AdminRefundEvidence[];
  originalPaymentId?: string | null;
  externalPaymentReference?: string | null;
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
  // B4: licence issue date + issuing authority (Law 31-08 seller block)
  licenceIssuedAt?: string | null;
  licenceIssuingAuthority?: string | null;
  /**
   * B4: seller-block fields still missing on an effectively VERIFIED
   * licence (server-derived data-completeness list). Absent/empty for
   * complete records and for licences that are not verified.
   */
  sellerBlockMissingFields?: string[];
  licenceRejectionReason?: string | null;
  // #415: licence document (private upload) + Ministry-check stamp
  licenceDocumentKey?: string | null;
  licenceDocumentName?: string | null;
  licenceMinistryCheckedAt?: string | null;
  licenceMinistryCheckedBy?: string | null;
  // #415: RC insurance artefact (same lifecycle as the licence)
  insuranceStatus?: string | null;
  /** Server-derived insurance status (mirrors effectiveLicenceStatus). */
  effectiveInsuranceStatus?: string | null;
  insuranceInsurer?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceInsuredName?: string | null;
  insuranceValidFrom?: string | null;
  insuranceExpiry?: string | null;
  insuranceCoverageLimit?: string | number | null;
  insuranceCertificateKey?: string | null;
  insuranceVerifiedAt?: string | null;
  insuranceRejectionReason?: string | null;
  // #415: expiry-sweep auto-pause marker
  verificationPausedAt?: string | null;
  verificationPauseReason?: string | null;
  // #421: payment-destination verification — the live (traveller-visible)
  // details, the pending replacement awaiting review, and the review state.
  bankDetails?: string | null;
  pendingBankDetails?: string | null;
  bankAccountHolderName?: string | null;
  bankAttestationUrl?: string | null;
  bankDetailsStatus?: string | null;
  bankDetailsVerifiedAt?: string | null;
  bankDetailsVerifiedBy?: string | null;
  bankDetailsRejectionReason?: string | null;
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
  /**
   * #422 (Council P0-20): read-only bank-confirmation state of the stage's
   * ExternalPayment, when the API provides it. Display only — bank
   * confirmation is agency-only; admins never confirm bank receipt.
   */
  bankConfirmation?: {
    confirmedAmount?: string | number | null;
    bankReference?: string | null;
    bankConfirmedAt?: string | null;
    bankConfirmedBy?: string | null;
  } | null;
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
  /** #559: refund urgency counters, when a future API version provides them. */
  refundsOverdue?: number;
  refundsDueWithin48h?: number;
};

/** #559: shape of GET /admin/analytics/beta-metrics (#432 service output). */
export type AdminBetaMetrics = {
  window: { from: string; to: string };
  generatedAt: string;
  searches: { total: number; zeroResult: number; zeroResultRate: number | null };
  bookings: { created: number; byStatus: Record<string, number>; completed: number };
  refunds: {
    opened: number;
    byStatus: Record<string, number>;
    completed: number;
    sla: { initiated: number; initiatedWithin7d: number; percentWithin7d: number | null };
    overdueNow: number;
    proofToBankConfirmationLagHours: { samples: number; median: number | null; average: number | null };
  };
  disputes: { opened: number; per1000Bookings: number | null };
  stuck: { bookingsAwaitingValidationOver48h: number; refundCasesPastDueOver48h: number; total: number };
  duplicates: { duplicateBookings: number; rate: number | null };
  terms: { nullTermsInWindow: number; recordedRate: number | null; nullTermsAllTime: number };
  sweepPauses: { agenciesCurrentlyPaused: number; note: string };
  interventions: { count: number; per100Bookings: number | null };
  support: {
    responseWithin48hPercent: number | null;
    derivable: boolean;
    reason: string;
    /** #446: help-centre ticket counts, when the API provides them. */
    ticketsOpened?: number;
    ticketsByStatus?: Record<string, number>;
    ticketsByCategory?: Record<string, number>;
    ticketsWithFirstResponse?: number;
    firstResponsesWithin48h?: number;
    awaitingFirstResponseOver48h?: number;
  };
  exitCriteria: Array<{ key: string; target: string; value: number | null; pass: boolean | null }>;
};

export type FeedbackState = {
  type: 'success' | 'error';
  message: string;
};

export type PendingConfirmation =
  | { kind: 'prune-audits'; days: number }
  | { kind: 'refund-booking'; booking: AdminBooking };
