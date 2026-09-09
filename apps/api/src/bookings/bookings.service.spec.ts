import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { DatabaseService } from '../database/database.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';
import { EmailService } from '../email/email.service';
import { WalletsService } from '../wallets/wallets.service';

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
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
    },
    tripSession: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
    },
    paymentProof: {
        upsert: jest.fn(),
        updateMany: jest.fn(),
    },
    agencyProfile: {
        findUnique: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockDatabaseService)),
};

const mockUploadService = {
    uploadFile: jest.fn(),
};

const mockEmailService = {
    sendBookingNotification: jest.fn(),
    sendPaymentConfirmation: jest.fn(),
};

const mockWalletsService = {
    creditWalletInTransaction: jest.fn(),
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
                    provide: EmailService,
                    useValue: mockEmailService,
                },
                {
                    provide: UploadService,
                    useValue: mockUploadService,
                },
                {
                    provide: WalletsService,
                    useValue: mockWalletsService,
                },
            ],
        }).compile();

        service = module.get<BookingsService>(BookingsService);
        db = module.get(DatabaseService);
        uploadService = module.get(UploadService);

        jest.clearAllMocks();
    });

    describe('create', () => {
        const createDto = {
            sessionId: 'session-123',
            guestsCount: 2,
            fullName: 'Test Traveler',
            phoneNumber: '+212600000000',
            documentNumber: 'AA123456',
        };
        const availableSession = {
            id: 'session-123',
            status: 'OPEN',
            startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            price: 250,
            template: {
                status: 'ACTIVE',
                title: 'Atlas Escape',
                agency: {
                    userId: 'agency-user-123',
                    verificationStatus: 'VERIFIED',
                    subscriptionStatus: 'TRIAL',
                    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    subscriptionEndsAt: null,
                },
            },
        };

        it('rejects a direct API booking for an inactive trip', async () => {
            db.tripSession.findUnique.mockResolvedValue({
                ...availableSession,
                template: { ...availableSession.template, status: 'DRAFT' },
            });

            await expect(service.create('user-123', createDto)).rejects.toThrow(
                'This trip session is not available for booking',
            );
            expect(db.$transaction).not.toHaveBeenCalled();
        });

        it('checks for duplicate bookings after acquiring the session row', async () => {
            db.tripSession.findUnique.mockResolvedValue(availableSession);
            db.tripSession.updateMany.mockResolvedValue({ count: 1 });
            db.booking.findFirst.mockResolvedValue({ id: 'existing-booking' });

            await expect(service.create('user-123', createDto)).rejects.toThrow(
                'You already have a booking for this session',
            );

            expect(db.tripSession.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
                db.booking.findFirst.mock.invocationCallOrder[0],
            );
        });
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
            } as Express.Multer.File);

            expect(db.booking.findUnique).toHaveBeenCalledWith({
                where: { id: 'booking-123' },
                include: { session: { include: { template: true } } },
            });
            expect(db.paymentProof.upsert).toHaveBeenCalled();
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

            await expect(service.uploadPaymentProof('booking-123', 'user-999', {} as any)).rejects.toThrow(ForbiddenException);
        });
    });
});
