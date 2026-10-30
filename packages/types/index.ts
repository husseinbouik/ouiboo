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
    /** #700: public seller phone for the checkout seller block. */
    businessPhone?: string;
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

/**
 * #676 (Council S6): language-neutral itinerary facts. Meals and
 * accommodation types are enums (never language maps); distance/drive
 * time are numbers; the accommodation name is a proper noun.
 */
export enum ItineraryMeal {
    Breakfast = "BREAKFAST",
    Lunch = "LUNCH",
    Dinner = "DINNER",
}

export type ItineraryMealType = ItineraryMeal;

export enum AccommodationType {
    Hotel = "HOTEL",
    Riad = "RIAD",
    Guesthouse = "GUESTHOUSE",
    Camp = "CAMP",
    Hostel = "HOSTEL",
    Other = "OTHER",
}

export type AccommodationTypeType = AccommodationType;

/**
 * #701 (Council S6): agency-labelled accommodation tiers (itinerary
 * phase 2), rendered with "or similar" honesty.
 */
export enum AccommodationTier {
    Standard = "STANDARD",
    Comfort = "COMFORT",
    Premium = "PREMIUM",
}

export type AccommodationTierType = AccommodationTier;

/** #694 (Council S6): session kind — shared per-person vs private per-group. */
export enum SessionKind {
    Shared = "SHARED",
    Private = "PRIVATE",
}

export type SessionKindType = SessionKind;

/** #701: one per-stop detail entry on an itinerary day. Name and
 * admission note are language-keyed maps (ISO code -> text). */
export interface ItineraryStop {
    name: Record<string, string>;
    durationMinutes?: number | null;
    admissionIncluded?: boolean | null;
    admissionNote?: Record<string, string> | null;
}

/** #686: one agency-authored FAQ entry — question/answer language-keyed. */
export interface TripFaqEntry {
    question: Record<string, string>;
    answer: Record<string, string>;
}

/** #701: one agency-defined pickup point (proper nouns, not maps). */
export interface PickupPoint {
    id: string;
    name: string;
    address?: string | null;
    mapsUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
}

/**
 * #687: the one-line cancellation summary derived from a trip's
 * structured scale under ONE standardised definition — the free tier
 * is the highest 100%-refund band; `freeCancellation` is true exactly
 * when that band starts at >= 1 day before the trip. The agency is
 * always the refund obligor; Ouiboo never refunds.
 */
export interface CancellationSummary {
    freeCancellation: boolean;
    freeCancellationDays: number | null;
    bestRefundPercent: number;
}

/**
 * #676: the structured meeting point, stored on the trip template
 * alongside startLocation (the departure city/area). Public
 * pre-booking payloads expose the AREA ONLY (see PublicMeetingPoint);
 * the exact address + maps link travel only on booking responses.
 */
export interface MeetingPoint {
    address?: string | null;
    mapsUrl?: string | null;
    pickupAvailable: boolean;
}

/** #676: what pre-booking surfaces may show of a meeting point. */
export interface PublicMeetingPoint {
    area: string | null;
    pickupAvailable: boolean;
}

/**
 * #675 (Council S6): the destination taxonomy AS CONFIGURATION —
 * exactly the 3 beta-cluster destinations. `slug` is the stored /
 * queried value; `aliases` are the free-text startLocation spellings
 * (EN/FR/AR + local variants) the API derivation and the backfill
 * migration match against. Adding a destination later is a config
 * change here plus translations — no schema change.
 */
export interface DestinationConfig {
    slug: string;
    aliases: string[];
}

/**
 * #677 (Council S6): the beta agency offer pack AS CONFIGURATION — the
 * published service promises every recruited agency sees, in one place:
 * the licence+insurance verification SLA (48 working hours from a
 * complete submission), the assisted-listing offer (OuiBoo builds the
 * first listings WITH the agency; the agency approves before publish),
 * and the support-relief split (OuiBoo answers platform/booking
 * questions in FR/AR/EN at the published support hours; the agency
 * answers trip logistics; during an active trip the agency emergency
 * contact is first call and OuiBoo is the escalation). Surfaces render
 * these numbers from here so the promise can never drift per page.
 */
