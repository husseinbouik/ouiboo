import { DatabaseService } from '../database/database.service';
import { WalletsService } from '../wallets/wallets.service';
import { RequestPayoutDto } from './dto/payout-request.dto';
export declare class AgencyController {
    private readonly prisma;
    private readonly walletsService;
    constructor(prisma: DatabaseService, walletsService: WalletsService);
    getStats(req: any): Promise<{
        revenue: number;
        activeTrips: number;
        totalBookings: number;
        totalCustomers: number;
        wallet: {
            id: string;
            availableBalance: number;
            pendingBalance: number;
            agencyId: string;
        } | {
            availableBalance: number;
            pendingBalance: number;
        };
    }>;
    getTrips(req: any): Promise<({
        sessions: ({
            _count: {
                bookings: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@ouiboo/database").$Enums.SessionStatus;
            startDate: Date;
            endDate: Date;
            price: number;
            deposit: number;
            totalSeats: number;
            minBookings: number;
            templateId: string;
            availableSeats: number;
            currency: string;
            cancellationReason: string | null;
        })[];
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
        averageRating: number | null;
        reviewCount: number;
        lastReviewDate: Date | null;
        cancellationPolicy: import("../../../../packages/database/generated-client/runtime/library").JsonValue | null;
        minBookings: number;
    })[]>;
    getBookings(req: any): Promise<({
        paymentProof: {
            id: string;
            status: import("@ouiboo/database").$Enums.VerificationStatus;
            bookingId: string;
            imageUrl: string;
            uploadedAt: Date;
            rejectionReason: string | null;
        };
        traveler: {
            email: string;
            name: string;
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
                averageRating: number | null;
                reviewCount: number;
                lastReviewDate: Date | null;
                cancellationPolicy: import("../../../../packages/database/generated-client/runtime/library").JsonValue | null;
                minBookings: number;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@ouiboo/database").$Enums.SessionStatus;
            startDate: Date;
            endDate: Date;
            price: number;
            deposit: number;
            totalSeats: number;
            minBookings: number;
            templateId: string;
            availableSeats: number;
            currency: string;
            cancellationReason: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@ouiboo/database").$Enums.BookingStatus;
        cancellationReason: string | null;
        travelerId: string;
        sessionId: string;
        guestsCount: number;
        fullName: string | null;
        phoneNumber: string | null;
        documentNumber: string | null;
        paymentMethod: import("@ouiboo/database").$Enums.PaymentMethod;
        bookingDate: Date;
        totalAmount: number;
        paymentProofUrl: string | null;
        paymentProofId: string | null;
        paymentGatewayTransactionId: string | null;
        paymentGatewayMetadata: import("../../../../packages/database/generated-client/runtime/library").JsonValue | null;
        paymentStatus: import("@ouiboo/database").$Enums.BookingPaymentStatus;
        lastReminderSentAt: Date | null;
        notificationsSent: import("../../../../packages/database/generated-client/runtime/library").JsonValue | null;
        cancelledAt: Date | null;
        cancelledBy: string | null;
        confirmedAt: Date | null;
        refundAmount: number | null;
        refundStatus: import("@ouiboo/database").$Enums.RefundStatus | null;
        refundProcessedAt: Date | null;
    })[]>;
    getPayouts(req: any): Promise<{
        id: string;
        bankDetails: string;
        agencyId: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
    }[]>;
    getReviews(req: any): Promise<{
        reviews: {
            id: string;
            rating: number;
            comment: string;
            response: string;
            isVerifiedBooking: boolean;
            createdAt: Date;
            traveler: {
                name: string;
                id: string;
                avatar: string;
            };
            trip: {
                id: string;
                title: string;
            };
        }[];
        stats: {
            totalReviews: number;
            averageRating: number;
            pendingResponses: number;
            responseRate: number;
        };
    }>;
    getReviewStats(req: any): Promise<{
        totalReviews: number;
        averageRating: number;
        pendingResponses: number;
        responseRate: number;
    }>;
    requestPayout(req: any, dto: RequestPayoutDto): Promise<{
        id: string;
        bankDetails: string;
        agencyId: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
    }>;
    updateProfile(req: any, data: {
        companyName?: string;
        bio?: string;
        logo?: string;
        bankDetails?: string;
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
}
