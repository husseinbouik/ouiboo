import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private analyticsService;
    constructor(analyticsService: AnalyticsService);
    getRevenueTrends(startDate: string, endDate: string, period: 'daily' | 'weekly' | 'monthly', req: any): Promise<{
        date: string;
        amount: number;
    }[]>;
    getConversionFunnel(startDate: string, endDate: string, req: any): Promise<{
        views: number;
        bookingAttempts: number;
        confirmed: number;
        completed: number;
        conversionRate: number;
    }>;
    getTopTrips(limit: string, req: any): Promise<{
        id: string;
        title: string;
        bookings: number;
        revenue: number;
        avgRating: number;
        reviewCount: number;
    }[]>;
    getPaymentMethods(req: any): Promise<{
        MANUAL: number;
        GATEWAY: number;
    }>;
    getCustomerDemographics(req: any): Promise<{
        totalCustomers: number;
        repeatCustomers: number;
        repeatCustomerRate: number;
    }>;
}
export declare class AdminAnalyticsController {
    private analyticsService;
    constructor(analyticsService: AnalyticsService);
    getPlatformMetrics(): Promise<{
        gmv: number;
        totalBookings: number;
        totalAgencies: number;
        totalTravelers: number;
        avgBookingValue: number;
    }>;
}