export const BETA_AGENCY_OFFER = {
    verificationSlaWorkingHours: 48,
    supportResponseHours: 48,
    assistedListing: true,
    supportLanguages: ['fr', 'ar', 'en'],
} as const;

export const BETA_DESTINATIONS: readonly DestinationConfig[] = [
    { slug: 'tangier', aliases: ['tangier', 'tanger', 'طنجة'] },
    { slug: 'tetouan', aliases: ['tetouan', 'tétouan', 'tetuan', 'تطوان'] },
    { slug: 'chefchaouen', aliases: ['chefchaouen', 'chaouen', 'شفشاون'] },
] as const;

export interface ItineraryDay {
    id: string;
    templateId: string;
    dayNumber: number;
    title?: string;
    description: string;
    activities: string[];
    /** #676: language-neutral day facts (all optional). */
    distanceKm?: number | null;
    driveTimeMinutes?: number | null;
    mealsIncluded?: ItineraryMeal[];
    accommodationName?: string | null;
    accommodationType?: AccommodationType | null;
    /** #701: phase-2 depth — tier, per-stop detail, free-text notes. */
    accommodationTier?: AccommodationTier | null;
    stops?: ItineraryStop[] | null;
    notes?: Record<string, string> | null;
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

/** #695 (Council S6): agency-priced variant (option tier) on a trip. */
export type PricingUnit = 'PER_PERSON' | 'PER_GROUP' | 'PER_VEHICLE';
export type AddOnPricingUnit = 'PER_PERSON' | 'PER_BOOKING';

export interface TripPricingVariant {
    id: string;
    templateId: string;
    agencyId: string;
    /** Language-keyed name map (ISO code -> label). */
    name: Record<string, string>;
    pricingUnit: PricingUnit;
    unitSize: number;
    price: string;
    currency: string;
    isActive: boolean;
    sortOrder: number;
}

export interface TripAddOn {
    id: string;
    templateId: string;
    agencyId: string;
    name: Record<string, string>;
    pricingUnit: AddOnPricingUnit;
    price: string;
    currency: string;
    isActive: boolean;
    sortOrder: number;
}

/** #695: the booking's immutable pricing-selection snapshot. */
export interface PricingSelectionSnapshot {
    variant: {
        id: string;
        name: Record<string, string> | null;
        pricingUnit: PricingUnit;
        unitSize: number;
        unitPrice: string;
        units: number;
        amount: string;
    } | null;
    addOns: Array<{
        id: string;
        name: Record<string, string> | null;
        pricingUnit: AddOnPricingUnit;
        unitPrice: string;
        quantity: number;
        amount: string;
    }>;
    baseAmount: string;
    addOnsTotal: string;
    totalAmount: string;
    currency: string;
    guestsCount: number;
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
    /** #675: normalised destination slug (BETA_DESTINATIONS config). */
    destinationSlug?: string | null;
    /** #676: structured meeting point (full shape on agency/booking
     * payloads; public trip payloads carry PublicMeetingPoint). */
    meetingPoint?: MeetingPoint | PublicMeetingPoint | null;
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
    /** #687: one-line cancellation summary (standardised definition). */
    cancellationSummary?: CancellationSummary;
    /** #686: capped agency-authored FAQ entries (language-keyed). */
    faqs?: TripFaqEntry[] | null;
    /** #686: FAQ entries generated server-side from structured data. */
    generatedFaqs?: TripFaqEntry[];
    /** #697: agency elected pay-on-arrival for this trip. */
    payOnArrivalEnabled?: boolean;
    /** #694: the trip offers a private per-group variant. */
    privateTourEnabled?: boolean;
    /** #701: agency-defined pickup points for booking-time selection. */
    pickupPoints?: PickupPoint[] | null;
    /** Agency legal name for obligor copy (present on list payloads too). */
    agencyLegalName?: string | null;
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
    /** #694: SHARED (default) or PRIVATE (per-group exclusive). */
    sessionKind?: SessionKind;
    /** #696: reserve now, pay the agency before the hold deadline. */
    allowPayLater?: boolean;
    payLaterHoldHours?: number | null;
}

/**
 * #684 (Council S6): custom-trip request (private RFQ) statuses and
 * payloads. Agency-facing payloads are PSEUDONYMISED — they carry the
 * publicRef and trip facts only; `traveler` appears solely on the
 * accepted agency's view after acceptance.
 */
export enum CustomTripRequestStatus {
    Pending = "PENDING",
    Quoted = "QUOTED",
    Accepted = "ACCEPTED",
    Declined = "DECLINED",
    Cancelled = "CANCELLED",
    Expired = "EXPIRED",
    Converted = "CONVERTED",
}

export type CustomTripRequestStatusType = CustomTripRequestStatus;

export interface CustomTripOffer {
    id: string;
    requestId: string;
    agencyId: string;
    agency?: { id: string; companyName: string } | null;
    quotedTotalAmount: string;
    quotedCurrency: string;
    quoteNote?: string | null;
    cancellationScale?: CancellationScaleSnapshot | null;
    status: string;
    quotedAt: string;
    acceptedAt?: string | null;
}

export interface CustomTripRequest {
    id: string;
    publicRef: string;
    travelerId?: string;
    title: string;
    description?: string | null;
    destinationSlug?: string | null;
    startLocation?: string | null;
    requestedStartDate: string;
    requestedEndDate: string;
    guestsCount: number;
    budgetMaxMad?: string | null;
    note?: string | null;
    status: CustomTripRequestStatusType;
    expiresAt: string;
    acceptedOfferId?: string | null;
    convertedTemplateId?: string | null;
    offers?: CustomTripOffer[];
    /** Present ONLY for the traveller themselves, or for the accepted
     * agency after acceptance (#684 identity-reveal rule). */
    traveler?: { email: string; name?: string | null } | null;
    createdAt: string;
    updatedAt: string;
}

/** #685: live destination inventory for the Layer B city pages. All
 * counts are computed from live inventory at request time. */
export interface DestinationInventory {
    slug: string;
    tripCount: number;
    agencyCount: number;
    reviewCount: number;
    averageRating: number | null;
    categories: Array<{ category: string; tripCount: number }>;
    trips: DestinationInventoryTrip[];
}

/** #685 Layer B: one live trip inside a destination inventory payload. */
export interface DestinationInventoryTrip {
    id: string;
    title: string;
    category: string;
    images?: string[];
    startingPrice?: string | number | null;
    currency: string;
    cancellationSummary?: CancellationSummary | null;
    sessions?: Array<{ price: string | number }>;
    agency?: { companyName?: string | null } | null;
}

/**
 * #682 (Council S6): firm-quote lifecycle for published trips — the
 * traveller requests dates/party (PENDING), the agency replies with a
 * firm MAD TTC total + its cancellation scale (QUOTED), the traveller
 * accepts (ACCEPTED — quote, scale and acceptance timestamp are
 * snapshotted immutably) or the flow ends (DECLINED/CANCELLED).
 */
export enum QuoteRequestStatus {
    Pending = "PENDING",
    Quoted = "QUOTED",
    Accepted = "ACCEPTED",
    Declined = "DECLINED",
    Cancelled = "CANCELLED",
}

export type QuoteRequestStatusType = QuoteRequestStatus;

/**
 * #682: one firm-quote request and, once accepted, its immutable
 * snapshot. Amounts are stringified decimals (house money convention);
 * the total is the TOTAL for the requested dates/party in MAD TTC —
 * never an indicative or per-person figure.
 */
export interface QuoteRequest {
    id: string;
    templateId: string;
    agencyId: string;
    travelerId: string;
    requestedStartDate: string;
    requestedEndDate: string;
    guestsCount: number;
    note?: string | null;
    status: QuoteRequestStatusType;
    quotedTotalAmount?: string | null;
    quotedCurrency: string;
    quoteNote?: string | null;
    cancellationScale?: CancellationScaleSnapshot | null;
    quotedAt?: string | null;
    acceptedAt?: string | null;
    acceptedSnapshot?: {
        quotedTotalAmount: string;
        quotedCurrency: string;
        cancellationScale: CancellationScaleSnapshot | null;
        quotedAt: string | null;
        acceptedAt: string;
        templateId: string;
        agencyId: string;
    } | null;
    createdAt: string;
    updatedAt: string;
    template?: {
        id: string;
        title: string;
        startLocation: string;
        agency?: { id: string; companyName: string } | null;
    } | null;
    traveler?: { email: string; name?: string | null } | null;
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
    /** #434 (Council P1-08): agency recorded that the traveller did not attend. */
    NoShow = "NO_SHOW",
}

/**
 * #434 (Council P1-08): attendance recorded by the agency for a booking.
 * Absent/null = not recorded yet. Only ATTENDED makes a completed
 * booking review-eligible.
 */
export enum BookingAttendance {
    Attended = "ATTENDED",
    NoShow = "NO_SHOW",
}

export type BookingAttendanceType = BookingAttendance;

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
    /** #434: attendance recorded by the agency; null/absent = not recorded yet. */
    attendance?: BookingAttendance | null;
    attendanceRecordedAt?: string | null;
    attendanceRecordedBy?: string | null;
    /** #693: traveller dispute of the recorded attendance (stamp + reason). */
    attendanceDisputedAt?: string | null;
    attendanceDisputeReason?: string | null;
    /** #689: Booking Pass QR check-in stamp (second attendance signal). */
    passCheckInAt?: string | null;
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
    /** #688: RC insurer name + policy validity window (public record). */
    insuranceInsurer?: string | null;
    insuranceExpiry?: string | null;
    /** #700: Law 31-08 Art. 29(2) seller block — address, phone, IF/RC. */
    businessAddress?: string | null;
    businessPhone?: string | null;
    rc?: string | null;
    taxId?: string | null;
}

