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
            status: string;
            startDate: Date;
            endDate: Date;
            price: number;
            totalSeats: number;
            availableSeats: number;
            templateId: string;
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
        images: string[];
        status: import("@ouiboo/database").$Enums.TripStatus;
        featured: boolean;
    })[]>;
    getBookings(req: any): Promise<({
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
            name: string;
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
    })[]>;
    getPayouts(req: any): Promise<{
        id: string;
        agencyId: string;
        status: import("@ouiboo/database").$Enums.PayoutStatus;
        amount: number;
        requestedAt: Date;
        processedAt: Date | null;
        bankDetails: string;
    }[]>;
}
