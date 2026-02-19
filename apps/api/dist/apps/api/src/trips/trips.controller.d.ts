import { TripsService } from './trips.service';
import { CreateTripTemplateDto, CreateTripSessionDto, UpdateTripTemplateDto } from './dto/create-trip.dto';
export declare class TripsController {
    private readonly tripsService;
    constructor(tripsService: TripsService);
    create(req: any, createTripDto: CreateTripTemplateDto): Promise<{
        itinerary: {
            description: string;
            title: string | null;
            id: string;
            dayNumber: number;
            activities: string[];
            templateId: string;
        }[];
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
    }>;
    findAll(featured?: string, status?: string, priceMin?: string, priceMax?: string, durationMin?: string, durationMax?: string, startDateFrom?: string, startDateTo?: string, ratingMin?: string, available?: string, sortBy?: string, sortOrder?: string, page?: string, limit?: string): Promise<{
        data: ({
            reviews: {
                rating: number;
            }[];
            _count: {
                reviews: number;
                sessions: number;
                wishlists: number;
            };
            agency: {
                id: string;
                companyName: string;
                logo: string;
            };
            sessions: {
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
            }[];
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
        })[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
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
        itinerary: {
            description: string;
            title: string | null;
            id: string;
            dayNumber: number;
            activities: string[];
            templateId: string;
        }[];
        sessions: {
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
        }[];
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
    }>;
    createSession(req: any, id: string, createSessionDto: CreateTripSessionDto): Promise<{
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
    }>;
    findSessions(id: string): Promise<{
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
    }[]>;
    update(req: any, id: string, updateTripDto: UpdateTripTemplateDto): Promise<{
        itinerary: {
            description: string;
            title: string | null;
            id: string;
            dayNumber: number;
            activities: string[];
            templateId: string;
        }[];
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
    }>;
    remove(req: any, id: string): Promise<{
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
    }>;
}
