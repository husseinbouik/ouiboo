import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
export declare class BookingsController {
    private readonly bookingsService;
    constructor(bookingsService: BookingsService);
    create(req: any, dto: CreateBookingDto): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.BookingStatus;
        sessionId: string;
        guestsCount: number;
        bookingDate: Date;
        totalAmount: number;
        paymentProofId: string | null;
        travelerId: string;
    }>;
    findMyBookings(req: any): Promise<({
        session: {
            template: {
                description: string;
                title: string;
                id: string;
                createdAt: Date;
                updatedAt: Date;
                category: import("@ouiboo/database").$Enums.TripCategory;
                startLocation: string;
                durationDays: number;
                durationNights: number;
                inclusions: string[];
                images: string[];
                status: import("@ouiboo/database").$Enums.TripStatus;
                featured: boolean;
                agencyId: string;
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
    uploadPaymentProof(id: string, imageUrl: string): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.VerificationStatus;
        imageUrl: string;
        uploadedAt: Date;
        bookingId: string;
    }>;
}
