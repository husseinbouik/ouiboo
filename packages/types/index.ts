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
    // #422 (Council P0-20): proof image accepted, bank confirmation pending —
    // the payment is not settled in this state.
    Accepted = "ACCEPTED",
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

// #421 (Council P0-19): lifecycle of an agency's bank payment destination.
// Submitted details sit in pending fields until an admin verifies them
// against the bank attestation; only VERIFIED details are traveller-live.
export enum BankDetailsStatus {
    Unverified = "UNVERIFIED",
    PendingReview = "PENDING_REVIEW",
    Verified = "VERIFIED",
    Rejected = "REJECTED",
}

export type BankDetailsStatusType = BankDetailsStatus;

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
    // #421: traveller-live manual payment instructions (verified value)
    bankDetails?: string;
    verificationStatus: VerificationStatus;
    bio?: string;
    logo?: string;
    subscriptionStatus: SubscriptionStatus;
    trialEndsAt?: string;
    subscriptionEndsAt?: string;
    // #419: trip emergency contact shown to booked travellers
    // (departure pack) — first call during an active trip.
    emergencyContactName?: string;
    emergencyContactPhone?: string;
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
    // B4 (Council Session #2): Law 31-08 seller-block licence issue data.
    licenceIssuedAt?: string;
    licenceIssuingAuthority?: string;
    licenceRejectionReason?: string;
    // #415: licence document (private upload key) + Ministry-check stamp
    licenceDocumentKey?: string;
    licenceDocumentName?: string;
    licenceMinistryCheckedAt?: string;
    licenceMinistryCheckedBy?: string;
    // #415: RC insurance artefact (same LicenceStatus lifecycle)
    insuranceStatus?: LicenceStatus;
    insuranceInsurer?: string;
    insurancePolicyNumber?: string;
    insuranceInsuredName?: string;
    insuranceValidFrom?: string;
    insuranceExpiry?: string;
    insuranceCoverageLimit?: DecimalString;
    insuranceCertificateKey?: string;
    insuranceVerifiedAt?: string;
    insuranceRejectionReason?: string;
    // #415: expiry-sweep auto-pause marker
    verificationPausedAt?: string;
    verificationPauseReason?: string;
    // #421: bank-destination verification (submitted details pend in
    // pendingBankDetails until an admin verifies them; bankDetails above
    // stays the traveller-live value)
    pendingBankDetails?: string;
    bankAccountHolderName?: string;
    bankAttestationUrl?: string;
    bankDetailsStatus?: BankDetailsStatus;
    bankDetailsVerifiedAt?: string;
    bankDetailsRejectionReason?: string;
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
 * #417 (Council P0-11): one band of a trip's cancellation scale for
 * traveller-initiated cancellations. Bands are stored as structured data
 * on TripTemplate.cancellationPolicy and resolved by the API; the
 * platform floor (agency fault / minimum group not reached = 100%
 * refund, initiated within 7 days) always applies on top of the bands.
 */
export interface CancellationBand {
    minDaysBeforeStart: number;
    refundPercent: number;
}

export interface CancellationScale {
    version: string;
    bands: CancellationBand[];
}

/** #546: one language's trip title + description in the translations map. */
/** #584: one itinerary day inside a language entry — text keyed to the canonical day by dayNumber. */
export interface TripTranslationDay {
    dayNumber?: number;
    title?: string;
    description?: string;
    /** Free-text activity tags — part of the day's language-keyed content (not enum codes). */
    activities?: string[];
}

export interface TripTranslationEntry {
    title?: string;
    description?: string;
    /** #584 (phase 2): itinerary days in this language, aligned to the canonical days by dayNumber. */
    itinerary?: TripTranslationDay[];
    /** #584 (phase 2): whole-list translations — a non-empty list replaces the canonical one wholesale. */
    inclusions?: string[];
    exclusions?: string[];
    checklist?: string[];
}

/** #546: trip title + description keyed by ISO language code (fr canonical). */
export type TripTranslations = Record<string, TripTranslationEntry>;

/** The resolved scale: bands + the platform floor terms. */
export interface CancellationScaleSnapshot extends CancellationScale {
    floorRefundPercent: number;
    refundInitiationDays: number;
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
    /** #417: agency-set cancellation bands as stored (null = defaults). */
    cancellationPolicy?: CancellationScale | null;
    /** #417: the resolved scale (bands + floor) returned by GET /trips/:id. */
    cancellationScale?: CancellationScaleSnapshot;
    /**
     * #546: multilingual title + description, keyed by ISO language
     * code. `title`/`description` above are the FRENCH text (canonical);
     * public payloads resolve them into the request locale server-side,
     * while this map carries every language the agency provided.
     */
    translations?: TripTranslations | null;
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

/**
 * #481: the current version of the traveller booking terms (the binding
 * checkout / terms-page wording in en/fr/ar). The checkout sends this
 * with every booking creation and the API persists it on the booking
 * with a server acceptance timestamp, so each booking proves which
 * terms it was made under.
 *
 * HYGIENE: bump this constant in the same change whenever binding
 * terms text changes (the checkout i18n namespace, the terms page, or
 * the booking-journey email dictionary) — and note the bump in that
 * PR's description. Never reuse a version for different wording.
 */
export const CURRENT_BOOKING_TERMS_VERSION = '1.0';

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
}

export interface BookingTravelerSummary {
    email: string;
    name?: string | null;
}

export interface BookingAgencySummary {
    companyName: string;
    id: string;
    /**
     * #419: the agency's trip emergency contact, populated on booking
     * responses only (the traveller holding the booking is the audience —
     * the departure pack). Absent when the agency has not provided one.
     */
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    /**
     * B4 (Council Session #2): seller-of-record fields for the
     * Law 31-08 identity block on the durable booking confirmation
     * (booking detail + post-checkout confirmation). Booking responses
     * carry the agency profile; SellerIdentity withholds the licence
     * facts unless the licence is verified, and shows the honest gap
     * for legacy records missing the issue data.
     */
    legalName?: string | null;
    travelLicenceType?: string | null;
    travelLicenceNumber?: string | null;
    travelLicenceStatus?: string | null;
    licenceExpiry?: string | null;
    licenceIssuedAt?: string | null;
    licenceIssuingAuthority?: string | null;
    licenceVerifiedAt?: string | null;
    insuranceStatus?: string | null;
    insuranceVerifiedAt?: string | null;
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
    /** #417: cancellation scale snapshotted at booking creation (resolved from the template for legacy bookings). */
    cancellationScale?: CancellationScaleSnapshot;
    /**
     * #481 + B9 (Council Session #2): the booking-terms version the
     * traveller accepted at checkout (see CURRENT_BOOKING_TERMS_VERSION)
     * and the server timestamp of that acceptance. Required on every new
     * booking since B9; null only on pre-B9 bookings, which admin
     * surfaces label "terms version unrecorded".
     */
    termsVersion?: string | null;
    termsAcceptedAt?: string | null;
    /**
     * #424 + B9: the checkout UI locale the booking was made in —
     * part of the terms-acceptance record (version + locale + server
     * timestamp). Null only on bookings that predate its capture.
     */
    locale?: string | null;
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
    /**
     * #422 (Council P0-20): read-only bank-confirmation facts of the
     * stage's ExternalPayment, stamped only when the agency confirms the
     * credit in its own bank account. Null/absent until then — an
     * accepted proof image alone never carries one.
     */
    bankConfirmation?: {
        confirmedAmount: string | null;
        bankReference: string | null;
        bankConfirmedAt: string | null;
        bankConfirmedBy: string | null;
    } | null;
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
