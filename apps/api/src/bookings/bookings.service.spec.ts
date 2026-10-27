import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService, bookingIdempotencyPayloadHash } from './bookings.service';
import { DatabaseService } from '../database/database.service';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'node:crypto';
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
    externalPayment: {
        findFirst: jest.fn(),
    },
    duplicateCreditFlag: {
        create: jest.fn(),
        findMany: jest.fn(),
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
            // B9: a complete terms-acceptance record is required for
            // every new booking (flag + allowlisted version + locale).
            termsAccepted: true,
            termsVersion: '1.0',
            locale: 'en',
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
                    travelLicenceStatus: 'VERIFIED',
                    licenceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    insuranceStatus: 'VERIFIED',
                    insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
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

        it('rejects new bookings when the agency licence is not effectively verified (#415)', async () => {
            db.tripSession.findUnique.mockResolvedValue({
                ...availableSession,
                template: {
                    ...availableSession.template,
                    agency: {
                        ...availableSession.template.agency,
                        travelLicenceStatus: 'PENDING_REVIEW',
                    },
                },
            });

            await expect(service.create('user-123', createDto)).rejects.toThrow(
                'This agency is not currently accepting bookings',
            );
            expect(db.$transaction).not.toHaveBeenCalled();
        });

        it('rejects new bookings when the agency licence has expired (#415)', async () => {
            db.tripSession.findUnique.mockResolvedValue({
                ...availableSession,
                template: {
                    ...availableSession.template,
                    agency: {
                        ...availableSession.template.agency,
                        licenceExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
            });

            await expect(service.create('user-123', createDto)).rejects.toThrow(
                'This agency is not currently accepting bookings',
            );
            expect(db.$transaction).not.toHaveBeenCalled();
        });

        it('rejects new bookings when the agency has no verified RC insurance on file (#415)', async () => {
            db.tripSession.findUnique.mockResolvedValue({
                ...availableSession,
                template: {
                    ...availableSession.template,
                    agency: {
                        ...availableSession.template.agency,
                        insuranceStatus: 'NOT_SUBMITTED',
                        insuranceExpiry: null,
                    },
                },
            });

            await expect(service.create('user-123', createDto)).rejects.toThrow(
                'This agency is not currently accepting bookings',
            );
            expect(db.$transaction).not.toHaveBeenCalled();
        });

        it('rejects new bookings when the agency RC insurance has expired (#415)', async () => {
            db.tripSession.findUnique.mockResolvedValue({
                ...availableSession,
                template: {
                    ...availableSession.template,
                    agency: {
                        ...availableSession.template.agency,
                        insuranceExpiry: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
            });

            await expect(service.create('user-123', createDto)).rejects.toThrow(
                'This agency is not currently accepting bookings',
            );
            expect(db.$transaction).not.toHaveBeenCalled();
        });

        // B24(f) / #498: the MAD-only beta catalogue gate is enforced at
        // booking creation, not just in the listing UI.
        describe('MAD-only beta catalogue gate (B24(f) / #498)', () => {
            const eurSession = {
                ...availableSession,
                currency: 'EUR',
                template: { ...availableSession.template, currency: 'EUR' },
            };

            afterEach(() => {
                delete process.env.MAD_ONLY_CATALOG;
            });

            it('rejects a non-MAD booking while the gate is on (default posture)', async () => {
                delete process.env.MAD_ONLY_CATALOG;
                db.tripSession.findUnique.mockResolvedValue(eurSession);

                await expect(service.create('user-123', createDto)).rejects.toThrow(
                    'This trip is not available for booking yet',
                );
                expect(db.$transaction).not.toHaveBeenCalled();
                expect(db.booking.create).not.toHaveBeenCalled();
            });

            it('rejects a non-MAD booking when only the template carries the currency', async () => {
                delete process.env.MAD_ONLY_CATALOG;
                const { currency: _sessionCurrency, ...sessionWithoutCurrency } = eurSession;
                db.tripSession.findUnique.mockResolvedValue(sessionWithoutCurrency);

                await expect(service.create('user-123', createDto)).rejects.toThrow(
                    'This trip is not available for booking yet',
                );
            });

            it('allows a non-MAD booking when MAD_ONLY_CATALOG=false (deliberate opt-out)', async () => {
                process.env.MAD_ONLY_CATALOG = 'false';
                mockSuccessfulCreate();
                db.tripSession.findUnique.mockResolvedValue(eurSession);

                const result: any = await service.create('user-123', createDto);
                expect(result.id).toBe('booking-new');
            });
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

        // CIN removal (founder decision 2026-10-25): bookings are created
        // with name + phone only; no identity-document number is collected
        // or stored anywhere in the create path.
        const mockSuccessfulCreate = () => {
            db.tripSession.findUnique.mockResolvedValue(availableSession);
            db.tripSession.updateMany.mockResolvedValue({ count: 1 });
            db.booking.findFirst.mockResolvedValue(null);
            db.user.findUnique.mockResolvedValue(null);
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
        };

        it('creates a booking without any identity-document number (CIN removal)', async () => {
            mockSuccessfulCreate();

            const result: any = await service.create('user-123', createDto);

            expect(result.id).toBe('booking-new');
            expect(result).not.toHaveProperty('documentNumber');
            const createData = db.booking.create.mock.calls[0][0].data;
            expect(createData).not.toHaveProperty('documentNumber');
        });

        it('never persists a document number even if one reaches the service (CIN removal)', async () => {
            mockSuccessfulCreate();

            await service.create('user-123', {
                ...createDto,
                documentNumber: 'AB123456',
            } as any);

            const createData = db.booking.create.mock.calls[0][0].data;
            expect(createData).not.toHaveProperty('documentNumber');
            expect(JSON.stringify(createData)).not.toContain('AB123456');
        });

        it('persists the checkout locale for booking-journey emails (#424)', async () => {
            mockSuccessfulCreate();

            await service.create('user-123', { ...createDto, locale: 'fr' });

            const createData = db.booking.create.mock.calls[0][0].data;
            expect(createData.locale).toBe('fr');
        });

        it('rejects a booking without a locale — the acceptance record must be complete (B9)', async () => {
            mockSuccessfulCreate();

            const { locale: _omitted, ...withoutLocale } = createDto;
            await expect(service.create('user-123', withoutLocale as any)).rejects.toThrow(
                'locale is required',
            );
            expect(db.booking.create).not.toHaveBeenCalled();
        });

        it('rejects a booking with an unsupported locale (B9)', async () => {
            mockSuccessfulCreate();

            await expect(service.create('user-123', { ...createDto, locale: 'de' } as any)).rejects.toThrow(
                'locale is required',
            );
            expect(db.booking.create).not.toHaveBeenCalled();
        });

        it('persists the accepted terms version with a server timestamp (#481)', async () => {
            mockSuccessfulCreate();

            const before = Date.now();
            await service.create('user-123', { ...createDto, termsVersion: '1.0' });

            const createData = db.booking.create.mock.calls[0][0].data;
            expect(createData.termsVersion).toBe('1.0');
            expect(createData.termsAcceptedAt).toBeInstanceOf(Date);
            expect(createData.termsAcceptedAt.getTime()).toBeGreaterThanOrEqual(before);
            expect(createData.termsAcceptedAt.getTime()).toBeLessThanOrEqual(Date.now());
        });

        it('rejects a booking whose terms were not explicitly accepted (B9)', async () => {
            mockSuccessfulCreate();

            const { termsAccepted: _omitted, ...withoutFlag } = createDto;
            await expect(service.create('user-123', withoutFlag as any)).rejects.toThrow(
                'The booking terms must be accepted to complete a booking',
            );
            await expect(service.create('user-123', { ...createDto, termsAccepted: false })).rejects.toThrow(
                'The booking terms must be accepted to complete a booking',
            );
            expect(db.booking.create).not.toHaveBeenCalled();
        });

        it('rejects a booking without a terms version (B9)', async () => {
            mockSuccessfulCreate();

            const { termsVersion: _omitted, ...withoutVersion } = createDto;
            await expect(service.create('user-123', withoutVersion as any)).rejects.toThrow(
                'Unknown booking terms version',
            );
            expect(db.booking.create).not.toHaveBeenCalled();
        });

        it('rejects a booking under an unknown terms version — the allowlist is the current version only (B9)', async () => {
            mockSuccessfulCreate();

            await expect(service.create('user-123', { ...createDto, termsVersion: '9.9' })).rejects.toThrow(
                'Unknown booking terms version',
            );
            expect(db.booking.create).not.toHaveBeenCalled();
        });

        it('snapshots the platform default cancellation scale onto the booking (#417)', async () => {
            mockSuccessfulCreate();

            const result: any = await service.create('user-123', createDto);

            const createData = db.booking.create.mock.calls[0][0].data;
            expect(createData.cancellationScale.version).toBe('cancellation-v1');
            expect(createData.cancellationScale.floorRefundPercent).toBe(100);
            expect(createData.cancellationScale.refundInitiationDays).toBe(7);
            expect(createData.cancellationScale.bands[0]).toEqual({
                minDaysBeforeStart: 30,
                refundPercent: 100,
            });
            // The mapped response repeats the scale (booking confirmation).
            expect(result.cancellationScale.bands).toEqual(createData.cancellationScale.bands);
        });

        it('snapshots the agency bands when the trip defines its own scale (#417)', async () => {
            db.tripSession.findUnique.mockResolvedValue({
                ...availableSession,
                template: {
                    ...availableSession.template,
                    cancellationPolicy: {
                        version: 'cancellation-v1',
                        bands: [
                            { minDaysBeforeStart: 14, refundPercent: 80 },
                            { minDaysBeforeStart: 0, refundPercent: 10 },
                        ],
                    },
                },
            });
            db.tripSession.updateMany.mockResolvedValue({ count: 1 });
            db.booking.findFirst.mockResolvedValue(null);
            db.user.findUnique.mockResolvedValue(null);
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

            await service.create('user-123', createDto);

            const createData = db.booking.create.mock.calls[0][0].data;
            expect(createData.cancellationScale.bands).toEqual([
                { minDaysBeforeStart: 14, refundPercent: 80 },
                { minDaysBeforeStart: 0, refundPercent: 10 },
            ]);
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
                    // #494: the stored proof is loaded for the
                    // idempotency replay check.
                    paymentProof: true,
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
            // B9: complete terms-acceptance record (see the create suite).
            termsAccepted: true,
            termsVersion: '1.0',
            locale: 'en',
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
                    travelLicenceStatus: 'VERIFIED',
                    licenceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    insuranceStatus: 'VERIFIED',
                    insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
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
                // #424: the booking's recorded checkout locale (unset in
                // these fixtures) is passed through for email rendering.
                undefined,
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

        it('bank confirmation rejects an unknown booking', async () => {
            db.booking.findUnique.mockResolvedValue(null);

            await expect(service.confirmBankPayment('booking-x', 'agency-123', 'agency-user-1', {
                confirmedAmount: 780,
                bankReference: 'TRX-1',
            })).rejects.toThrow('Booking not found');
        });

        it('bank confirmation requires the confirmed amount', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('ACCEPTED'));

            await expect(service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                bankReference: 'TRX-1',
            })).rejects.toThrow('confirmedAmount is required');
        });

        it('bank confirmation refuses a plan that is not awaiting a stage payment', async () => {
            const booking = reviewBooking('ACCEPTED');
            (booking as any).paymentPlan = { id: 'plan-1', status: 'FULLY_PAID', depositAmount: '100.00', balanceAmount: '400.00' };
            db.booking.findUnique.mockResolvedValue(booking);

            await expect(service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 400,
                bankReference: 'TRX-1',
            })).rejects.toThrow('not awaiting a staged payment');
        });

        it('bank-confirming a staged BALANCE fully pays and sends the payment email', async () => {
            const booking = reviewBooking('ACCEPTED');
            (booking as any).paymentPlan = { id: 'plan-1', status: 'BALANCE_DUE', depositAmount: '100.00', balanceAmount: '400.00' };
            db.booking.findUnique.mockResolvedValue(booking);
            db.booking.findUniqueOrThrow.mockResolvedValue({ id: 'booking-123', status: 'CONFIRMED', paymentStatus: 'PAID' });
            mockStagedPaymentsService.applyBankConfirmationInTransaction.mockResolvedValue({
                stage: 'BALANCE',
                fullyPaid: true,
                bookingStatus: 'CONFIRMED',
                planStatus: 'FULLY_PAID',
            });

            const emailService: any = (service as any).emailService;
            (emailService.sendPaymentConfirmation as jest.Mock).mockResolvedValue(undefined);
            await service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 400,
                bankReference: 'TRX-BALANCE',
            });

            const confirmArgs = mockStagedPaymentsService.applyBankConfirmationInTransaction.mock.calls[0][1];
            expect(confirmArgs.confirmedAmount.toString()).toBe('400');
            expect(confirmArgs.bankReference).toBe('TRX-BALANCE');
            expect(emailService.sendPaymentConfirmation).toHaveBeenCalledWith(
                'traveler@example.com',
                'Atlas Escape',
                // #424: the booking's recorded checkout locale (unset in
                // these fixtures) is passed through for email rendering.
                undefined,
            );
        });

        it('uploading a staged deposit proof records the DEPOSIT stage as pending (#422)', async () => {
            db.booking.findUnique.mockResolvedValue({
                id: 'booking-123',
                travelerId: 'user-123',
                status: 'PENDING',
                bookingDate: new Date(),
                session: { groupStatus: 'PENDING_MINIMUM', template: { agencyId: 'agency-123' } },
                paymentPlan: { status: 'DEPOSIT_DUE', depositAmount: '100.00', balanceAmount: '400.00' },
            });
            db.paymentProof.upsert.mockResolvedValue({ id: 'proof-dep' });
            db.booking.update.mockResolvedValue({});
            uploadService.uploadFile.mockResolvedValue({
                url: 'http://upload.url',
                filename: 'payment-proofs/booking-123/deposit.png',
                size: 100,
            });

            await service.uploadPaymentProof('booking-123', 'user-123', {
                originalname: 'deposit.png',
                mimetype: 'image/png',
                size: 100,
                buffer: Buffer.from('file'),
            } as Express.Multer.File);

            const pendingInput = mockExternalPaymentsService.recordPaymentPendingInTransaction.mock.calls[0][1];
            expect(pendingInput).toEqual(expect.objectContaining({
                bookingId: 'booking-123',
                stage: 'DEPOSIT',
                amount: '100.00',
            }));
        });

        it('verifyPayment validates its inputs and review state', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('PENDING'));
            await expect(service.verifyPayment('booking-123', 'agency-123', 'yes' as any)).rejects.toThrow('approved must be a boolean');
            await expect(service.verifyPayment('booking-123', 'agency-123', false)).rejects.toThrow('Rejection reason is required');

            db.booking.findUnique.mockResolvedValue(reviewBooking('ACCEPTED'));
            await expect(service.verifyPayment('booking-123', 'agency-123', true)).rejects.toThrow('already been reviewed');

            const notAwaiting = { ...reviewBooking('PENDING'), status: 'CONFIRMED' };
            db.booking.findUnique.mockResolvedValue(notAwaiting);
            await expect(service.verifyPayment('booking-123', 'agency-123', true)).rejects.toThrow('not awaiting payment validation');

            db.booking.findUnique.mockResolvedValue(null);
            await expect(service.verifyPayment('booking-123', 'agency-123', true)).rejects.toThrow('Booking not found');
        });

        it('rejecting a non-staged proof records the rejection and fails the booking (one step)', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('PENDING'));
            db.booking.findUniqueOrThrow.mockResolvedValue({ id: 'booking-123', status: 'REJECTED', paymentStatus: 'FAILED' });

            const result: any = await service.verifyPayment('booking-123', 'agency-123', false, 'Bank details do not match');

            expect(mockExternalPaymentsService.recordPaymentRejectedInTransaction).toHaveBeenCalledTimes(1);
            expect(mockExternalPaymentsService.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
            expect(db.booking.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: 'REJECTED', paymentStatus: 'FAILED' }),
            }));
            expect(result.status).toBe('REJECTED');
        });

        it('bank confirmation validates the amount shape and the in-transaction proof claim', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('ACCEPTED'));
            await expect(service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 'not-a-number',
                bankReference: 'TRX-1',
            })).rejects.toThrow('must be a positive decimal value');
            await expect(service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 0,
                bankReference: 'TRX-1',
            })).rejects.toThrow('positive amount');

            // The ACCEPTED -> VERIFIED claim is the concurrency guard: if
            // another confirmation won the race, this one must fail.
            db.paymentProof.updateMany.mockResolvedValueOnce({ count: 0 });
            await expect(service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 780,
                bankReference: 'TRX-1',
            })).rejects.toThrow('must be accepted before bank confirmation');
            expect(mockExternalPaymentsService.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
        });

        it('bank confirmation rejects a non-string bank reference', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('ACCEPTED'));

            // The DTO fields are deliberately untyped at this boundary: a
            // JSON number is not a bank reference and must not be coerced
            // into one.
            await expect(service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 780,
                bankReference: 12345678,
            })).rejects.toThrow('bank reference is required');
            expect(mockExternalPaymentsService.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
        });

        it('bank confirmation refuses a booking that is no longer awaiting validation', async () => {
            // The proof was accepted, but the booking has since moved on
            // (confirmed or cancelled through another path): settlement
            // must not run a second time.
            const booking = { ...reviewBooking('ACCEPTED'), status: 'CONFIRMED' };
            db.booking.findUnique.mockResolvedValue(booking);

            await expect(service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 780,
                bankReference: 'TRX-1',
            })).rejects.toThrow('Booking is not awaiting payment validation');
            expect(db.$transaction).not.toHaveBeenCalled();
            expect(mockExternalPaymentsService.recordPaymentVerifiedInTransaction).not.toHaveBeenCalled();
        });

        it('bank confirmation fails when the in-transaction booking claim loses the race', async () => {
            db.booking.findUnique.mockResolvedValue(reviewBooking('ACCEPTED'));
            // The proof claim succeeds, but a concurrent confirmation
            // settled the booking first: the AWAITING_VALIDATION claim
            // matches nothing, so the transaction must fail (and roll
            // back) instead of settling twice.
            db.booking.updateMany.mockResolvedValue({ count: 0 });

            await expect(service.confirmBankPayment('booking-123', 'agency-123', 'agency-user-1', {
                confirmedAmount: 780,
                bankReference: 'TRX-1',
            })).rejects.toThrow('Booking is not awaiting payment validation');
            expect(mockExternalPaymentsService.recordPaymentVerifiedInTransaction).toHaveBeenCalledTimes(1);
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

    describe('idempotency (#494)', () => {
        const createDto = {
            sessionId: 'session-123',
            guestsCount: 2,
            fullName: 'Test Traveler',
            phoneNumber: '+212600000000',
            termsAccepted: true,
            termsVersion: '1.0',
            locale: 'en',
        };

        // A stored booking row in the replay lookup's shape.
        const storedBookingRow = (overrides: Record<string, unknown> = {}) => ({
            id: 'booking-original',
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
            paymentProof: null,
            review: null,
            idempotencyKey: 'attempt-key-1',
            idempotencyPayloadHash: bookingIdempotencyPayloadHash(createDto as never),
            traveler: { email: 'traveler@example.com', name: 'Test Traveler' },
            session: {
                id: 'session-123',
                templateId: 'template-1',
                startDate: new Date(),
                endDate: new Date(),
                price: '250.00',
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
            ...overrides,
        });

        it('replay with the same key returns the original booking without creating anything', async () => {
            db.booking.findFirst.mockResolvedValue(storedBookingRow());

            const result = await service.create('user-123', createDto as never, 'attempt-key-1');

            expect(result.id).toBe('booking-original');
            expect(db.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: { travelerId: 'user-123', idempotencyKey: 'attempt-key-1' },
            }));
            expect(db.$transaction).not.toHaveBeenCalled();
            expect(db.booking.create).not.toHaveBeenCalled();
            expect(db.tripSession.findUnique).not.toHaveBeenCalled();
        });

        it('replay with the same key but a different payload is a 409', async () => {
            db.booking.findFirst.mockResolvedValue(storedBookingRow());

            await expect(service.create('user-123', {
                ...createDto,
                guestsCount: 5,
            } as never, 'attempt-key-1')).rejects.toThrow(ConflictException);
            expect(db.booking.create).not.toHaveBeenCalled();
        });

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
                    travelLicenceStatus: 'VERIFIED',
                    licenceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    insuranceStatus: 'VERIFIED',
                    insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    subscriptionStatus: 'TRIAL',
                    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    subscriptionEndsAt: null,
                },
            },
        };

        it('a fresh key is persisted on the created booking with its payload hash', async () => {
            db.booking.findFirst.mockResolvedValue(null);
            db.tripSession.findUnique.mockResolvedValue(availableSession);
            db.tripSession.updateMany.mockResolvedValue({ count: 1 });
            db.user.findUnique.mockResolvedValue(null);
            db.booking.create.mockResolvedValue(storedBookingRow({ id: 'booking-new' }));

            const result = await service.create('user-123', createDto as never, 'attempt-key-1');

            expect(result.id).toBe('booking-new');
            const createData = db.booking.create.mock.calls[0][0].data;
            expect(createData.idempotencyKey).toBe('attempt-key-1');
            expect(createData.idempotencyPayloadHash).toBe(bookingIdempotencyPayloadHash(createDto as never));
        });

        it('a lost race on the unique index returns the winning booking', async () => {
            // Pre-check: no booking yet. In-transaction duplicate guard:
            // none either. The create itself loses the unique race; the
            // post-catch lookup finds the winner.
            let findFirstCalls = 0;
            db.booking.findFirst.mockImplementation(async () => {
                findFirstCalls += 1;
                return findFirstCalls >= 3 ? storedBookingRow() : null;
            });
            db.tripSession.findUnique.mockResolvedValue(availableSession);
            db.tripSession.updateMany.mockResolvedValue({ count: 1 });
            db.booking.create.mockRejectedValue({
                code: 'P2002',
                meta: { target: ['travelerId', 'idempotencyKey'] },
            });

            const result = await service.create('user-123', createDto as never, 'attempt-key-1');

            expect(result.id).toBe('booking-original');
        });

        it('proof replay with the same key and file returns the stored proof untouched', async () => {
            const fileHash = createHash('sha256').update(Buffer.from('file')).digest('hex');
            db.booking.findUnique.mockResolvedValue({
                ...mockBooking,
                paymentPlan: null,
                paymentProof: {
                    id: 'proof-123',
                    bookingId: 'booking-123',
                    imageUrl: 'payment-proofs/booking-123/proof.png',
                    uploadedAt: new Date(),
                    status: 'PENDING',
                    rejectionReason: null,
                    idempotencyKey: 'proof-key-1',
                    idempotencyPayloadHash: fileHash,
                },
            });

            const result = await service.uploadPaymentProof('booking-123', 'user-123', {
                originalname: 'proof.png',
                mimetype: 'image/png',
                size: 4,
                buffer: Buffer.from('file'),
            } as Express.Multer.File, 'proof-key-1');

            expect(result.id).toBe('proof-123');
            expect(uploadService.uploadFile).not.toHaveBeenCalled();
            expect(db.paymentProof.upsert).not.toHaveBeenCalled();
            expect(mockExternalPaymentsService.recordPaymentPendingInTransaction).not.toHaveBeenCalled();
        });

        it('proof replay with the same key but a different file is a 409', async () => {
            db.booking.findUnique.mockResolvedValue({
                ...mockBooking,
                paymentPlan: null,
                paymentProof: {
                    id: 'proof-123',
                    bookingId: 'booking-123',
                    imageUrl: 'payment-proofs/booking-123/proof.png',
                    uploadedAt: new Date(),
                    status: 'PENDING',
                    rejectionReason: null,
                    idempotencyKey: 'proof-key-1',
                    idempotencyPayloadHash: createHash('sha256').update(Buffer.from('file')).digest('hex'),
                },
            });

            await expect(service.uploadPaymentProof('booking-123', 'user-123', {
                originalname: 'other.png',
                mimetype: 'image/png',
                size: 5,
                buffer: Buffer.from('other'),
            } as Express.Multer.File, 'proof-key-1')).rejects.toThrow(ConflictException);
            expect(uploadService.uploadFile).not.toHaveBeenCalled();
        });
    });

    describe('duplicate-credit flags (#494)', () => {
        const flagBooking = {
            id: 'booking-123',
            currency: 'MAD',
            session: { template: { agencyId: 'agency-123' } },
        };

        it('the owning agency can flag a duplicate credit; the flag links the recorded payment', async () => {
            db.booking.findUnique.mockResolvedValue(flagBooking);
            db.externalPayment.findFirst.mockResolvedValue({ id: 'payment-1' });
            db.duplicateCreditFlag.create.mockImplementation(async ({ data }: never) => ({
                id: 'flag-1',
                createdAt: new Date(),
                updatedAt: new Date(),
                resolvedBy: null,
                resolvedAt: null,
                resolutionNote: null,
                status: 'OPEN',
                ...(data as object),
            }));

            const result = await service.createDuplicateCreditFlag('booking-123', 'agency-123', 'agency-user-1', {
                amount: 200,
                bankReference: 'DUP-REF-1',
            });

            expect(result.id).toBe('flag-1');
            expect(result.status).toBe('OPEN');
            expect(result.amount).toBe('200.00');
            const createData = db.duplicateCreditFlag.create.mock.calls[0][0].data;
            expect(createData.agencyId).toBe('agency-123');
            expect(createData.externalPaymentId).toBe('payment-1');
            expect(createData.bankReference).toBe('DUP-REF-1');
        });

        it('another agency cannot flag a duplicate credit on this booking', async () => {
            db.booking.findUnique.mockResolvedValue(flagBooking);

            await expect(service.createDuplicateCreditFlag('booking-123', 'agency-999', 'agency-user-9', {
                amount: 200,
            })).rejects.toThrow(ForbiddenException);
            expect(db.duplicateCreditFlag.create).not.toHaveBeenCalled();
        });

        it('a non-positive amount is rejected', async () => {
            db.booking.findUnique.mockResolvedValue(flagBooking);

            await expect(service.createDuplicateCreditFlag('booking-123', 'agency-123', 'agency-user-1', {
                amount: 0,
            })).rejects.toThrow(BadRequestException);
            expect(db.duplicateCreditFlag.create).not.toHaveBeenCalled();
        });
    });

    // ------------------------------------------------------------------
    // Trip emergency contacts gating (#251/B23, verifying #419).
    //
    // AgencyProfile.emergencyContactName/Phone carry a schema comment
    // saying they are "shown only to travellers holding a booking with
    // this agency, never publicly". The only read path that embeds them
    // in a response is mapBookingDetails, and findOneForUser is its
    // gatekeeper — these tests pin that the gate is a real server-side
    // check (booked traveller / owning agency / admin), not just the
    // comment.
    // ------------------------------------------------------------------
    describe('findOneForUser trip contacts gating (#251/B23)', () => {
        const contactBooking = {
            id: 'booking-contacts',
            sessionId: 'session-1',
            travelerId: 'traveler-1',
            bookingDate: new Date('2026-01-01T00:00:00.000Z'),
            status: 'CONFIRMED',
            totalAmount: 1200,
            guestsCount: 2,
            paymentMethod: 'MANUAL',
            paymentStatus: 'PAID',
            paymentProof: null,
            paymentPlan: null,
            externalPayments: [],
            review: null,
            traveler: { email: 'traveler@example.com', name: 'Booked Traveller' },
            session: {
                id: 'session-1',
                templateId: 'template-1',
                startDate: new Date('2026-02-01T00:00:00.000Z'),
                endDate: new Date('2026-02-05T00:00:00.000Z'),
                price: 600,
                deposit: 100,
                totalSeats: 12,
                availableSeats: 10,
                status: 'OPEN',
                template: {
                    id: 'template-1',
                    title: 'Atlas Trek',
                    startLocation: 'Marrakech',
                    images: ['cover.jpg'],
                    agencyId: 'agency-1',
                    agency: {
                        id: 'agency-1',
                        companyName: 'Atlas Adventures',
                        emergencyContactName: 'Yasmine Coordinator',
                        emergencyContactPhone: '+212612345678',
                    },
                },
            },
        } as any;

        beforeEach(() => {
            db.booking.findUnique.mockResolvedValue(contactBooking);
        });

        it('serves the contacts to the traveller holding the booking', async () => {
            db.agencyProfile.findUnique.mockResolvedValue(null);

            const result = await service.findOneForUser('booking-contacts', 'traveler-1', 'TRAVELER');

            expect(result.session.template.agency).toMatchObject({
                emergencyContactName: 'Yasmine Coordinator',
                emergencyContactPhone: '+212612345678',
            });
        });

        it('denies a traveller who holds no booking on the trip', async () => {
            db.agencyProfile.findUnique.mockResolvedValue(null);

            await expect(
                service.findOneForUser('booking-contacts', 'traveler-2', 'TRAVELER'),
            ).rejects.toThrow(ForbiddenException);
        });

        it('serves the contacts to the agency that owns the trip', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-1' });

            const result = await service.findOneForUser('booking-contacts', 'agency-user-1', 'AGENCY');

            expect(result.session.template.agency).toMatchObject({
                emergencyContactPhone: '+212612345678',
            });
        });

        it('denies a foreign agency', async () => {
            db.agencyProfile.findUnique.mockResolvedValue({ id: 'agency-2' });

            await expect(
                service.findOneForUser('booking-contacts', 'agency-user-2', 'AGENCY'),
            ).rejects.toThrow(ForbiddenException);
        });

        it('serves the contacts to an admin', async () => {
            db.agencyProfile.findUnique.mockResolvedValue(null);

            const result = await service.findOneForUser('booking-contacts', 'admin-1', 'ADMIN');

            expect(result.session.template.agency).toMatchObject({
                emergencyContactPhone: '+212612345678',
            });
        });
    });
});
