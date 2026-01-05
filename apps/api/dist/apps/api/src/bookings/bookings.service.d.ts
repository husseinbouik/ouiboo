import { DatabaseService } from '../database/database.service';
import { CreateBookingDto } from './dto/create-booking.dto';
export declare class BookingsService {
    private db;
    constructor(db: DatabaseService);
    create(travelerId: string, dto: CreateBookingDto): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.BookingStatus;
        sessionId: string;
        guestsCount: number;
        bookingDate: Date;
        totalAmount: number;
        paymentProofId: string | null;
        travelerId: string;
    }>;
    findAllByTraveler(travelerId: string): Promise<({
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
    findAllByAgency(agencyId: string): Promise<({
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
    uploadPaymentProof(bookingId: string, imageUrl: string): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.VerificationStatus;
        imageUrl: string;
        uploadedAt: Date;
        bookingId: string;
    }>;
}
