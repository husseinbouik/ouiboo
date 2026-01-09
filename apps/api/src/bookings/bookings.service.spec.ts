import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { DatabaseService } from '../database/database.service';
import { BadRequestException } from '@nestjs/common';

const mockBooking = {
    id: 'booking-123',
    travelerId: 'user-123',
    status: 'PENDING',
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
    $transaction: jest.fn((cb) => cb(mockDatabaseService)),
};

describe('BookingsService', () => {
    let service: BookingsService;
    let db: typeof mockDatabaseService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BookingsService,
                {
                    provide: DatabaseService,
                    useValue: mockDatabaseService,
                },
            ],
        }).compile();

        service = module.get<BookingsService>(BookingsService);
        db = module.get(DatabaseService);

        jest.clearAllMocks();
    });

    describe('uploadPaymentProof', () => {
        it('should upload proof if user is the traveler', async () => {
            db.booking.findUnique.mockResolvedValue(mockBooking);
            db.paymentProof.create.mockResolvedValue({ id: 'proof-123' });
            db.booking.update.mockResolvedValue({ ...mockBooking, status: 'PENDING_PAYMENT' });

            await service.uploadPaymentProof('booking-123', 'user-123', 'http://image.url');

            expect(db.booking.findUnique).toHaveBeenCalledWith({ where: { id: 'booking-123' } });
            expect(db.paymentProof.create).toHaveBeenCalled();
            expect(db.booking.update).toHaveBeenCalled();
        });

        it('should throw error if booking not found', async () => {
            db.booking.findUnique.mockResolvedValue(null);

            await expect(service.uploadPaymentProof('booking-123', 'user-123', 'url')).rejects.toThrow(BadRequestException);
        });

        it('should throw error if user is not the traveler', async () => {
            db.booking.findUnique.mockResolvedValue(mockBooking);

            await expect(service.uploadPaymentProof('booking-123', 'user-999', 'url')).rejects.toThrow('Unauthorized');
        });
    });
});
