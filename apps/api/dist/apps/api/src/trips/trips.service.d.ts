import { DatabaseService } from '../database/database.service';
import { CreateTripTemplateDto, CreateTripSessionDto } from './dto/create-trip.dto';
export declare class TripsService {
    private db;
    constructor(db: DatabaseService);
    createTemplate(userId: string, dto: CreateTripTemplateDto): Promise<{
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
    findAllTemplates(featured?: boolean): Promise<({
        _count: {
            sessions: number;
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
    findOneTemplate(id: string): Promise<{
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
        sessions: {
            id: string;
            status: string;
            startDate: Date;
            endDate: Date;
            price: number;
            totalSeats: number;
            availableSeats: number;
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
        images: string[];
        status: import("@ouiboo/database").$Enums.TripStatus;
        featured: boolean;
    }>;
    createSession(templateId: string, dto: CreateTripSessionDto): Promise<{
        id: string;
        status: string;
        startDate: Date;
        endDate: Date;
        price: number;
        totalSeats: number;
        availableSeats: number;
        templateId: string;
    }>;
    findSessionsByTemplate(templateId: string): Promise<{
        id: string;
        status: string;
        startDate: Date;
        endDate: Date;
        price: number;
        totalSeats: number;
        availableSeats: number;
        templateId: string;
    }[]>;
    updateTemplate(id: string, dto: any): Promise<{
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
    removeTemplate(id: string): Promise<{
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
}
