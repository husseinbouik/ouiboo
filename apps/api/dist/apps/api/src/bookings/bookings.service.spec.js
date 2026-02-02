"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const bookings_service_1 = require("./bookings.service");
const database_service_1 = require("../database/database.service");
const common_1 = require("@nestjs/common");
const upload_service_1 = require("../upload/upload.service");
const mockBooking = {
    id: 'booking-123',
    travelerId: 'user-123',
    status: 'PENDING',
    paymentProofId: null,
    bookingDate: new Date(),
    session: {
        template: {
            agencyId: 'agency-123',
        },
    },
};
const mockDatabaseService = {
    booking: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
    },
    tripSession: {
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    paymentProof: {
        upsert: jest.fn(),
    },
    agencyProfile: {
        findUnique: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockDatabaseService)),
};
const mockUploadService = {
    uploadFile: jest.fn(),
};
describe('BookingsService', () => {
    let service;
    let db;
    let uploadService;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                bookings_service_1.BookingsService,
                {
                    provide: database_service_1.DatabaseService,
                    useValue: mockDatabaseService,
                },
                {
                    provide: upload_service_1.UploadService,
                    useValue: mockUploadService,
                },
            ],
        }).compile();
        service = module.get(bookings_service_1.BookingsService);
        db = module.get(database_service_1.DatabaseService);
        uploadService = module.get(upload_service_1.UploadService);
        jest.clearAllMocks();
    });
    describe('uploadPaymentProof', () => {
        it('should upload proof if user is the traveler', async () => {
            db.booking.findUnique.mockResolvedValue(mockBooking);
            db.paymentProof.upsert.mockResolvedValue({ id: 'proof-123' });
            db.booking.update.mockResolvedValue({ ...mockBooking, status: 'AWAITING_VALIDATION' });
            db.agencyProfile.findUnique.mockResolvedValue(null);
            uploadService.uploadFile.mockResolvedValue({
                url: 'http://upload.url',
                filename: 'payment-proofs/booking-123/proof.png',
                size: 100,
            });
            await service.uploadPaymentProof('booking-123', 'user-123', {
                originalname: 'proof.png',
                mimetype: 'image/png',
                size: 100,
                buffer: Buffer.from('file'),
            });
            expect(db.booking.findUnique).toHaveBeenCalledWith({
                where: { id: 'booking-123' },
                include: { session: { include: { template: true } } },
            });
            expect(db.paymentProof.upsert).toHaveBeenCalled();
            expect(db.booking.update).toHaveBeenCalled();
        });
        it('should throw error if booking not found', async () => {
            db.booking.findUnique.mockResolvedValue(null);
            await expect(service.uploadPaymentProof('booking-123', 'user-123', {})).rejects.toThrow(common_1.BadRequestException);
        });
        it('should throw error if user is not the traveler or agency owner', async () => {
            db.booking.findUnique.mockResolvedValue(mockBooking);
            db.agencyProfile.findUnique.mockResolvedValue(null);
            await expect(service.uploadPaymentProof('booking-123', 'user-999', {})).rejects.toThrow(common_1.ForbiddenException);
        });
    });
});
//# sourceMappingURL=bookings.service.spec.js.map