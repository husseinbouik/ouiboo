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
                    category: import("@ouiboo/database").$Enums.TripCategory;
                    startLocation: string;
                    durationDays: number;
                    durationNights: number;
                    inclusions: string[];
                    images: string[];
                    status: import("@ouiboo/database").$Enums.TripStatus;
                    featured: boolean;
                    agencyId: string;
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
                id: string;
                avatar: string | null;
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
            id: string;
            avatar: string | null;
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
        };
    } & {
        description: string;
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: import("@ouiboo/database").$Enums.TripCategory;
        startLocation: string;
        durationDays: number;
        durationNights: number;
        inclusions: string[];
        images: string[];
        status: import("@ouiboo/database").$Enums.TripStatus;
        featured: boolean;
        agencyId: string;
    })[]>;
    verifyTrip(id: string, status: 'ACTIVE' | 'ARCHIVED'): Promise<{
        description: string;
        title: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        category: import("@ouiboo/database").$Enums.TripCategory;
        startLocation: string;
        durationDays: number;
        durationNights: number;
        inclusions: string[];
        images: string[];
        status: import("@ouiboo/database").$Enums.TripStatus;
        featured: boolean;
        agencyId: string;
    }>;
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
        };
    } & {
        id: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        agencyId: string;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
        bankDetails: string;
    })[]>;
    processPayout(id: string, status: 'PAID' | 'REJECTED'): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        agencyId: string;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
        bankDetails: string;
    }>;
}
