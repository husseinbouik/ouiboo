import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { DatabaseService } from '../database/database.service';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';

const mockBooking = {
    id: 'booking-123',
    travelerId: 'user-123',
    status: 'PENDING',
    paymentProofId: null,
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
        create: jest.fn(),
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
    let service: BookingsService;
    let db: typeof mockDatabaseService;
    let uploadService: typeof mockUploadService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BookingsService,
                {
                    provide: DatabaseService,
                    useValue: mockDatabaseService,
                },
                {
                    provide: UploadService,
                    useValue: mockUploadService,
                },
            ],
        }).compile();

        service = module.get<BookingsService>(BookingsService);
        db = module.get(DatabaseService);
        uploadService = module.get(UploadService);

        jest.clearAllMocks();
    });

    describe('uploadPaymentProof', () => {
        it('should upload proof if user is the traveler', async () => {
            db.booking.findUnique.mockResolvedValue(mockBooking);
            db.paymentProof.create.mockResolvedValue({ id: 'proof-123' });
            db.booking.update.mockResolvedValue({ ...mockBooking, status: 'PENDING_PAYMENT' });
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
            } as Express.Multer.File);

            expect(db.booking.findUnique).toHaveBeenCalledWith({
                where: { id: 'booking-123' },
                include: { session: { include: { template: true } } },
            });
            expect(db.paymentProof.create).toHaveBeenCalled();
            expect(db.booking.update).toHaveBeenCalled();
        });

        it('should throw error if booking not found', async () => {
            db.booking.findUnique.mockResolvedValue(null);

            await expect(
                service.uploadPaymentProof('booking-123', 'user-123', {} as Express.Multer.File),
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw error if user is not the traveler or agency owner', async () => {
            db.booking.findUnique.mockResolvedValue(mockBooking);
            db.agencyProfile.findUnique.mockResolvedValue(null);

            await expect(
                service.uploadPaymentProof('booking-123', 'user-999', {} as Express.Multer.File),
            ).rejects.toThrow('Unauthorized');
        });
    });
});
