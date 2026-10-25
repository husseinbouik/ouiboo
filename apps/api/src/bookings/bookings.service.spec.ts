import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { DatabaseService } from '../database/database.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UploadService } from '../upload/upload.service';
import { EmailService } from '../email/email.service';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { StagedPaymentsService } from '../staged-payments/staged-payments.service';

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
    getFilePath: jest.fn(),
    readFile: jest.fn(),
    isLocal: jest.fn(),
};

const mockEmailService = {
    sendBookingNotification: jest.fn(),
    sendPaymentConfirmation: jest.fn(),
};

const mockExternalPaymentsService = {
    recordPaymentVerifiedInTransaction: jest.fn(),
    recordPaymentRejectedInTransaction: jest.fn(),
    recordPaymentPendingInTransaction: jest.fn(),
};

// #369: default mock = non-staged sessions; staged tests override these.
// #422: proof decisions split into rejection vs bank confirmation.
const mockStagedPaymentsService = {
    isStagedSession: jest.fn(() => false),
    createPlanInTransaction: jest.fn(),
    applyProofRejectionInTransaction: jest.fn(),
    applyBankConfirmationInTransaction: jest.fn(),
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
                    provide: ExternalPaymentsService,
                    useValue: mockExternalPaymentsService,
                },
                {
                    provide: StagedPaymentsService,
                    useValue: mockStagedPaymentsService,
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

        it('rejects new bookings for an agency restricted by an overdue refund (#370)', async () => {
            db.tripSession.findUnique.mockResolvedValue({
                ...availableSession,
                template: {
                    ...availableSession.template,
                    agency: {
                        ...availableSession.template.agency,
                        newBookingsRestrictedAt: new Date(),
                        newBookingsRestrictionReason: 'OVERDUE_REFUND',
                    },
                },
            });

            await expect(service.create('user-123', createDto)).rejects.toThrow(
                'This agency is temporarily unable to accept new bookings',
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
                include: {
                    session: { include: { template: true } },
                    paymentPlan: true,
                },
            });
            expect(db.paymentProof.upsert).toHaveBeenCalled();
            expect(db.booking.update).toHaveBeenCalled();
            // #422: upload creates the stage payment record as
            // PENDING_VERIFICATION — a real "proof received" record that
            // settles nothing.
            expect(mockExternalPaymentsService.recordPaymentPendingInTransaction).toHaveBeenCalledTimes(1);
            const pendingInput = mockExternalPaymentsService.recordPaymentPendingInTransaction.mock.calls[0][1];
            expect(pendingInput).toEqual(expect.objectContaining({
                bookingId: 'booking-123',
                agencyId: 'agency-123',
                stage: 'FULL',
            }));
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

    describe('getPaymentProofFile', () => {
        const proofBooking = {
            id: 'booking-123',
            travelerId: 'user-123',
            paymentProofId: 'proof-123',
            paymentProof: { imageUrl: 'private/payment-proofs/booking-123/proof.png' },
            session: { template: { agencyId: 'agency-123' } },
        };

        beforeEach(() => {
            db.booking.findUnique.mockResolvedValue(proofBooking);
            db.agencyProfile.findUnique.mockResolvedValue(null);
            uploadService.isLocal.mockResolvedValue(false);
        });

        it('streams remote private files through the authorized endpoint', async () => {
            uploadService.readFile.mockResolvedValue({
                data: Buffer.from([1, 2, 3]),
                contentType: 'image/png',
            });

            const result = await service.getPaymentProofFile('booking-123', 'user-123', 'TRAVELER');

            expect(result).toEqual({ buffer: Buffer.from([1, 2, 3]), contentType: 'image/png' });
            expect(uploadService.readFile).toHaveBeenCalledWith('private/payment-proofs/booking-123/proof.png');
            expect(uploadService.getFilePath).not.toHaveBeenCalled();
        });

        it('serves local private files as bytes without exposing a filesystem path (#390)', async () => {
            uploadService.isLocal.mockResolvedValue(true);
            uploadService.readFile.mockResolvedValue({
                data: Buffer.from([4, 5, 6]),
                contentType: 'image/png',
            });

            const result = await service.getPaymentProofFile('booking-123', 'user-123', 'TRAVELER');

            expect(result).toEqual({ buffer: Buffer.from([4, 5, 6]), contentType: 'image/png' });
            expect(uploadService.readFile).toHaveBeenCalledWith('private/payment-proofs/booking-123/proof.png');
            // No filesystem path may leak to the controller for res.sendFile.
            expect(uploadService.getFilePath).not.toHaveBeenCalled();
            expect(result).not.toHaveProperty('filePath');
        });

        it('rejects a user who is not owner, agency, or admin', async () => {
            await expect(service.getPaymentProofFile('booking-123', 'user-999')).rejects.toThrow('Unauthorized');
        });
    });

    describe('staged payments (#369)', () => {
        let stagedPayments: typeof mockStagedPaymentsService;

        const createDto = {
            sessionId: 'session-123',
            guestsCount: 2,
            fullName: 'Test Traveler',
            phoneNumber: '+212600000000',
            documentNumber: 'AA123456',
        };
        const stagedSession = {
            id: 'session-123',
            status: 'OPEN',
            startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            price: 250,
            deposit: 50,
            minBookings: 4,
            groupStatus: 'PENDING_MINIMUM',
            confirmationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
            template: {
                status: 'ACTIVE',
                title: 'Atlas Escape',
                agencyId: 'agency-123',
                agency: {
                    id: 'agency-123',
                    userId: 'agency-user-123',
                    verificationStatus: 'VERIFIED',
                    subscriptionStatus: 'TRIAL',
                    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    subscriptionEndsAt: null,
                },
            },
        };

        beforeEach(() => {
            stagedPayments = (service as any).stagedPaymentsService ?? mockStagedPaymentsService;
            mockStagedPaymentsService.isStagedSession.mockReturnValue(true);
        });

        it('rejects gateway payment methods for staged sessions (no one-shot full payment)', async () => {
            db.tripSession.findUnique.mockResolvedValue(stagedSession);

            await expect(service.create('user-123', {
                ...createDto,
                paymentMethod: 'CARD',
            } as any)).rejects.toThrow('Only bank transfer payment is available');
            expect(db.$transaction).not.toHaveBeenCalled();
        });

        it('rejects bookings for a session whose group was not confirmed', async () => {
            db.tripSession.findUnique.mockResolvedValue({
                ...stagedSession,
                groupStatus: 'NOT_CONFIRMED',
            });

            await expect(service.create('user-123', {
                ...createDto,
                paymentMethod: 'BANK_TRANSFER',
            } as any)).rejects.toThrow('minimum group size was not reached');
        });

        it('creates the payment plan inside the booking transaction', async () => {
            db.tripSession.findUnique.mockResolvedValue(stagedSession);
            db.tripSession.updateMany.mockResolvedValue({ count: 1 });
            db.booking.findFirst.mockResolvedValue(null);
            db.user.findUnique.mockResolvedValue({ email: 'traveler@example.com' });
            ((service as any).emailService.sendBookingNotification as jest.Mock).mockResolvedValue(undefined);
            const plan = {
                id: 'plan-1',
                status: 'DEPOSIT_DUE',
                totalAmount: '500.00',
                depositAmount: '100.00',
                balanceAmount: '400.00',
                currency: 'MAD',
                minimumParticipants: 4,
                confirmationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                balanceDueAt: null,
                groupConfirmedAt: null,
                paymentPolicyVersion: 'phase1-v1',
                refundPolicyVersion: 'phase1-v1',
            };
            mockStagedPaymentsService.createPlanInTransaction.mockResolvedValue(plan);
            db.booking.create.mockResolvedValue({
                id: 'booking-new',
                sessionId: 'session-123',
                travelerId: 'user-123',
                bookingDate: new Date(),
                status: 'PENDING',
                totalAmount: '500.00',
                currency: 'MAD',
                guestsCount: 2,
                paymentMethod: 'MANUAL',
                paymentStatus: 'UNPAID',
                paymentPlan: null,
                traveler: { email: 'traveler@example.com', name: 'Test Traveler' },
                session: {
                    id: 'session-123',
                    templateId: 'template-1',
                    startDate: new Date(),
                    endDate: new Date(),
                    price: '250.00',
                    deposit: '50.00',
                    totalSeats: 10,
                    availableSeats: 8,
                    status: 'OPEN',
                    currency: 'MAD',
                    template: {
                        id: 'template-1',
                        title: 'Atlas Escape',
                        startLocation: 'Marrakech',
                        images: [],
                        agencyId: 'agency-123',
                        agency: { id: 'agency-123', companyName: 'Atlas' },
                    },
                },
            });

            const result: any = await service.create('user-123', {
                ...createDto,
                paymentMethod: 'BANK_TRANSFER',
            } as any);

            expect(mockStagedPaymentsService.createPlanInTransaction).toHaveBeenCalledTimes(1);
            const planArgs = mockStagedPaymentsService.createPlanInTransaction.mock.calls[0][1];
            expect(planArgs.bookingId).toBe('booking-new');
            expect(planArgs.agencyId).toBe('agency-123');
            // The API response carries the mapped plan (money as strings).
            expect(result.paymentPlan).toEqual(expect.objectContaining({
                id: 'plan-1',
                status: 'DEPOSIT_DUE',
                depositAmount: '100.00',
                balanceAmount: '400.00',
                minimumParticipants: 4,
            }));
        });

        it('rejects a balance proof while the group is still unconfirmed (invariant)', async () => {
            db.booking.findUnique.mockResolvedValue({
                id: 'booking-123',
                travelerId: 'user-123',
                status: 'PENDING_MINIMUM',
                bookingDate: new Date(),
                session: { groupStatus: 'PENDING_MINIMUM' },
                paymentPlan: { status: 'DEPOSIT_DUE' },
            });

            await expect(service.uploadPaymentProof('booking-123', 'user-123', {} as any))
                .rejects.toThrow('not awaiting a deposit payment proof');
            expect(uploadService.uploadFile).not.toHaveBeenCalled();
        });

        it('accepts a balance proof after confirmation, without the initial expiry window', async () => {
            db.booking.findUnique.mockResolvedValue({
                id: 'booking-123',
                travelerId: 'user-123',
                status: 'CONFIRMED',
                // Long past the 24h initial-proof window: must not matter
                // for the balance stage.
                bookingDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                sessionId: 'session-123',
                guestsCount: 2,
                session: { groupStatus: 'CONFIRMED', template: { agencyId: 'agency-123' } },
                paymentPlan: { status: 'BALANCE_DUE', depositAmount: '100.00', balanceAmount: '400.00' },
            });
            db.paymentProof.upsert.mockResolvedValue({ id: 'proof-9' });
            db.booking.update.mockResolvedValue({});
            uploadService.uploadFile.mockResolvedValue({
                url: 'http://upload.url',
                filename: 'payment-proofs/booking-123/balance.png',
                size: 100,
            });

            await service.uploadPaymentProof('booking-123', 'user-123', {
                originalname: 'balance.png',
                mimetype: 'image/png',
                size: 100,
                buffer: Buffer.from('file'),
            } as Express.Multer.File);

            expect(db.paymentProof.upsert).toHaveBeenCalled();
            // #422: the BALANCE stage gets its own pending record with the
            // expected balance amount.
            const pendingInput = mockExternalPaymentsService.recordPaymentPendingInTransaction.mock.calls[0][1];
            expect(pendingInput).toEqual(expect.objectContaining({
                bookingId: 'booking-123',
                stage: 'BALANCE',
                amount: '400.00',
            }));
        });

        it('rejects any proof once the plan is fully paid', async () => {
            db.booking.findUnique.mockResolvedValue({
                id: 'booking-123',
                travelerId: 'user-123',
                status: 'CONFIRMED',
                bookingDate: new Date(),
                session: { groupStatus: 'CONFIRMED' },
                paymentPlan: { status: 'FULLY_PAID' },
            });

            await expect(service.uploadPaymentProof('booking-123', 'user-123', {} as any))
                .rejects.toThrow('not awaiting a payment proof');
        });

        it('accepting a staged proof settles nothing (#422): proof ACCEPTED, no payment effects, no email', async () => {
            const stagedBooking = {
                id: 'booking-123',
                travelerId: 'user-123',
                status: 'AWAITING_VALIDATION',
                paymentProofId: 'proof-1',
                paymentProof: { id: 'proof-1', status: 'PENDING' },
                paymentPlan: { id: 'plan-1', status: 'DEPOSIT_DUE' },
                session: { template: { agencyId: 'agency-123', title: 'Atlas Escape' } },
                traveler: { email: 'traveler@example.com' },
            };
            db.booking.findUnique.mockResolvedValue(stagedBooking);
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.paymentProof.updateMany.mockResolvedValue({ count: 1 });
            db.booking.findUniqueOrThrow.mockResolvedValue({ id: 'booking-123', status: 'AWAITING_VALIDATION' });

            const emailService: any = (service as any).emailService;
            const result: any = await service.verifyPayment('booking-123', 'agency-123', true);

            // The proof claim moved PENDING -> ACCEPTED only.
            expect(db.paymentProof.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'proof-1', status: 'PENDING' },
                data: expect.objectContaining({ status: 'ACCEPTED' }),
            }));
            // No settlement effects at accept time.
            expect(mockStagedPaymentsService.applyProofRejectionInTransaction).not.toHaveBeenCalled();
            expect(mockStagedPaymentsService.applyBankConfirmationInTransaction).not.toHaveBeenCalled();
            expect(mockExternalPaymentsService.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
            expect(db.booking.updateMany).not.toHaveBeenCalled();
            expect(emailService.sendPaymentConfirmation).not.toHaveBeenCalled();
            expect(result.status).toBe('AWAITING_VALIDATION');
        });

        it('rejecting a staged proof delegates to applyProofRejectionInTransaction', async () => {
            const stagedBooking = {
                id: 'booking-123',
                travelerId: 'user-123',
                status: 'AWAITING_VALIDATION',
                paymentProofId: 'proof-1',
                paymentProof: { id: 'proof-1', status: 'PENDING' },
                paymentPlan: { id: 'plan-1', status: 'DEPOSIT_DUE' },
                session: { template: { agencyId: 'agency-123', title: 'Atlas Escape' } },
                traveler: { email: 'traveler@example.com' },
            };
            db.booking.findUnique.mockResolvedValue(stagedBooking);
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.paymentProof.updateMany.mockResolvedValue({ count: 1 });
            db.booking.findUniqueOrThrow.mockResolvedValue({ id: 'booking-123', status: 'REJECTED' });
            mockStagedPaymentsService.applyProofRejectionInTransaction.mockResolvedValue({
                stage: 'DEPOSIT',
                fullyPaid: false,
                bookingStatus: 'REJECTED',
                planStatus: 'DEPOSIT_DUE',
            });

            await service.verifyPayment('booking-123', 'agency-123', false, 'Bank details do not match');

            expect(mockStagedPaymentsService.applyProofRejectionInTransaction).toHaveBeenCalledTimes(1);
            const rejectionArgs = mockStagedPaymentsService.applyProofRejectionInTransaction.mock.calls[0][1];
            expect(rejectionArgs.plan).toEqual(stagedBooking.paymentPlan);
            expect(mockStagedPaymentsService.applyBankConfirmationInTransaction).not.toHaveBeenCalled();
        });

        it('bank confirmation delegates to StagedPaymentsService with the confirmed amount and bank reference (#422)', async () => {
            const stagedBooking = {
                id: 'booking-123',
                travelerId: 'user-123',
                status: 'AWAITING_VALIDATION',
                paymentProofId: 'proof-1',
                paymentProof: { id: 'proof-1', status: 'ACCEPTED' },
                paymentPlan: { id: 'plan-1', status: 'DEPOSIT_DUE', depositAmount: '100.00', balanceAmount: '400.00' },
                session: { template: { agencyId: 'agency-123', title: 'Atlas Escape' } },
                traveler: { email: 'traveler@example.com' },
            };
            db.booking.findUnique.mockResolvedValue(stagedBooking);
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.paymentProof.updateMany.mockResolvedValue({ count: 1 });
            db.booking.findUniqueOrThrow.mockResolvedValue({ id: 'booking-123', status: 'PENDING_MINIMUM' });
            mockStagedPaymentsService.applyBankConfirmationInTransaction.mockResolvedValue({
                stage: 'DEPOSIT',
                fullyPaid: false,
                bookingStatus: 'PENDING_MINIMUM',
                planStatus: 'DEPOSIT_PAID',
            });

            const emailService: any = (service as any).emailService;
            await service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 100,
                bankReference: 'BANK-REF-100',
            });

            expect(mockStagedPaymentsService.applyBankConfirmationInTransaction).toHaveBeenCalledTimes(1);
            const confirmArgs = mockStagedPaymentsService.applyBankConfirmationInTransaction.mock.calls[0][1];
            expect(confirmArgs.plan).toEqual(stagedBooking.paymentPlan);
            expect(confirmArgs.confirmedAmount.toString()).toBe('100');
            expect(confirmArgs.bankReference).toBe('BANK-REF-100');
            expect(confirmArgs.bankConfirmedBy).toBe('agency-user-1');
            // A deposit confirmation is not full payment: no email yet.
            expect(emailService.sendPaymentConfirmation).not.toHaveBeenCalled();
        });
    });

    describe('proof != settlement (#422)', () => {
        const reviewBooking = (proofStatus: string) => ({
            id: 'booking-123',
            travelerId: 'user-123',
            status: 'AWAITING_VALIDATION',
            totalAmount: 780,
            currency: 'MAD',
            paymentProofId: 'proof-1',
            paymentProof: { id: 'proof-1', status: proofStatus },
            paymentPlan: null,
            session: { template: { agencyId: 'agency-123', title: 'Atlas Escape' } },
            traveler: { email: 'traveler@example.com' },
        });

        beforeEach(() => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-123' });
            db.paymentProof.updateMany.mockResolvedValue({ count: 1 });
            db.booking.updateMany.mockResolvedValue({ count: 1 });
        });

        it('accepting a proof leaves the booking UNPAID and records no verified payment', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('PENDING'));
            db.booking.findUniqueOrThrow.mockResolvedValue({ id: 'booking-123', status: 'AWAITING_VALIDATION', paymentStatus: 'UNPAID' });

            const result: any = await service.verifyPayment('booking-123', 'agency-123', true);

            expect(db.paymentProof.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: 'ACCEPTED' }),
            }));
            expect(mockExternalPaymentsService.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
            expect(db.booking.updateMany).not.toHaveBeenCalled();
            expect(result.paymentStatus).toBe('UNPAID');
        });

        it('bank confirmation settles a non-staged booking with the confirmed amount and bank reference', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('ACCEPTED'));
            db.booking.findUniqueOrThrow.mockResolvedValue({ id: 'booking-123', status: 'CONFIRMED', paymentStatus: 'PAID' });

            const emailService: any = (service as any).emailService;
            (emailService.sendPaymentConfirmation as jest.Mock).mockResolvedValue(undefined);
            await service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: '780.00',
                bankReference: 'TRX-2026-000123',
            });

            expect(mockExternalPaymentsService.recordPaymentVerifiedInTransaction).toHaveBeenCalledTimes(1);
            const recordInput = mockExternalPaymentsService.recordPaymentVerifiedInTransaction.mock.calls[0][1];
            expect(recordInput.amount.toString()).toBe('780');
            expect(recordInput.bankReference).toBe('TRX-2026-000123');
            expect(recordInput.bankConfirmedBy).toBe('agency-user-1');
            expect(db.booking.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: 'CONFIRMED', paymentStatus: 'PAID' }),
            }));
            expect(emailService.sendPaymentConfirmation).toHaveBeenCalledWith(
                'traveler@example.com',
                'Atlas Escape',
            );
        });

        it('bank confirmation requires the proof to be ACCEPTED first', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('PENDING'));

            await expect(service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 780,
                bankReference: 'TRX-1',
            })).rejects.toThrow('must be accepted before bank confirmation');
            expect(mockExternalPaymentsService.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
        });

        it('bank confirmation requires a bank reference', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('ACCEPTED'));

            await expect(service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 780,
                bankReference: '  ',
            })).rejects.toThrow('bank reference is required');
        });

        it('bank confirmation blocks a short credit (confirmedAmount must equal the expected amount)', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('ACCEPTED'));

            await expect(service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 700,
                bankReference: 'TRX-1',
            })).rejects.toThrow('does not match the expected payment amount');
            expect(mockExternalPaymentsService.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
        });

        it('bank confirmation is agency-scoped: another agency cannot confirm', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('ACCEPTED'));
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-999' });

            await expect(service.confirmBankPayment('booking-123', 'agency-999', 'agency-user-9', {
                confirmedAmount: 780,
                bankReference: 'TRX-1',
            })).rejects.toThrow(ForbiddenException);
        });
    });
});
