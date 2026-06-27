export enum UserRole {
    Agency = "AGENCY",
    Traveler = "TRAVELER",
    Admin = "ADMIN",
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

export type VerificationStatusType = VerificationStatus;

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
}

export enum TripStatus {
    Active = "ACTIVE",
    Draft = "DRAFT",
    Archived = "ARCHIVED",
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
    durationDays: number;
    durationNights: number;
    inclusions: string[];
    exclusions: string[];
    checklist: string[];
    images: string[];
    status: TripStatus;
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
}

export enum BookingStatus {
    Pending = "PENDING",
    AwaitingValidation = "AWAITING_VALIDATION",
    Confirmed = "CONFIRMED",
    Rejected = "REJECTED",
    Cancelled = "CANCELLED",
    Completed = "COMPLETED",
}

export type BookingStatusType = BookingStatus;

export interface Booking {
    id: string;
    sessionId: string;
    travelerId: string;
    bookingDate: string;
    status: BookingStatus;
    totalAmount: DecimalString;
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
    startLocation: string;
    title: string;
}

export interface BookingSessionSummary extends TripSession {
    template: BookingTemplateSummary;
}

export interface BookingDetails extends Booking {
    paymentProof?: PaymentProof;
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
