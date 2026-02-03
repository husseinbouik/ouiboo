import { DatabaseService } from '../database/database.service';
export declare class AnalyticsService {
    private prisma;
    constructor(prisma: DatabaseService);
    getRevenueTrends(agencyId: string, startDate: Date, endDate: Date, period?: 'daily' | 'weekly' | 'monthly'): Promise<{
        date: string;
        amount: number;
    }[]>;
    getConversionFunnel(agencyId: string, startDate: Date, endDate: Date): Promise<{
        views: number;
        bookingAttempts: number;
        confirmed: number;
        completed: number;
        conversionRate: number;
    }>;
    getTopTrips(agencyId: string, limit?: number): Promise<{
        id: string;
        title: string;
        bookings: number;
        revenue: number;
        avgRating: number;
        reviewCount: number;
    }[]>;
    getPaymentMethodDistribution(agencyId: string): Promise<{
        MANUAL: number;
        GATEWAY: number;
    }>;
    getCustomerDemographics(agencyId: string): Promise<{
        totalCustomers: number;
        repeatCustomers: number;
        repeatCustomerRate: number;
    }>;
    getPlatformMetrics(): Promise<{
        gmv: number;
        totalBookings: number;
        totalAgencies: number;
        totalTravelers: number;
        avgBookingValue: number;
    }>;
    private groupByPeriod;
}
