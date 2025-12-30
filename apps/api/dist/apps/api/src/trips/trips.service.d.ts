import { DatabaseService } from '../database/database.service';
import { CreateTripTemplateDto, CreateTripSessionDto } from './dto/create-trip.dto';
export declare class TripsService {
    private db;
    constructor(db: DatabaseService);
    createTemplate(userId: string, dto: CreateTripTemplateDto): Promise<{
        id: string;
        title: string;
        description: string;
        category: import("@ouiboo/database").$Enums.TripCategory;
        startLocation: string;
        durationDays: number;
        durationNights: number;
        inclusions: string[];
        images: string[];
        status: import("@ouiboo/database").$Enums.TripStatus;
        featured: boolean;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string;
    }>;
    findAllTemplates(featured?: boolean): Promise<({
        _count: {
            sessions: number;
        };
    } & {
        id: string;
        title: string;
        description: string;
        category: import("@ouiboo/database").$Enums.TripCategory;
        startLocation: string;
        durationDays: number;
        durationNights: number;
        inclusions: string[];
        images: string[];
        status: import("@ouiboo/database").$Enums.TripStatus;
        featured: boolean;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string;
    })[]>;
    findOneTemplate(id: string): Promise<{
        agency: {
            id: string;
            userId: string;
            ice: string;
            companyName: string;
            patente: string;
            rib: string;
            verificationStatus: import("@ouiboo/database").$Enums.VerificationStatus;
            bio: string | null;
            logo: string | null;
        };
        sessions: {
            id: string;
            status: string;
            templateId: string;
            startDate: Date;
            endDate: Date;
            price: number;
            totalSeats: number;
            availableSeats: number;
        }[];
    } & {
        id: string;
        title: string;
        description: string;
        category: import("@ouiboo/database").$Enums.TripCategory;
        startLocation: string;
        durationDays: number;
        durationNights: number;
        inclusions: string[];
        images: string[];
        status: import("@ouiboo/database").$Enums.TripStatus;
        featured: boolean;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string;
    }>;
    createSession(templateId: string, dto: CreateTripSessionDto): Promise<{
        id: string;
        status: string;
        templateId: string;
        startDate: Date;
        endDate: Date;
        price: number;
        totalSeats: number;
        availableSeats: number;
    }>;
    findSessionsByTemplate(templateId: string): Promise<{
        id: string;
        status: string;
        templateId: string;
        startDate: Date;
        endDate: Date;
        price: number;
        totalSeats: number;
        availableSeats: number;
    }[]>;
}
