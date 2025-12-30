import { DatabaseService } from '../database/database.service';
export declare class AgencyController {
    private readonly prisma;
    constructor(prisma: DatabaseService);
    getStats(req: any): Promise<{
        revenue: number;
        activeTrips: number;
        totalBookings: number;
        totalCustomers: number;
        wallet?: undefined;
    } | {
        revenue: number;
        activeTrips: number;
        totalBookings: number;
        totalCustomers: number;
        wallet: {
            id: string;
            agencyId: string;
            availableBalance: number;
            pendingBalance: number;
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
            status: string;
            templateId: string;
            startDate: Date;
            endDate: Date;
            price: number;
            totalSeats: number;
            availableSeats: number;
        })[];
    } & {
        id: string;
        status: import("@ouiboo/database").$Enums.TripStatus;
        agencyId: string;
        title: string;
        description: string;
        category: import("@ouiboo/database").$Enums.TripCategory;
        startLocation: string;
        durationDays: number;
        durationNights: number;
        inclusions: string[];
        images: string[];
        featured: boolean;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getBookings(req: any): Promise<({
        session: {
            template: {
                id: string;
                status: import("@ouiboo/database").$Enums.TripStatus;
                agencyId: string;
                title: string;
                description: string;
                category: import("@ouiboo/database").$Enums.TripCategory;
                startLocation: string;
                durationDays: number;
                durationNights: number;
                inclusions: string[];
                images: string[];
                featured: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            status: string;
            templateId: string;
            startDate: Date;
            endDate: Date;
            price: number;
            totalSeats: number;
            availableSeats: number;
        };
        traveler: {
            name: string;
            email: string;
        };
    } & {
        id: string;
        sessionId: string;
        travelerId: string;
        bookingDate: Date;
        status: import("@ouiboo/database").$Enums.BookingStatus;
        totalAmount: number;
        guestsCount: number;
        paymentProofId: string | null;
    })[]>;
    getPayouts(req: any): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        agencyId: string;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
        bankDetails: string;
    }[]>;
}
