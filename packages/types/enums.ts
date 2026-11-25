/**
 * GENERATED FILE — do not edit by hand.
 *
 * Source of truth: packages/database/prisma/schema.prisma (domain enums).
 * Regenerate with: node packages/types/scripts/generate-enums.mjs
 * (#1025 / finding A3: single source of truth for enums.)
 */

export enum UserRole {
    Agency = "AGENCY",
    Traveler = "TRAVELER",
    Admin = "ADMIN",
}

export type UserRoleType = UserRole;

export enum VerificationStatus {
    Pending = "PENDING",
    Accepted = "ACCEPTED",
    Verified = "VERIFIED",
    Rejected = "REJECTED",
}

export type VerificationStatusType = VerificationStatus;

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

/** #988: which manual channel a traveller chose — bank transfer or
 * Cash Plus. Both are MANUAL (traveller pays the agency directly). */
export enum ManualPaymentChannel {
    BankTransfer = "BANK_TRANSFER",
    CashPlus = "CASH_PLUS",
}

export type ManualPaymentChannelType = ManualPaymentChannel;

export enum AgencyPaymentOnboardingStatus {
    NotStarted = "NOT_STARTED",
    PendingVerification = "PENDING_VERIFICATION",
    Connected = "CONNECTED",
    Disabled = "DISABLED",
}

export type AgencyPaymentOnboardingStatusType = AgencyPaymentOnboardingStatus;

export enum PaymentAttemptStatus {
    Created = "CREATED",
    Pending = "PENDING",
    Captured = "CAPTURED",
    Failed = "FAILED",
    Refunded = "REFUNDED",
}

export type PaymentAttemptStatusType = PaymentAttemptStatus;

export enum WebhookProcessingStatus {
    Received = "RECEIVED",
    Processed = "PROCESSED",
    Duplicate = "DUPLICATE",
    Rejected = "REJECTED",
    Mismatch = "MISMATCH",
    Failed = "FAILED",
}

export type WebhookProcessingStatusType = WebhookProcessingStatus;

export enum PaymentReconciliationMismatchType {
    StatusMismatch = "STATUS_MISMATCH",
    AmountMismatch = "AMOUNT_MISMATCH",
    MerchantMismatch = "MERCHANT_MISMATCH",
    MissingWebhook = "MISSING_WEBHOOK",
}

export type PaymentReconciliationMismatchTypeType = PaymentReconciliationMismatchType;

export enum PaymentReconciliationStatus {
    Open = "OPEN",
    Resolved = "RESOLVED",
}

export type PaymentReconciliationStatusType = PaymentReconciliationStatus;

export enum TripStatus {
    Active = "ACTIVE",
    Draft = "DRAFT",
    Archived = "ARCHIVED",
    Inactive = "INACTIVE",
}

export type TripStatusType = TripStatus;

export enum QuoteRequestStatus {
    Pending = "PENDING",
    Quoted = "QUOTED",
    Accepted = "ACCEPTED",
    Declined = "DECLINED",
    Cancelled = "CANCELLED",
}

export type QuoteRequestStatusType = QuoteRequestStatus;

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

export enum CustomTripOfferStatus {
    Quoted = "QUOTED",
    Accepted = "ACCEPTED",
    Declined = "DECLINED",
    Withdrawn = "WITHDRAWN",
}

export type CustomTripOfferStatusType = CustomTripOfferStatus;

export enum SessionKind {
    Shared = "SHARED",
    Private = "PRIVATE",
}

export type SessionKindType = SessionKind;

export enum AccommodationTier {
    Standard = "STANDARD",
    Comfort = "COMFORT",
    Premium = "PREMIUM",
}

export type AccommodationTierType = AccommodationTier;

export enum TripCategory {
    Adventure = "ADVENTURE",
    Cultural = "CULTURAL",
    Luxury = "LUXURY",
    Budget = "BUDGET",
    Nature = "NATURE",
}

export type TripCategoryType = TripCategory;

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

