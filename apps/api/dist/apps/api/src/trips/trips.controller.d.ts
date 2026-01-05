import { TripsService } from './trips.service';
import { CreateTripTemplateDto, CreateTripSessionDto } from './dto/create-trip.dto';
import { UpdateTripTemplateDto } from './dto/update-trip.dto';
export declare class TripsController {
    private readonly tripsService;
    constructor(tripsService: TripsService);
    create(req: any, createTripDto: CreateTripTemplateDto): Promise<{
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
    findAll(featured?: string): Promise<({
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
    findOne(id: string): Promise<{
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
    createSession(id: string, createSessionDto: CreateTripSessionDto): Promise<{
        id: string;
        status: string;
        startDate: Date;
        endDate: Date;
        price: number;
        totalSeats: number;
        availableSeats: number;
        templateId: string;
    }>;
    findSessions(id: string): Promise<{
        id: string;
        status: string;
        startDate: Date;
        endDate: Date;
        price: number;
        totalSeats: number;
        availableSeats: number;
        templateId: string;
    }[]>;
    update(id: string, updateTripDto: UpdateTripTemplateDto): Promise<{
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
    remove(id: string): Promise<{
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
