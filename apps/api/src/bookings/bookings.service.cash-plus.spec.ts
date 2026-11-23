import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { DatabaseService } from '../database/database.service';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';
import { EmailService } from '../email/email.service';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { StagedPaymentsService } from '../staged-payments/staged-payments.service';

/**
 * #988: Cash Plus booking channel — the create gate (verified +
 * enabled agency destination only), code-only proof submission, and
 * the confirmation rule (reference = the traveller's transaction
 * code, amount = the exact stage amount).
 */
const mockDatabaseService: any = {
    booking: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
    },
    tripSession: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn() },
    paymentProof: { upsert: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn() },
    bookingPaymentPlan: { updateMany: jest.fn() },
    externalPayment: { findFirst: jest.fn(), findUnique: jest.fn() },
    duplicateCreditFlag: { create: jest.fn(), findMany: jest.fn() },
    agencyProfile: { findUnique: jest.fn() },
    promoCode: { findFirst: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn((cb: any) => cb(mockDatabaseService)),
};

const mockExternalPaymentsService = {
    recordPaymentVerifiedInTransaction: jest.fn(),
    recordPaymentRejectedInTransaction: jest.fn(),
    recordPaymentPendingInTransaction: jest.fn(),
    updateProofStatusInTransaction: jest.fn(),
};

const mockStagedPaymentsService = {
    isStagedSession: jest.fn(() => false),
    createPlanInTransaction: jest.fn(),
    applyProofRejectionInTransaction: jest.fn(),
    applyBankConfirmationInTransaction: jest.fn(),
    notifyBalanceDueForSession: jest.fn(async () => undefined),
};

const future = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const agencyBase = {
    id: 'agency-123',
    userId: 'agency-user-123',
    verificationStatus: 'VERIFIED',
    travelLicenceStatus: 'VERIFIED',
    licenceExpiry: future(365),
    insuranceStatus: 'VERIFIED',
    insuranceExpiry: future(365),
    subscriptionStatus: 'TRIAL',
    trialEndsAt: future(7),
    subscriptionEndsAt: null,
    newBookingsRestrictedAt: null,
};

const cashPlusVerified = {
    cashPlusBeneficiaryName: 'Atlas SARL',
    cashPlusPhone: '+212612345678',
    cashPlusEnabled: true,
    cashPlusStatus: 'VERIFIED',
    cashPlusVerifiedAt: future(-1),
};

function sessionWith(agencyExtra: Record<string, unknown>) {
    return {
        id: 'session-123',
        status: 'OPEN',
        startDate: future(30),
        endDate: future(31),
        price: 250,
        currency: 'MAD',
        totalSeats: 10,
        availableSeats: 8,
        template: {
            status: 'ACTIVE',
            title: 'Atlas Escape',
            agencyId: 'agency-123',
            currency: 'MAD',
            agency: { ...agencyBase, ...agencyExtra },
        },
    };
}

const createDto = {
    sessionId: 'session-123',
    guestsCount: 1,
    fullName: 'Test Traveler',
    phoneNumber: '+212600000000',
    termsAccepted: true,
    termsVersion: '1.0',
    locale: 'en',
};