export enum BookingStatus {
    Pending = "PENDING",
    AwaitingValidation = "AWAITING_VALIDATION",
    Confirmed = "CONFIRMED",
    Rejected = "REJECTED",
    Cancelled = "CANCELLED",
    Completed = "COMPLETED",
    PendingMinimum = "PENDING_MINIMUM",
    NotConfirmed = "NOT_CONFIRMED",
    NoShow = "NO_SHOW",
}

export type BookingStatusType = BookingStatus;

export enum BookingAttendance {
    Attended = "ATTENDED",
    NoShow = "NO_SHOW",
}

export type BookingAttendanceType = BookingAttendance;

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

export enum NotificationType {
    PaymentReminder = "PAYMENT_REMINDER",
    TripReminder = "TRIP_REMINDER",
    BookingConfirmation = "BOOKING_CONFIRMATION",
    Cancellation = "CANCELLATION",
    ReviewRequest = "REVIEW_REQUEST",
    ReviewResponse = "REVIEW_RESPONSE",
}

export type NotificationTypeType = NotificationType;

export enum RefundStatus {
    Pending = "PENDING",
    Processed = "PROCESSED",
    Failed = "FAILED",
}

export type RefundStatusType = RefundStatus;

export enum BookingPaymentStatus {
    Unpaid = "UNPAID",
    Paid = "PAID",
    Refunded = "REFUNDED",
    Failed = "FAILED",
    PartiallyPaid = "PARTIALLY_PAID",
}

export type BookingPaymentStatusType = BookingPaymentStatus;

export enum SessionStatus {
    Open = "OPEN",
    Full = "FULL",
    Cancelled = "CANCELLED",
}

export type SessionStatusType = SessionStatus;

export enum NotificationDeliveryStatus {
    Sent = "SENT",
    Failed = "FAILED",
    Bounced = "BOUNCED",
}

export type NotificationDeliveryStatusType = NotificationDeliveryStatus;

export enum PaymentTransactionStatus {
    Initiated = "INITIATED",
    Success = "SUCCESS",
    Failed = "FAILED",
    Pending = "PENDING",
}

export type PaymentTransactionStatusType = PaymentTransactionStatus;

export enum PaymentCustodian {
    Agency = "AGENCY",
    AgencyPsp = "AGENCY_PSP",
}

export type PaymentCustodianType = PaymentCustodian;

export enum ExternalPaymentStatus {
    PendingVerification = "PENDING_VERIFICATION",
    Verified = "VERIFIED",
    Rejected = "REJECTED",
    Failed = "FAILED",
    Refunded = "REFUNDED",
}

export type ExternalPaymentStatusType = ExternalPaymentStatus;

export enum PaymentLedgerEntryType {
    PaymentVerified = "PAYMENT_VERIFIED",
    PaymentCaptured = "PAYMENT_CAPTURED",
    PaymentRejected = "PAYMENT_REJECTED",
    PaymentFailed = "PAYMENT_FAILED",
    RefundInitiated = "REFUND_INITIATED",
    RefundCompleted = "REFUND_COMPLETED",
    DepositCaptured = "DEPOSIT_CAPTURED",
    BalanceCaptured = "BALANCE_CAPTURED",
    RefundDue = "REFUND_DUE",
}

export type PaymentLedgerEntryTypeType = PaymentLedgerEntryType;

export enum PaymentLedgerSource {
    ManualProofReview = "MANUAL_PROOF_REVIEW",
    AdminProofReview = "ADMIN_PROOF_REVIEW",
    GatewayWebhook = "GATEWAY_WEBHOOK",
    GatewayRefund = "GATEWAY_REFUND",
    BankConfirmation = "BANK_CONFIRMATION",
}

export type PaymentLedgerSourceType = PaymentLedgerSource;

export enum SessionGroupStatus {
    NotRequired = "NOT_REQUIRED",
    PendingMinimum = "PENDING_MINIMUM",
    Confirmed = "CONFIRMED",
    NotConfirmed = "NOT_CONFIRMED",
}

export type SessionGroupStatusType = SessionGroupStatus;

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

