import { TripsService } from './trips.service';
import { CreateTripTemplateDto, CreateTripSessionDto } from './dto/create-trip.dto';
export declare class TripsController {
    private readonly tripsService;
    constructor(tripsService: TripsService);
    create(req: any, createTripDto: CreateTripTemplateDto): Promise<{
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
    findAll(featured?: string): Promise<({
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
    findOne(id: string): Promise<{
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
    createSession(id: string, createSessionDto: CreateTripSessionDto): Promise<{
        id: string;
        status: string;
        templateId: string;
        startDate: Date;
        endDate: Date;
        price: number;
        totalSeats: number;
        availableSeats: number;
    }>;
    findSessions(id: string): Promise<{
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