export interface BookingTemplateSummary {
    agency: BookingAgencySummary;
    agencyId: string;
    id: string;
    images: string[];
    /** #332: alt text per image (index-aligned); may be absent. */
    imageAlts?: string[];
    startLocation: string;
    /** #676: the FULL structured meeting point — booking responses are
     * the one traveller surface allowed to carry the exact address and
     * maps link (the traveller holding the booking is the audience). */
    meetingPoint?: MeetingPoint | null;
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
    /** #695: pricing-selection snapshot (variant + add-ons with agency
     * prices at booking time and the reconciled breakdown). */
    pricingSelection?: PricingSelectionSnapshot | null;
    /** Batch F: #694 private session snapshot. */
    isPrivateSession?: boolean;
    /** Batch F: #696 pay-later hold deadline (ISO) or null. */
    payLaterDeadline?: string | null;
    /** Batch F: #697 pay-on-arrival flag. */
    payOnArrival?: boolean;
    /** Batch F: #701 chosen pickup point + its snapshot. */
    pickupPointId?: string | null;
    pickupPointSnapshot?: PickupPoint | null;
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

/**
 * #689 (Council S6): the Booking Pass — issued only once the AGENCY has
 * confirmed receipt of the deposit in its own bank account. The pass is
 * a receipt artefact: it states the payment was made to the named
 * agency and that Ouiboo holds no funds. `token` is the signed QR
 * payload; it resolves nothing on its own — verification requires an
 * authenticated agency session (POST /bookings/pass/verify).
 */
export interface BookingPass {
    bookingId: string;
    status: string;
    issuedAt: string;
    token: string;
    seller: {
        agencyId: string;
        legalName: string | null;
        companyName: string;
    };
    tripTitle: string;
    startDate: string;
    endDate: string;
    guestsCount: number;
    currency: string;
    totalAmount: DecimalString;
    depositConfirmedAmount: DecimalString | null;
    balanceAmount: DecimalString | null;
    meetingPoint: { address: string | null; mapsUrl: string | null; pickupAvailable: boolean } | null;
    attendance?: BookingAttendance | null;
    passCheckInAt?: string | null;
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