export enum RefundCaseStatus {
    RefundRequested = "REFUND_REQUESTED",
    EligibilityReview = "ELIGIBILITY_REVIEW",
    RefundApproved = "REFUND_APPROVED",
    AgencyActionRequired = "AGENCY_ACTION_REQUIRED",
    RefundInitiated = "REFUND_INITIATED",
    RefundCompleted = "REFUND_COMPLETED",
    RefundRejected = "REFUND_REJECTED",
    RefundFailed = "REFUND_FAILED",
    RefundOverdue = "REFUND_OVERDUE",
}

export type RefundCaseStatusType = RefundCaseStatus;

export enum RefundEvidenceTier {
    PspConfirmation = "PSP_CONFIRMATION",
    BankProviderConfirmation = "BANK_PROVIDER_CONFIRMATION",
    BankReference = "BANK_REFERENCE",
    TravellerConfirmation = "TRAVELLER_CONFIRMATION",
    AdminReview = "ADMIN_REVIEW",
}

export type RefundEvidenceTierType = RefundEvidenceTier;

export enum RefundEvidenceSource {
    SystemWebhook = "SYSTEM_WEBHOOK",
    Agency = "AGENCY",
    Traveller = "TRAVELLER",
    Admin = "ADMIN",
}

export type RefundEvidenceSourceType = RefundEvidenceSource;

export enum ExternalPaymentStage {
    Full = "FULL",
    Deposit = "DEPOSIT",
    Balance = "BALANCE",
}

export type ExternalPaymentStageType = ExternalPaymentStage;

export enum DuplicateCreditFlagStatus {
    Open = "OPEN",
    Resolved = "RESOLVED",
    Dismissed = "DISMISSED",
}

export type DuplicateCreditFlagStatusType = DuplicateCreditFlagStatus;

export enum ReviewStatus {
    Pending = "PENDING",
    Visible = "VISIBLE",
    Hidden = "HIDDEN",
    Removed = "REMOVED",
}

export type ReviewStatusType = ReviewStatus;

export enum PricingUnit {
    PerPerson = "PER_PERSON",
    PerGroup = "PER_GROUP",
    PerVehicle = "PER_VEHICLE",
}

export type PricingUnitType = PricingUnit;

export enum AddOnPricingUnit {
    PerPerson = "PER_PERSON",
    PerBooking = "PER_BOOKING",
}

export type AddOnPricingUnitType = AddOnPricingUnit;

export enum PromoDiscountType {
    Percent = "PERCENT",
    FixedMad = "FIXED_MAD",
}

export type PromoDiscountTypeType = PromoDiscountType;

export enum CopyrightReportStatus {
    Open = "OPEN",
    Actioned = "ACTIONED",
    Dismissed = "DISMISSED",
}

export type CopyrightReportStatusType = CopyrightReportStatus;

export enum SupportTicketCategory {
    Booking = "BOOKING",
    Payment = "PAYMENT",
    Refund = "REFUND",
    Account = "ACCOUNT",
    Trip = "TRIP",
    Complaint = "COMPLAINT",
    Technical = "TECHNICAL",
    Other = "OTHER",
}

export type SupportTicketCategoryType = SupportTicketCategory;

export enum SupportTicketStatus {
    Open = "OPEN",
    InProgress = "IN_PROGRESS",
    Resolved = "RESOLVED",
    Closed = "CLOSED",
}

export type SupportTicketStatusType = SupportTicketStatus;

export enum SupportRequesterRole {
    Traveler = "TRAVELER",
    Agency = "AGENCY",
    Guest = "GUEST",
}

export type SupportRequesterRoleType = SupportRequesterRole;

export enum InvoiceStatus {
    Issued = "ISSUED",
    Credited = "CREDITED",
}

export type InvoiceStatusType = InvoiceStatus;

export enum InvoiceDocumentType {
    Invoice = "INVOICE",
    CreditNote = "CREDIT_NOTE",
}

export type InvoiceDocumentTypeType = InvoiceDocumentType;

export enum InvoiceLineType {
    ServiceFee = "SERVICE_FEE",
    Subscription = "SUBSCRIPTION",
}

export type InvoiceLineTypeType = InvoiceLineType;
