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
    }>;
    findAll(featured?: string, status?: string): Promise<({
        _count: {
            sessions: number;
        };
        agency: {
            id: string;
            companyName: string;
            logo: string;
        };
        sessions: {
            id: string;
            status: string;
            startDate: Date;
            endDate: Date;
            price: number;
            deposit: number;
            totalSeats: number;
            templateId: string;
            availableSeats: number;
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
    })[]>;
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
            status: string;
            startDate: Date;
            endDate: Date;
            price: number;
            deposit: number;
            totalSeats: number;
            templateId: string;
            availableSeats: number;
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
    }>;
    createSession(req: any, id: string, createSessionDto: CreateTripSessionDto): Promise<{
        id: string;
        status: string;
        startDate: Date;
        endDate: Date;
        price: number;
        deposit: number;
        totalSeats: number;
        templateId: string;
        availableSeats: number;
    }>;
    findSessions(id: string): Promise<{
        id: string;
        status: string;
        startDate: Date;
        endDate: Date;
        price: number;
        deposit: number;
        totalSeats: number;
        templateId: string;
        availableSeats: number;
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
    }>;
}
