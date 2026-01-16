import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Response } from 'express';
export declare class BookingsController {
    private readonly bookingsService;
    constructor(bookingsService: BookingsService);
    create(req: any, dto: CreateBookingDto): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.BookingStatus;
        sessionId: string;
        guestsCount: number;
        fullName: string | null;
        phoneNumber: string | null;
        documentNumber: string | null;
        bookingDate: Date;
        totalAmount: number;
        paymentProofUrl: string | null;
        paymentProofId: string | null;
        travelerId: string;
    }>;
    findMyBookings(req: any): Promise<({
        paymentProof: {
            id: string;
            status: import("@ouiboo/database").$Enums.VerificationStatus;
            bookingId: string;
            imageUrl: string;
            uploadedAt: Date;
            rejectionReason: string | null;
        };
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
                exclusions: string[];
                checklist: string[];
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
            deposit: number;
            totalSeats: number;
            templateId: string;
            availableSeats: number;
        };
    } & {
        id: string;
        status: import("@ouiboo/database").$Enums.BookingStatus;
        sessionId: string;
        guestsCount: number;
        fullName: string | null;
        phoneNumber: string | null;
        documentNumber: string | null;
        bookingDate: Date;
        totalAmount: number;
        paymentProofUrl: string | null;
        paymentProofId: string | null;
        travelerId: string;
    })[]>;
    uploadPaymentProof(req: any, id: string, file: Express.Multer.File): Promise<{
        downloadUrl: string;
        id: string;
        status: import("@ouiboo/database").$Enums.VerificationStatus;
        bookingId: string;
        imageUrl: string;
        uploadedAt: Date;
        rejectionReason: string | null;
    }>;
    downloadPaymentProof(req: any, id: string, res: Response): Promise<void>;
    verifyPayment(req: any, id: string, approved: boolean, rejectionReason?: string): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.BookingStatus;
        sessionId: string;
        guestsCount: number;
        fullName: string | null;
        phoneNumber: string | null;
        documentNumber: string | null;
        bookingDate: Date;
        totalAmount: number;
        paymentProofUrl: string | null;
        paymentProofId: string | null;
        travelerId: string;
    }>;
    cancelBooking(req: any, id: string): Promise<{
        id: string;
        status: import("@ouiboo/database").$Enums.BookingStatus;
        sessionId: string;
        guestsCount: number;
        fullName: string | null;
        phoneNumber: string | null;
        documentNumber: string | null;
        bookingDate: Date;
        totalAmount: number;
        paymentProofUrl: string | null;
        paymentProofId: string | null;
        travelerId: string;
    }>;
}
