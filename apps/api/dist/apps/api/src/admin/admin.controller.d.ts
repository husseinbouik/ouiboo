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
                totalSeats: number;
                availableSeats: number;
                templateId: string;
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
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            status: import("@ouiboo/database").$Enums.BookingStatus;
            sessionId: string;
            guestsCount: number;
            bookingDate: Date;
            totalAmount: number;
            paymentProofId: string | null;
            travelerId: string;
        };
    } & {
        id: string;
        status: import("@ouiboo/database").$Enums.VerificationStatus;
        imageUrl: string;
        uploadedAt: Date;
        bookingId: string;
    })[]>;
    verifyPayment(id: string, status: 'VERIFIED' | 'REJECTED'): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.VerificationStatus;
        imageUrl: string;
        uploadedAt: Date;
        bookingId: string;
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
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        companyName: string;
        ice: string;
        patente: string;
        rib: string;
        verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
        bio: string | null;
        logo: string | null;
        userId: string;
    })[]>;
    verifyAgency(id: string, status: 'VERIFIED' | 'REJECTED'): Promise<{
        id: string;
        companyName: string;
        ice: string;
        patente: string;
        rib: string;
        verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
        bio: string | null;
        logo: string | null;
        userId: string;
    }>;
    getPendingTrips(): import("@ouiboo/database").Prisma.PrismaPromise<({
        agency: {
            id: string;
            companyName: string;
            ice: string;
            patente: string;
            rib: string;
            verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
            bio: string | null;
            logo: string | null;
            userId: string;
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
        images: string[];
        status: import("@ouiboo/database").$Enums.TripStatus;
        featured: boolean;
    }>;
    getPayoutRequests(): import("@ouiboo/database").Prisma.PrismaPromise<({
        agency: {
            id: string;
            companyName: string;
            ice: string;
            patente: string;
            rib: string;
            verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
            bio: string | null;
            logo: string | null;
            userId: string;
        };
    } & {
        id: string;
        agencyId: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
        bankDetails: string;
    })[]>;
    processPayout(id: string, status: 'PAID' | 'REJECTED'): Promise<{
        id: string;
        agencyId: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
        bankDetails: string;
    }>;
}
