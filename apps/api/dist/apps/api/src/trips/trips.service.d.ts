import { DatabaseService } from '../database/database.service';
import { CreateTripTemplateDto, CreateTripSessionDto } from './dto/create-trip.dto';
export declare class TripsService {
    private db;
    constructor(db: DatabaseService);
    createTemplate(agencyId: string, dto: CreateTripTemplateDto): Promise<{
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
    findAllTemplates(featured?: boolean, status?: string): Promise<({
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
    findOneTemplate(id: string): Promise<{
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
    createSession(agencyId: string, templateId: string, dto: CreateTripSessionDto): Promise<{
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
    findSessionsByTemplate(templateId: string): Promise<{
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
    updateTemplate(id: string, agencyId: string, dto: Partial<CreateTripTemplateDto>): Promise<{
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
    deleteTemplate(id: string, agencyId: string): Promise<{
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
