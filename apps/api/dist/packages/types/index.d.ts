export declare enum UserRole {
    Agency = "AGENCY",
    Traveler = "TRAVELER",
    Admin = "ADMIN"
}
export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}
export declare enum VerificationStatus {
    Pending = "PENDING",
    Verified = "VERIFIED",
    Rejected = "REJECTED"
}
export type VerificationStatusType = (typeof VerificationStatus)[keyof typeof VerificationStatus];
export declare enum SubscriptionStatus {
    Trial = "TRIAL",
    Active = "ACTIVE",
    Cancelled = "CANCELLED",
    Expired = "EXPIRED"
}
export interface AgencyProfile {
    id: string;
    userId: string;
    companyName: string;
    ice: string;
    patente: string;
    rib: string;
    verificationStatus: VerificationStatus;
    bio?: string;
    logo?: string;
    subscriptionStatus: SubscriptionStatus;
    trialEndsAt?: string;
    subscriptionEndsAt?: string;
}
export declare enum TripStatus {
    Active = "ACTIVE",
    Draft = "DRAFT",
    Archived = "ARCHIVED"
}
export declare enum TripCategory {
    Adventure = "ADVENTURE",
    Cultural = "CULTURAL",
    Luxury = "LUXURY",
    Budget = "BUDGET"
}
export interface ItineraryDay {
    id: string;
    templateId: string;
    dayNumber: number;
    title?: string;
    description: string;
    activities: string[];
}
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
export interface TripSession {
    id: string;
    templateId: string;
    startDate: string;
    endDate: string;
    price: number;
    deposit: number;
    totalSeats: number;
    availableSeats: number;
    status: "OPEN" | "CLOSED" | "CANCELLED";
}
export declare enum BookingStatus {
    Pending = "PENDING",
    AwaitingValidation = "AWAITING_VALIDATION",
    Confirmed = "CONFIRMED",
    Rejected = "REJECTED",
    Cancelled = "CANCELLED",
    Completed = "COMPLETED"
}
export interface Booking {
    id: string;
    sessionId: string;
    travelerId: string;
    bookingDate: string;
    status: BookingStatus;
    totalAmount: number;
    guestsCount: number;
    paymentProofUrl?: string;
    paymentProofId?: string;
}
export interface PaymentProof {
    id: string;
    bookingId: string;
    imageUrl: string;
    uploadedAt: string;
    status: VerificationStatus;
}
export interface Wallet {
    agencyId: string;
    availableBalance: number;
    pendingBalance: number;
}
export declare enum PayoutStatus {
    Pending = "PENDING",
    Approved = "APPROVED",
    Rejected = "REJECTED",
    Paid = "PAID"
}
export interface PayoutRequest {
    id: string;
    agencyId: string;
    amount: number;
    status: PayoutStatus;
    requestedAt: string;
    processedAt?: string;
    bankDetails: string;
}
