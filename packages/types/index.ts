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
}

export enum TripStatus {
    Active = "ACTIVE",
    Draft = "DRAFT",
    Archived = "ARCHIVED",
}

export enum TripCategory {
    Adventure = "ADVENTURE",
    Cultural = "CULTURAL",
    Luxury = "LUXURY",
    Budget = "BUDGET",
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
    images: string[];
    status: TripStatus;
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
    price: number;
    totalSeats: number;
    availableSeats: number;
    status: "OPEN" | "CLOSED" | "CANCELLED";
}

export enum BookingStatus {
    Pending = "PENDING",
    Confirmed = "CONFIRMED",
    Cancelled = "CANCELLED",
    Completed = "COMPLETED",
    PendingPayment = "PENDING_PAYMENT",
}

export interface Booking {
    id: string;
    sessionId: string;
    travelerId: string;
    bookingDate: string;
    status: BookingStatus;
    totalAmount: number;
    guestsCount: number;
    paymentProofId?: string;
}

export interface PaymentProof {
    id: string;
    bookingId: string;
    imageUrl: string;
    uploadedAt: string;
    status: "Pending" | "Verified" | "Rejected";
}

export interface Wallet {
    agencyId: string;
    availableBalance: number; // Cleared money
    pendingBalance: number;   // Money in Escrow
}

export enum PayoutStatus {
    Pending = "PENDING",
    Approved = "APPROVED",
    Rejected = "REJECTED",
    Paid = "PAID",
}

export interface PayoutRequest {
    id: string;
    agencyId: string;
    amount: number;
    status: PayoutStatus;
    requestedAt: string;
    processedAt?: string;
    bankDetails: string; // Copy of RIB at time of request
}