describe('BookingsService — Cash Plus (#988)', () => {
    let service: BookingsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BookingsService,
                { provide: DatabaseService, useValue: mockDatabaseService },
                { provide: EmailService, useValue: { sendBookingNotification: jest.fn(), sendPaymentConfirmation: jest.fn() } },
                { provide: UploadService, useValue: { uploadFile: jest.fn(), readFile: jest.fn(), isLocal: jest.fn() } },
                { provide: ExternalPaymentsService, useValue: mockExternalPaymentsService },
                { provide: StagedPaymentsService, useValue: mockStagedPaymentsService },
            ],
        }).compile();
        service = module.get<BookingsService>(BookingsService);
        jest.clearAllMocks();
        mockDatabaseService.$transaction.mockImplementation((cb: any) => cb(mockDatabaseService));
    });

    describe('create gate', () => {
        it('rejects CASH_PLUS when the agency has no Cash Plus infos', async () => {
            mockDatabaseService.tripSession.findUnique.mockResolvedValue(sessionWith({}));
            await expect(
                service.create('user-123', { ...createDto, paymentMethod: 'CASH_PLUS' } as any),
            ).rejects.toThrow('Cash Plus is not available for this agency');
        });

        it('rejects CASH_PLUS when infos are only pending review', async () => {
            mockDatabaseService.tripSession.findUnique.mockResolvedValue(
                sessionWith({ ...cashPlusVerified, cashPlusStatus: 'PENDING_REVIEW', cashPlusVerifiedAt: null }),
            );
            await expect(
                service.create('user-123', { ...createDto, paymentMethod: 'CASH_PLUS' } as any),
            ).rejects.toThrow('Cash Plus is not available for this agency');
        });

        it('rejects CASH_PLUS when verified but the toggle is off', async () => {
            mockDatabaseService.tripSession.findUnique.mockResolvedValue(
                sessionWith({ ...cashPlusVerified, cashPlusEnabled: false }),
            );
            await expect(
                service.create('user-123', { ...createDto, paymentMethod: 'CASH_PLUS' } as any),
            ).rejects.toThrow('Cash Plus is not available for this agency');
        });
    });

    describe('submitPaymentProofCode', () => {
        const bookingWithChannel = {
            id: 'booking-1',
            travelerId: 'user-123',
            status: 'PENDING',
            totalAmount: '250.00',
            currency: 'MAD',
            paymentMethod: 'MANUAL',
            manualPaymentChannel: 'CASH_PLUS',
            paymentPlan: null,
            paymentProof: null,
            session: { groupStatus: 'NOT_REQUIRED', template: { agencyId: 'agency-123' } },
        };

        it('requires a code', async () => {
            await expect(service.submitPaymentProofCode('booking-1', 'user-123', '  ')).rejects.toThrow(
                'transaction code is required',
            );
        });

        it('rejects a booking that was not made with Cash Plus', async () => {
            mockDatabaseService.booking.findUnique.mockResolvedValue({
                ...bookingWithChannel,
                manualPaymentChannel: 'BANK_TRANSFER',
            });
            await expect(service.submitPaymentProofCode('booking-1', 'user-123', 'CP-1')).rejects.toThrow(
                'not made with Cash Plus',
            );
        });

        it('records the stage payment as pending with the code and moves the booking to AWAITING_VALIDATION', async () => {
            mockDatabaseService.booking.findUnique.mockResolvedValue(bookingWithChannel);
            mockDatabaseService.paymentProof.upsert.mockResolvedValue({
                id: 'proof-1',
                bookingId: 'booking-1',
                imageUrl: '',
                uploadedAt: new Date(),
                status: 'PENDING',
                transactionCode: 'CP-2026-777',
            });
            mockDatabaseService.booking.update.mockResolvedValue({});

            const result: any = await service.submitPaymentProofCode('booking-1', 'user-123', ' CP-2026-777 ');

            expect(result.transactionCode).toBe('CP-2026-777');
            expect(mockDatabaseService.booking.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ status: 'AWAITING_VALIDATION', paymentProofId: 'proof-1' }),
                }),
            );
            expect(mockExternalPaymentsService.recordPaymentPendingInTransaction).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    manualChannel: 'CASH_PLUS',
                    transactionCode: 'CP-2026-777',
                    stage: 'FULL',
                }),
            );
        });
    });

    describe('confirmBankPayment — Cash Plus reference rule', () => {
        const acceptedBooking = {
            id: 'booking-1',
            travelerId: 'user-123',
            status: 'AWAITING_VALIDATION',
            totalAmount: '250.00',
            currency: 'MAD',
            paymentMethod: 'MANUAL',
            manualPaymentChannel: 'CASH_PLUS',
            paymentPlan: null,
            paymentProof: { id: 'proof-1', status: 'ACCEPTED' },
            paymentProofId: 'proof-1',
            session: { template: { agencyId: 'agency-123', title: 'Atlas Escape' } },
            traveler: { email: 'traveler@example.com' },
        };

        beforeEach(() => {
            mockDatabaseService.booking.findUnique.mockResolvedValue(acceptedBooking);
            mockDatabaseService.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            mockDatabaseService.externalPayment.findUnique.mockResolvedValue({ transactionCode: 'CP-2026-777' });
        });

        it('rejects a confirmation whose reference is not the traveller transaction code', async () => {
            await expect(
                service.confirmBankPayment('booking-1', 'agency-123', 'agency-user-123', {
                    confirmedAmount: 250,
                    bankReference: 'WRONG-CODE',
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects a short amount even with the right code (fee is on top)', async () => {
            await expect(
                service.confirmBankPayment('booking-1', 'agency-123', 'agency-user-123', {
                    confirmedAmount: 240,
                    bankReference: 'CP-2026-777',
                }),
            ).rejects.toThrow('does not match the expected payment amount');
        });
    });
});
