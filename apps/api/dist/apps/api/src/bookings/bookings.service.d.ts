import { DatabaseService } from '../database/database.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { EmailService } from '../email/email.service';
import { UploadService } from '../upload/upload.service';
export declare class BookingsService {
    private db;
    private emailService;
    private uploadService;
    constructor(db: DatabaseService, emailService: EmailService, uploadService: UploadService);
    create(travelerId: string, dto: CreateBookingDto): Promise<{
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
    findAllByTraveler(travelerId: string): Promise<({
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
    findAllByAgency(tenantId: string): Promise<({
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
        traveler: {
            email: string;
            name: string;
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
    uploadPaymentProof(bookingId: string, userId: string, file: Express.Multer.File): Promise<{
        downloadUrl: string;
        id: string;
        status: import("@ouiboo/database").$Enums.VerificationStatus;
        bookingId: string;
        imageUrl: string;
        uploadedAt: Date;
        rejectionReason: string | null;
    }>;
    getPaymentProofFile(bookingId: string, userId: string, role?: string): Promise<{
        filePath: string;
    }>;
    isLocal(): boolean;
    private buildPaymentProofDownloadUrl;
    private isPaymentProofExpired;
    verifyPayment(bookingId: string, tenantId: string, approved: boolean, rejectionReason?: string): Promise<{
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
    cancelBooking(bookingId: string, travelerId: string): Promise<{
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
