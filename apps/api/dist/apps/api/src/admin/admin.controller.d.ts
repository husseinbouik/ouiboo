import { DatabaseService } from '../database/database.service';
import { WalletsService } from '../wallets/wallets.service';
export declare class AdminController {
    private db;
    private walletsService;
    constructor(db: DatabaseService, walletsService: WalletsService);
    getPendingPayments(): import("@ouiboo/database").Prisma.PrismaPromise<({
        booking: {
            session: {
                template: {
                    description: string;
                    title: string;
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    agencyId: string;
                    category: import("@ouiboo/database").$Enums.TripCategory;
                    startLocation: string;
                    durationDays: number;
                    durationNights: number;
                    inclusions: string[];
                    exclusions: string[];
                    checklist: string[];
                    images: string[];
                    status: import("@ouiboo/database").$Enums.TripStatus;
                    featured: boolean;
                };
            } & {
                id: string;
                status: string;
                startDate: Date;
                endDate: Date;
                price: number;
                deposit: number;
                totalSeats: number;
                templateId: string;
                availableSeats: number;
            };
            traveler: {
                email: string;
                password: string;
                name: string | null;
                role: import("@ouiboo/database").$Enums.UserRole;
                otp: string | null;
                id: string;
                avatar: string | null;
                isEmailVerified: boolean;
                otpExpiresAt: Date | null;
                otpLastSentAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            status: import("@ouiboo/database").$Enums.BookingStatus;
            sessionId: string;
            guestsCount: number;
            fullName: string | null;
            phoneNumber: string | null;
            documentNumber: string | null;
            bookingDate: Date;
            totalAmount: number;
            paymentProofUrl: string | null;
            paymentProofId: string | null;
            travelerId: string;
        };
    } & {
        id: string;
        status: import("@ouiboo/database").$Enums.VerificationStatus;
        bookingId: string;
        imageUrl: string;
        uploadedAt: Date;
        rejectionReason: string | null;
    })[]>;
    verifyPayment(id: string, status: 'VERIFIED' | 'REJECTED', rejectionReason?: string): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.VerificationStatus;
        bookingId: string;
        imageUrl: string;
        uploadedAt: Date;
        rejectionReason: string | null;
    }>;
    getPendingAgencies(): import("@ouiboo/database").Prisma.PrismaPromise<({
        user: {
            email: string;
            password: string;
            name: string | null;
            role: import("@ouiboo/database").$Enums.UserRole;
            otp: string | null;
            id: string;
            avatar: string | null;
            isEmailVerified: boolean;
            otpExpiresAt: Date | null;
            otpLastSentAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        userId: string;
        companyName: string;
        ice: string;
        patente: string;
        rib: string;
        verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
        bio: string | null;
        logo: string | null;
        subscriptionStatus: import("@ouiboo/database").$Enums.SubscriptionStatus;
        trialEndsAt: Date | null;
        subscriptionEndsAt: Date | null;
        bankDetails: string | null;
    })[]>;
    verifyAgency(id: string, status: 'VERIFIED' | 'REJECTED'): Promise<{
        id: string;
        userId: string;
        companyName: string;
        ice: string;
        patente: string;
        rib: string;
        verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
        bio: string | null;
        logo: string | null;
        subscriptionStatus: import("@ouiboo/database").$Enums.SubscriptionStatus;
        trialEndsAt: Date | null;
        subscriptionEndsAt: Date | null;
        bankDetails: string | null;
    }>;
    getPendingTrips(): import("@ouiboo/database").Prisma.PrismaPromise<({
        agency: {
            id: string;
            userId: string;
            companyName: string;
            ice: string;
            patente: string;
            rib: string;
            verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
            bio: string | null;
            logo: string | null;
            subscriptionStatus: import("@ouiboo/database").$Enums.SubscriptionStatus;
            trialEndsAt: Date | null;
            subscriptionEndsAt: Date | null;
            bankDetails: string | null;
        };
    } & {
        description: string;
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string;
        category: import("@ouiboo/database").$Enums.TripCategory;
        startLocation: string;
        durationDays: number;
        durationNights: number;
        inclusions: string[];
        exclusions: string[];
        checklist: string[];
        images: string[];
        status: import("@ouiboo/database").$Enums.TripStatus;
        featured: boolean;
    })[]>;
    verifyTrip(id: string, status: 'ACTIVE' | 'ARCHIVED'): Promise<{
        description: string;
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string;
        category: import("@ouiboo/database").$Enums.TripCategory;
        startLocation: string;
        durationDays: number;
        durationNights: number;
        inclusions: string[];
        exclusions: string[];
        checklist: string[];
        images: string[];
        status: import("@ouiboo/database").$Enums.TripStatus;
        featured: boolean;
    }>;
    getAgencies(): import("@ouiboo/database").Prisma.PrismaPromise<({
        user: {
            email: string;
            password: string;
            name: string | null;
            role: import("@ouiboo/database").$Enums.UserRole;
            otp: string | null;
            id: string;
            avatar: string | null;
            isEmailVerified: boolean;
            otpExpiresAt: Date | null;
            otpLastSentAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        userId: string;
        companyName: string;
        ice: string;
        patente: string;
        rib: string;
        verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
        bio: string | null;
        logo: string | null;
        subscriptionStatus: import("@ouiboo/database").$Enums.SubscriptionStatus;
        trialEndsAt: Date | null;
        subscriptionEndsAt: Date | null;
        bankDetails: string | null;
    })[]>;
    updateAgencyStatus(id: string, data: {
        verificationStatus?: any;
        subscriptionStatus?: any;
    }): Promise<{
        id: string;
        userId: string;
        companyName: string;
        ice: string;
        patente: string;
        rib: string;
        verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
        bio: string | null;
        logo: string | null;
        subscriptionStatus: import("@ouiboo/database").$Enums.SubscriptionStatus;
        trialEndsAt: Date | null;
        subscriptionEndsAt: Date | null;
        bankDetails: string | null;
    }>;
    getBookings(): import("@ouiboo/database").Prisma.PrismaPromise<({
        paymentProof: {
            id: string;
            status: import("@ouiboo/database").$Enums.VerificationStatus;
            bookingId: string;
            imageUrl: string;
            uploadedAt: Date;
            rejectionReason: string | null;
        };
        session: {
            template: {
                description: string;
                title: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                agencyId: string;
                category: import("@ouiboo/database").$Enums.TripCategory;
                startLocation: string;
                durationDays: number;
                durationNights: number;
                inclusions: string[];
                exclusions: string[];
                checklist: string[];
                images: string[];
                status: import("@ouiboo/database").$Enums.TripStatus;
                featured: boolean;
            };
        } & {
            id: string;
            status: string;
            startDate: Date;
            endDate: Date;
            price: number;
            deposit: number;
            totalSeats: number;
            templateId: string;
            availableSeats: number;
        };
        traveler: {
            email: string;
            password: string;
            name: string | null;
            role: import("@ouiboo/database").$Enums.UserRole;
            otp: string | null;
            id: string;
            avatar: string | null;
            isEmailVerified: boolean;
            otpExpiresAt: Date | null;
            otpLastSentAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        status: import("@ouiboo/database").$Enums.BookingStatus;
        sessionId: string;
        guestsCount: number;
        fullName: string | null;
        phoneNumber: string | null;
        documentNumber: string | null;
        bookingDate: Date;
        totalAmount: number;
        paymentProofUrl: string | null;
        paymentProofId: string | null;
        travelerId: string;
    })[]>;
    getPayoutRequests(): import("@ouiboo/database").Prisma.PrismaPromise<({
        agency: {
            id: string;
            userId: string;
            companyName: string;
            ice: string;
            patente: string;
            rib: string;
            verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
            bio: string | null;
            logo: string | null;
            subscriptionStatus: import("@ouiboo/database").$Enums.SubscriptionStatus;
            trialEndsAt: Date | null;
            subscriptionEndsAt: Date | null;
            bankDetails: string | null;
        };
    } & {
        id: string;
        bankDetails: string;
        agencyId: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
    })[]>;
    processPayout(id: string, status: 'PAID' | 'REJECTED'): Promise<{
        id: string;
        bankDetails: string;
        agencyId: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
    }>;
}
