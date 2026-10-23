export enum UserRole {
    Agency = "AGENCY",
    Traveler = "TRAVELER",
    Admin = "ADMIN",
}

export interface Review {
    id: string;
    rating: number;
    comment?: string | null;
    response?: string | null;
    isVerifiedBooking: boolean;
    createdAt: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

export enum VerificationStatus {
    Pending = "PENDING",
    Verified = "VERIFIED",
    Rejected = "REJECTED",
}

export enum CopyrightReportStatus {
    Open = "OPEN",
    Actioned = "ACTIONED",
    Dismissed = "DISMISSED",
}

export type VerificationStatusType = VerificationStatus;

// Law 11-16 travel-agency licence categories (#371)
export enum TravelLicenceType {
    FullOperator = "ODV",
    SalesOnly = "DV",
}

export type TravelLicenceTypeType = TravelLicenceType;

export enum LicenceStatus {
    NotSubmitted = "NOT_SUBMITTED",
    PendingReview = "PENDING_REVIEW",
    Verified = "VERIFIED",
    Rejected = "REJECTED",
    Expired = "EXPIRED",
}

export type LicenceStatusType = LicenceStatus;

export enum SubscriptionStatus {
    Trial = "TRIAL",
    Active = "ACTIVE",
    Cancelled = "CANCELLED",
    Expired = "EXPIRED",
}

export type SubscriptionStatusType = SubscriptionStatus;

export enum PaymentMethod {
    Manual = "MANUAL",
    Gateway = "GATEWAY",
}

export type PaymentMethodType = PaymentMethod;

export enum PaymentProvider {
    Cmi = "CMI",
    Stripe = "STRIPE",
    CashPlus = "CASHPLUS",
}

export type PaymentProviderType = PaymentProvider;
export type DecimalString = string;

export enum BookingPaymentStatus {
    Unpaid = "UNPAID",
    Paid = "PAID",
    Refunded = "REFUNDED",
    Failed = "FAILED",
    /** #369: staged payments — deposit verified, balance outstanding. */
    PartiallyPaid = "PARTIALLY_PAID",
}

/** #369: session-level minimum-group outcome for staged payments. */
export enum SessionGroupStatus {
    NotRequired = "NOT_REQUIRED",
    PendingMinimum = "PENDING_MINIMUM",
    Confirmed = "CONFIRMED",
    NotConfirmed = "NOT_CONFIRMED",
}

export type SessionGroupStatusType = SessionGroupStatus;

/** #369: lifecycle of a booking's staged payment plan. */
export enum BookingPaymentPlanStatus {
    DepositDue = "DEPOSIT_DUE",
    DepositPaid = "DEPOSIT_PAID",
    BalanceDue = "BALANCE_DUE",
    FullyPaid = "FULLY_PAID",
    RefundDue = "REFUND_DUE",
    Refunded = "REFUNDED",
    Cancelled = "CANCELLED",
}

export type BookingPaymentPlanStatusType = BookingPaymentPlanStatus;

/**
 * #369: a booking's staged payment plan. Amounts are owed to / held by the
 * agency — never a OuiBoo balance. Present only on staged bookings.
 */
export interface BookingPaymentPlan {
    id: string;
    bookingId: string;
    sessionId: string;
    agencyId: string;
    totalAmount: DecimalString;
    depositAmount: DecimalString;
    balanceAmount: DecimalString;
    currency: string;
    minimumParticipants: number;
    confirmationDeadline: string;
    balanceDueAt?: string;
    groupConfirmedAt?: string;
    status: BookingPaymentPlanStatus;
    paymentPolicyVersion: string;
    refundPolicyVersion: string;
}

export type BookingPaymentStatusType = BookingPaymentStatus;

export enum RefundStatus {
    Pending = "PENDING",
    Processed = "PROCESSED",
    Failed = "FAILED",
}

export type RefundStatusType = RefundStatus;

export enum NotificationType {
    PaymentReminder = "PAYMENT_REMINDER",
    TripReminder = "TRIP_REMINDER",
    BookingConfirmation = "BOOKING_CONFIRMATION",
    Cancellation = "CANCELLATION",
    ReviewRequest = "REVIEW_REQUEST",
}

export interface AgencyProfile {
    id: string;
    userId: string;
    companyName: string;
    ice: string; // Identifiant Commun de l'Entreprise
    patente: string;
    rib: string; // Bank Account details
    verificationStatus: VerificationStatus;
    bio?: string;
    logo?: string;
    subscriptionStatus: SubscriptionStatus;
    trialEndsAt?: string;
    subscriptionEndsAt?: string;
    subscriptionTermsVersion?: string;
    subscriptionTermsAcceptedAt?: string;
    // #371: legal identity + Law 11-16 travel licence
    legalName?: string;
    rc?: string;
    taxId?: string;
    legalRepresentative?: string;
    businessAddress?: string;
    travelLicenceType?: TravelLicenceType;
    travelLicenceNumber?: string;
    travelLicenceStatus?: LicenceStatus;
    licenceVerifiedAt?: string;
    licenceExpiry?: string;
    licenceRejectionReason?: string;
}

export enum TripStatus {
    Active = "ACTIVE",
    Draft = "DRAFT",
    Archived = "ARCHIVED",
    Inactive = "INACTIVE",
}

export type TripStatusType = TripStatus;

export enum SessionStatus {
    Open = "OPEN",
    Full = "FULL",
    Cancelled = "CANCELLED",
}

export type SessionStatusType = SessionStatus;

export enum TripCategory {
    Adventure = "ADVENTURE",
    Cultural = "CULTURAL",
    Luxury = "LUXURY",
    Budget = "BUDGET",
    Nature = "NATURE",
}

export interface ItineraryDay {
    id: string;
    templateId: string;
    dayNumber: number;
    title?: string;
    description: string;
    activities: string[];
}

/**
 * TripTemplate represents the "Master" trip definition.
 */
export interface TripTemplate {
    id: string;
    agencyId: string;
    title: string;
    description: string;
    category: TripCategory;
    startLocation: string;
    endLocation?: string;
    durationDays: number;
    durationNights: number;
    inclusions: string[];
    exclusions: string[];
    checklist: string[];
    images: string[];
    /** #332: optional alt text per image, aligned by index with `images`. */
    imageAlts?: string[];
    status: TripStatus;
    currency: string;
    startingPrice?: DecimalString | null;
    itinerary: ItineraryDay[];
    createdAt: string;
}

/**
 * TripSession represents a specific occurrence of a TripTemplate.
 */
export interface TripSession {
    id: string;
    templateId: string;
    startDate: string;
    endDate: string;
    price: DecimalString;
    deposit: DecimalString;
    totalSeats: number;
    availableSeats: number;
    status: SessionStatus;
    currency: string;
    /** #369: minimum group size for staged payments; absent on older payloads. */
    minBookings?: number;
    /** #369: staged payments — deadline for the minimum to be reached. */
    confirmationDeadline?: string;
    /** #369: staged payments — minimum-group outcome for this session. */
    groupStatus?: SessionGroupStatus;
}

export enum BookingStatus {
    Pending = "PENDING",
    AwaitingValidation = "AWAITING_VALIDATION",
    Confirmed = "CONFIRMED",
    Rejected = "REJECTED",
    Cancelled = "CANCELLED",
    Completed = "COMPLETED",
    /** #369: staged payments — deposit verified, waiting for group confirmation. */
    PendingMinimum = "PENDING_MINIMUM",
    /** #369: staged payments — group minimum not reached by the deadline. */
    NotConfirmed = "NOT_CONFIRMED",
}

export type BookingStatusType = BookingStatus;

export interface Booking {
    id: string;
    sessionId: string;
    travelerId: string;
    bookingDate: string;
    status: BookingStatus;
    totalAmount: DecimalString;
    currency: string;
    guestsCount: number;
    paymentMethod: PaymentMethod;
    paymentStatus: BookingPaymentStatus;
    paymentProofUrl?: string;
    paymentProofId?: string;
    cancelledAt?: string;
    refundAmount?: DecimalString;
    refundStatus?: RefundStatus;
    confirmedAt?: string;
    paymentGatewayTransactionId?: string;
    paymentGatewayMetadata?: Record<string, unknown>;
    fullName?: string;
    phoneNumber?: string;
    documentNumber?: string;
}

export interface BookingTravelerSummary {
    email: string;
    name?: string | null;
}

export interface BookingAgencySummary {
    companyName: string;
    id: string;
}

export interface BookingTemplateSummary {
    agency: BookingAgencySummary;
    agencyId: string;
    id: string;
    images: string[];
    /** #332: alt text per image (index-aligned); may be absent. */
    imageAlts?: string[];
    startLocation: string;
    title: string;
}

export interface BookingSessionSummary extends TripSession {
    template: BookingTemplateSummary;
}

export interface BookingDetails extends Booking {
    paymentProof?: PaymentProof;
    /** #369: staged payment plan; absent/null on single-payment bookings. */
    paymentPlan?: BookingPaymentPlan | null;
    review?: {
        id: string;
    };
    session: BookingSessionSummary;
    traveler: BookingTravelerSummary;
}

export interface PaymentProof {
    id: string;
    bookingId: string;
    imageUrl: string;
    uploadedAt: string;
    status: VerificationStatus;
    rejectionReason?: string;
}

export interface Wallet {
    agencyId: string;
    availableBalance: DecimalString; // Cleared money
    pendingBalance: DecimalString;   // Money in Escrow
}

export enum PayoutStatus {
    Pending = "PENDING",
    Approved = "APPROVED",
    Rejected = "REJECTED",
    Paid = "PAID",
}

export type PayoutStatusType = PayoutStatus;

export interface PayoutRequest {
    id: string;
    agencyId: string;
    amount: DecimalString;
    status: PayoutStatus;
    requestedAt: string;
    processedAt?: string;
    bankDetails: string; // Copy of RIB at time of request
}

export interface PayoutAgencySummary {
    companyName: string;
    id: string;
    user?: {
        email?: string | null;
    } | null;
}

export interface PayoutDetails extends PayoutRequest {
    agency: PayoutAgencySummary;
}
