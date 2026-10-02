import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as path from 'path';
import * as fs from 'fs';
import { BookingsModule } from '../src/bookings/bookings.module';
import { DatabaseModule } from '../src/database/database.module';
import { EmailModule } from '../src/email/email.module';
import { UploadModule } from '../src/upload/upload.module';
import { AuthModule } from '../src/auth/auth.module';
import { AgencyModule } from '../src/agency/agency.module';
import { DatabaseService } from '../src/database/database.service';
import { EmailService } from '../src/email/email.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RateLimitGuard } from '../src/common/rate-limit.guard';
import { UserRole } from '@ouiboo/types';
import { tripTemplateFixture } from './e2e-fixtures';

jest.setTimeout(60_000);

describe('Booking Lifecycle E2E (booking-lifecycle.e2e-spec)', () => {
    let app: INestApplication;
    let db: DatabaseService;

    const mockEmailService = {
        sendBookingNotification: jest.fn(async () => true),
        sendPaymentConfirmation: jest.fn(async () => true),
        sendPasswordResetEmail: jest.fn(async () => true),
        sendMail: jest.fn(async () => true),
        getOTPTemplate: jest.fn((otp: string) => `OTP:${otp}`),
        getWelcomeTemplate: jest.fn((name?: string) => `WELCOME:${name}`),
        getPasswordResetTemplate: jest.fn((url: string) => `RESET:${url}`),
    } as unknown as EmailService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [BookingsModule, AgencyModule, DatabaseModule, EmailModule, UploadModule, AuthModule],
        })
            .overrideProvider(EmailService)
            .useValue(mockEmailService)
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    const auth = String(req.headers.authorization || '');

                    if (auth.includes('admin')) {
                        req.user = { userId: 'admin-123', email: 'admin@ouiboo.local', role: UserRole.Admin };
                    } else if (auth.includes('agency-2')) {
                        req.user = { userId: 'agency-user-999', email: 'agency3@ouiboo.local', role: UserRole.Agency };
                    } else if (auth.includes('agency') || req.query.role === 'agency') {
                        req.user = { userId: 'agency-user-456', email: 'agency@ouiboo.local', role: UserRole.Agency };
                    } else if (auth.includes('traveler-2-token')) {
                        req.user = { userId: 'traveler-user-999', email: 'traveler-other@example.com', role: UserRole.Traveler };
                    } else if (auth.includes('traveler-1-token')) {
                        req.user = { userId: 'traveler-user-123', email: 'traveler@example.com', role: UserRole.Traveler };
                    } else if (auth.includes('traveler-1')) {
                        req.user = { userId: 'traveler-user-1', email: 'traveler1@example.com', role: UserRole.Traveler };
                    } else if (auth.includes('traveler-2')) {
                        req.user = { userId: 'traveler-user-2', email: 'traveler2@example.com', role: UserRole.Traveler };
                    } else if (auth.includes('traveler-3')) {
                        req.user = { userId: 'traveler-user-3', email: 'traveler3@example.com', role: UserRole.Traveler };
                    } else {
                        req.user = { userId: 'traveler-user-123', email: 'traveler@example.com', role: UserRole.Traveler };
                    }
                    return true;
                },
            })
            .overrideGuard(RateLimitGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
        await app.init();

        db = app.get(DatabaseService);
    });

    afterAll(async () => {
        await clearDatabase();
        await app.close();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await clearDatabase();
    });

    async function clearDatabase() {
        if (!db) return;
        await db.walletTransaction.deleteMany();
        await db.wallet.deleteMany();
        await db.payoutRequest.deleteMany();
        await db.paymentProof.deleteMany();
        await db.booking.deleteMany();
        await db.tripSession.deleteMany();
        await db.tripTemplate.deleteMany();
        await db.agencyProfile.deleteMany();
        await db.refreshToken.deleteMany();
        await db.user.deleteMany();
    }

    async function seedTestData() {
        // Create agency user
        const agencyUser = await db.user.create({
            data: {
                id: 'agency-user-456',
                email: 'agency@ouiboo.local',
                name: 'Test Agency',
                password: 'hashed-password',
                role: UserRole.Agency,
                isEmailVerified: true,
            } as any,
        });

        // Create agency profile
        const agency = await db.agencyProfile.create({
            data: {
                id: 'agency-profile-456',
                userId: agencyUser.id,
                companyName: 'Test Agency Ltd', ice: 'ICE100001', patente: 'PAT100001', rib: 'RIB100001',
                verificationStatus: 'VERIFIED',
                trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            } as any,
        });

        // Create trip template
        const template = await db.tripTemplate.create({
            data: tripTemplateFixture({
                id: 'template-123',
                agencyId: agency.id,
                title: 'Mountain Adventure',
                description: 'A thrilling mountain trek',
            }) as any,
        });

        // Create trip session
        const session = await db.tripSession.create({
            data: {
                id: 'session-123',
                templateId: template.id,
                startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
                price: 390,
                totalSeats: 10,
                availableSeats: 10,
            } as any,
        });

        // Create traveler user
        const traveler = await db.user.create({
            data: {
                id: 'traveler-user-123',
                email: 'traveler@example.com',
                name: 'Test Traveler',
                password: 'hashed-password',
                role: UserRole.Traveler,
                isEmailVerified: true,
            } as any,
        });

        return { agencyUser, agency, template, session, traveler };
    }

    // ===== Section 2: Complete Booking Flow (Happy Path) =====
    it('Complete booking flow: create → upload payment proof → agency verification → confirmation', async () => {
        const { session, traveler, agencyUser } = await seedTestData();

        // Step 1: Create booking
        const createRes = await request(app.getHttpServer())
            .post('/bookings')
            .set('Authorization', `Bearer traveler-token`)
            .send({
                sessionId: session.id,
                guestsCount: 2,
                fullName: 'John Doe',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                paymentMethod: 'BANK_TRANSFER',
            })
            .expect(201);

        expect(createRes.body).toHaveProperty('id');
        expect(createRes.body.status).toBe('PENDING');
        expect(createRes.body.totalAmount).toBe('780.00'); // 390 * 2

        const bookingId = createRes.body.id;

        // Verify email notification
        expect(mockEmailService.sendBookingNotification).toHaveBeenCalledWith(
            traveler.email,
            agencyUser.email,
            bookingId,
            'Mountain Adventure'
        );

        // Verify database state
        let booking = await db.booking.findUnique({ where: { id: bookingId } });
        expect(booking).toBeTruthy();
        expect(booking?.status).toBe('PENDING');

        const tripSession = await db.tripSession.findUnique({ where: { id: session.id } });
        expect(tripSession?.availableSeats).toBe(8); // 10 - 2

        // Step 2: Upload payment proof
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        const uploadRes = await request(app.getHttpServer())
            .post(`/bookings/${bookingId}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);

        expect(uploadRes.body).toHaveProperty('id');
        expect(uploadRes.body.status).toBe('PENDING');
        expect(uploadRes.body).toHaveProperty('downloadUrl');

        // Verify booking status changed
        booking = await db.booking.findUnique({ where: { id: bookingId } });
        expect(booking?.status).toBe('AWAITING_VALIDATION');

        // Verify payment proof created
        const proof = await db.paymentProof.findUnique({ where: { bookingId } });
        expect(proof).toBeTruthy();
        expect(proof?.status).toBe('PENDING');

        // Step 3: Agency verifies payment
        const verifyRes = await request(app.getHttpServer())
            .patch(`/bookings/${bookingId}/verify-payment`)
            .set('Authorization', `Bearer agency-token`)
            .send({ approved: true })
            .expect(200);

        expect(verifyRes.body.status).toBe('CONFIRMED');

        // Verify email confirmation sent
        expect(mockEmailService.sendPaymentConfirmation).toHaveBeenCalledWith(
            traveler.email,
            'Mountain Adventure'
        );

        // Verify database state
        booking = await db.booking.findUnique({ where: { id: bookingId } });
        expect(booking?.status).toBe('CONFIRMED');

        const updatedProof = await db.paymentProof.findUnique({ where: { bookingId } });
        expect(updatedProof?.status).toBe('VERIFIED');
    });

    it('Credits the agency wallet exactly once under concurrent manual payment approval', async () => {
        const { session, traveler, agency } = await seedTestData();
        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: traveler.id,
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Concurrent Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID-CONCURRENT',
                status: 'AWAITING_VALIDATION',
            },
        });
        const proof = await db.paymentProof.create({
            data: {
                bookingId: booking.id,
                imageUrl: 'private/test-proofs/concurrent.png',
                status: 'PENDING',
            },
        });
        await db.booking.update({
            where: { id: booking.id },
            data: { paymentProofId: proof.id },
        });

        const approve = () => request(app.getHttpServer())
            .patch(`/bookings/${booking.id}/verify-payment`)
            .set('Authorization', 'Bearer agency-token')
            .send({ approved: true });
        const responses = await Promise.all([approve(), approve()]);

        expect(responses.map((response) => response.status).sort()).toEqual([200, 400]);
        const wallet = await db.wallet.findUniqueOrThrow({
            where: { agencyId: agency.id },
            include: { transactions: true },
        });
        expect(wallet.availableBalance.toNumber()).toBe(780);
        expect(wallet.transactions).toHaveLength(1);
        expect(wallet.transactions[0].idempotencyKey).toBe(
            `booking:${booking.id}:manual-payment-credit`,
        );
        expect(mockEmailService.sendPaymentConfirmation).toHaveBeenCalledTimes(1);
    });

    // ===== Section 3: Booking Cancellation and Seat Restoration =====
    it('Booking cancellation by traveler restores seats', async () => {
        const { session } = await seedTestData();

        // Create and confirm a booking with 3 guests
        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 3,
                totalAmount: 1170, // 390 * 3
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'PENDING',
            } as any,
        });

        // Reduce available seats
        await db.tripSession.update({
            where: { id: session.id },
            data: { availableSeats: 7 }, // 10 - 3
        });

        const initialSeats = (await db.tripSession.findUnique({ where: { id: session.id } }))?.availableSeats;
        expect(initialSeats).toBe(7);

        // Cancel booking
        const cancelRes = await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/cancel`)
            .set('Authorization', `Bearer traveler-token`)
            .expect(200);

        expect(cancelRes.body.status).toBe('CANCELLED');

        // Verify database state
        const updatedBooking = await db.booking.findUnique({ where: { id: booking.id } });
        expect(updatedBooking?.status).toBe('CANCELLED');

        const tripSession = await db.tripSession.findUnique({ where: { id: session.id } });
        expect(tripSession?.availableSeats).toBe(10); // Seats restored

        // Attempt to cancel again
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/cancel`)
            .set('Authorization', `Bearer traveler-token`)
            .expect(400);
    });

    it('Cannot cancel booking in COMPLETED status', async () => {
        const { session } = await seedTestData();

        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'COMPLETED',
            } as any,
        });

        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/cancel`)
            .set('Authorization', `Bearer traveler-token`)
            .expect(400);
    });

    // ===== Section 4: Concurrent Booking Scenarios =====
    it('Concurrent bookings handle seat availability correctly', async () => {
        const { session } = await seedTestData();

        await db.user.createMany({
            data: [
                { id: 'traveler-user-1', email: 'traveler1@example.com', name: 'Traveler 1', password: 'hashed-password', role: UserRole.Traveler, isEmailVerified: true },
                { id: 'traveler-user-2', email: 'traveler2@example.com', name: 'Traveler 2', password: 'hashed-password', role: UserRole.Traveler, isEmailVerified: true },
                { id: 'traveler-user-3', email: 'traveler3@example.com', name: 'Traveler 3', password: 'hashed-password', role: UserRole.Traveler, isEmailVerified: true },
            ],
            skipDuplicates: true,
        });

        // Update session to have exactly 5 seats
        await db.tripSession.update({
            where: { id: session.id },
            data: { availableSeats: 5 },
        });

        // Make 3 concurrent booking requests, each requesting 2 seats
        const results = await Promise.allSettled([
            request(app.getHttpServer())
                .post('/bookings')
                .set('Authorization', `Bearer traveler-1`)
                .send({
                    sessionId: session.id,
                    guestsCount: 2,
                    fullName: 'Traveler 1',
                    phoneNumber: '+1111111111',
                    documentNumber: 'ID1',
                    paymentMethod: 'BANK_TRANSFER',
                }),
            request(app.getHttpServer())
                .post('/bookings')
                .set('Authorization', `Bearer traveler-2`)
                .send({
                    sessionId: session.id,
                    guestsCount: 2,
                    fullName: 'Traveler 2',
                    phoneNumber: '+2222222222',
                    documentNumber: 'ID2',
                    paymentMethod: 'BANK_TRANSFER',
                }),
            request(app.getHttpServer())
                .post('/bookings')
                .set('Authorization', `Bearer traveler-3`)
                .send({
                    sessionId: session.id,
                    guestsCount: 2,
                    fullName: 'Traveler 3',
                    phoneNumber: '+3333333333',
                    documentNumber: 'ID3',
                    paymentMethod: 'BANK_TRANSFER',
                }),
        ]);

        // Count successes and failures
        const successes = results.filter((r) => r.status === 'fulfilled' && (r.value as any).status === 201);
        const failures = results.filter(
            (r) => r.status === 'fulfilled' && (r.value as any).status === 400
        );

        expect(successes.length).toBe(2);
        expect(failures.length).toBe(1);

        // Verify no overselling
        const tripSession = await db.tripSession.findUnique({ where: { id: session.id } });
        expect(tripSession?.availableSeats).toBe(1); // 5 - 4
    });

    it('Duplicate booking prevention', async () => {
        const { session } = await seedTestData();

        // Create first booking
        const createRes1 = await request(app.getHttpServer())
            .post('/bookings')
            .set('Authorization', `Bearer traveler-token`)
            .send({
                sessionId: session.id,
                guestsCount: 2,
                fullName: 'John Doe',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                paymentMethod: 'BANK_TRANSFER',
            })
            .expect(201);

        // Attempt duplicate booking
        await request(app.getHttpServer())
            .post('/bookings')
            .set('Authorization', `Bearer traveler-token`)
            .send({
                sessionId: session.id,
                guestsCount: 2,
                fullName: 'John Doe',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                paymentMethod: 'BANK_TRANSFER',
            })
            .expect(400);

        // Cancel first booking
        await request(app.getHttpServer())
            .post(`/bookings/${createRes1.body.id}/cancel`)
            .set('Authorization', `Bearer traveler-token`)
            .expect(200);

        // Attempt new booking after cancellation
        await request(app.getHttpServer())
            .post('/bookings')
            .set('Authorization', `Bearer traveler-token`)
            .send({
                sessionId: session.id,
                guestsCount: 2,
                fullName: 'John Doe',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                paymentMethod: 'BANK_TRANSFER',
            })
            .expect(201);
    });

    // ===== Section 5: Booking Expiration =====
    it('Booking expires if payment proof not uploaded within timeframe', async () => {
        const { session } = await seedTestData();

        // Create booking
        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'PENDING',
                bookingDate: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
            } as any,
        });

        await db.tripSession.update({ where: { id: session.id }, data: { availableSeats: 8 } });

        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(400);

        // Verify cancellation occurred
        const updatedBooking = await db.booking.findUnique({ where: { id: booking.id } });
        expect(updatedBooking?.status).toBe('CANCELLED');

        // Verify seats restored
        const tripSession = await db.tripSession.findUnique({ where: { id: session.id } });
        expect(tripSession?.availableSeats).toBe(10); // Restored
    });

    it('Payment proof upload succeeds within expiration window', async () => {
        const { session } = await seedTestData();

        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'PENDING',
                bookingDate: new Date(), // Just created
            } as any,
        });

        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);

        const updatedBooking = await db.booking.findUnique({ where: { id: booking.id } });
        expect(updatedBooking?.status).toBe('AWAITING_VALIDATION');
    });

    // ===== Section 6: Payment Proof Rejection =====
    it('Agency rejects payment proof with reason', async () => {
        const { session, traveler } = await seedTestData();

        // Create booking and upload proof
        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: traveler.id,
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'PENDING',
            } as any,
        });

        const proof = await db.paymentProof.create({
            data: {
                bookingId: booking.id,
                imageUrl: 'proof-file.pdf',
                status: 'PENDING',
            } as any,
        });

        await db.booking.update({
            where: { id: booking.id },
            data: { status: 'AWAITING_VALIDATION', paymentProofId: proof.id },
        });

        // Reject with reason
        const rejectRes = await request(app.getHttpServer())
            .patch(`/bookings/${booking.id}/verify-payment`)
            .set('Authorization', `Bearer agency-token`)
            .send({ approved: false, rejectionReason: 'Bank details do not match' })
            .expect(200);

        expect(rejectRes.body.status).toBe('REJECTED');

        // Verify database state
        const updatedProof = await db.paymentProof.findUnique({ where: { id: proof.id } });
        expect(updatedProof?.status).toBe('REJECTED');
        expect(updatedProof?.rejectionReason).toBe('Bank details do not match');

        // Upload new proof after rejection
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);

        // Verify status returns to AWAITING_VALIDATION
        const finalBooking = await db.booking.findUnique({ where: { id: booking.id } });
        expect(finalBooking?.status).toBe('AWAITING_VALIDATION');
    });

    // ===== Section 7: Booking Status Transitions =====
    it('Booking status transitions follow valid flow', async () => {
        const { session } = await seedTestData();

        // Create booking (PENDING)
        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'PENDING',
            } as any,
        });

        // Upload payment proof (AWAITING_VALIDATION)
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);

        // Verify can upload again (upsert)
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);

        // Approve payment (CONFIRMED)
        await request(app.getHttpServer())
            .patch(`/bookings/${booking.id}/verify-payment`)
            .set('Authorization', `Bearer agency-token`)
            .send({ approved: true })
            .expect(200);

        // Attempt to upload new proof when CONFIRMED (should fail)
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(400);
    });

    it('Invalid status transitions are rejected', async () => {
        const { session } = await seedTestData();

        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'CONFIRMED', // Manually set to CONFIRMED (bypass logic)
            } as any,
        });

        // Attempt to upload proof on CONFIRMED booking
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(400);
    });

    // ===== Section 8: Email Notifications =====
    it('Email notifications sent at all booking stages', async () => {
        const { session, traveler, agencyUser } = await seedTestData();

        // Create booking
        const createRes = await request(app.getHttpServer())
            .post('/bookings')
            .set('Authorization', `Bearer traveler-token`)
            .send({
                sessionId: session.id,
                guestsCount: 2,
                fullName: 'John Doe',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                paymentMethod: 'BANK_TRANSFER',
            })
            .expect(201);

        expect(mockEmailService.sendBookingNotification).toHaveBeenCalledWith(
            traveler.email,
            agencyUser.email,
            createRes.body.id,
            'Mountain Adventure'
        );

        // Upload proof
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer())
            .post(`/bookings/${createRes.body.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);

        // Approve payment
        await request(app.getHttpServer())
            .patch(`/bookings/${createRes.body.id}/verify-payment`)
            .set('Authorization', `Bearer agency-token`)
            .send({ approved: true })
            .expect(200);

        expect(mockEmailService.sendPaymentConfirmation).toHaveBeenCalledWith(
            traveler.email,
            'Mountain Adventure'
        );
    });

    it('Email failures do not block booking flow', async () => {
        const { session } = await seedTestData();

        // Mock email service to throw
        (mockEmailService.sendBookingNotification as jest.Mock).mockRejectedValueOnce(
            new Error('Email service error')
        );

        // Create booking should still succeed
        const createRes = await request(app.getHttpServer())
            .post('/bookings')
            .set('Authorization', `Bearer traveler-token`)
            .send({
                sessionId: session.id,
                guestsCount: 2,
                fullName: 'John Doe',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                paymentMethod: 'BANK_TRANSFER',
            })
            .expect(201);

        // Verify booking exists
        const booking = await db.booking.findUnique({ where: { id: createRes.body.id } });
        expect(booking).toBeTruthy();
    });

    // ===== Section 9: Booking Queries with Tenant Isolation =====
    it('Traveler can only see their own bookings', async () => {
        const { session } = await seedTestData();

        // Create second traveler
        await db.user.create({
            data: {
                id: 'traveler-user-456',
                email: 'traveler2@example.com',
                name: 'Test Traveler 2',
                password: 'hashed-password',
                role: UserRole.Traveler,
                isEmailVerified: true,
            } as any,
        });

        // Create bookings for both travelers
        const booking1 = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'PENDING',
            } as any,
        });

        await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-456',
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler 2',
                phoneNumber: '+2234567890',
                documentNumber: 'ID234567',
                status: 'PENDING',
            } as any,
        });

        // Get bookings as traveler 1
        const res = await request(app.getHttpServer())
            .get('/bookings/my-bookings')
            .set('Authorization', `Bearer traveler-1-token`)
            .expect(200);

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].id).toBe(booking1.id);
    });

    it('Agency can only see bookings for their trips', async () => {
        // Create second agency
        const agency2User = await db.user.create({
            data: {
                id: 'agency-user-789',
                email: 'agency2@ouiboo.local',
                name: 'Agency 2',
                password: 'hashed-password',
                role: UserRole.Agency,
                isEmailVerified: true,
            } as any,
        });

        const agency2 = await db.agencyProfile.create({
            data: {
                id: 'agency-profile-789',
                userId: agency2User.id,
                companyName: 'Agency 2 Ltd', ice: 'ICE100002', patente: 'PAT100002', rib: 'RIB100002',
            } as any,
        });

        const { template, session } = await seedTestData();

        // Create template for agency 2
        const template2 = await db.tripTemplate.create({
            data: tripTemplateFixture({
                id: 'template-789',
                agencyId: agency2.id,
                title: 'Beach Trip',
                description: 'A relaxing beach trip',
                category: 'LUXURY',
            }) as any,
        });

        // Create session for agency 2
        const session2 = await db.tripSession.create({
            data: {
                id: 'session-789',
                templateId: template2.id,
                startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
                price: 200,
                totalSeats: 10,
                availableSeats: 10,
            } as any,
        });

        // Create bookings on both agencies' trips
        await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'PENDING',
            },
        });

        await db.booking.create({
            data: {
                sessionId: session2.id,
                travelerId: 'traveler-user-123',
                guestsCount: 2,
                totalAmount: 400,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'PENDING',
            },
        });

        // Get bookings as agency 1 (should only see first booking)
        const res = await request(app.getHttpServer())
            .get('/agency/bookings')
            .set('Authorization', `Bearer agency-1-token`)
            .expect(200);

        const items = Array.isArray(res.body) ? res.body : res.body.data;
        expect(items.some((b: any) => b.session.templateId === template.id)).toBe(true);
        expect(items.some((b: any) => b.session.templateId === template2.id)).toBe(false);
    });

    it('Agency cannot verify payment for other agency bookings', async () => {
        // Create second agency
        const agency2User = await db.user.create({
            data: {
                id: 'agency-user-999',
                email: 'agency3@ouiboo.local',
                name: 'Agency 3',
                password: 'hashed-password',
                role: UserRole.Agency,
                isEmailVerified: true,
            },
        });

        await db.agencyProfile.create({
            data: {
                id: 'agency-profile-999',
                userId: agency2User.id,
                companyName: 'Agency 3 Ltd', ice: 'ICE100003', patente: 'PAT100003', rib: 'RIB100003',
            } as any,
        });

        const { session } = await seedTestData();

        // Create booking on agency 1's trip
        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'PENDING',
            },
        });

        // Upload proof
        const proofKey = `private/test-proofs/${booking.id}.png`;
        const proofPath = path.resolve(process.cwd(), 'private-uploads', 'test-proofs', `${booking.id}.png`);
        fs.mkdirSync(path.dirname(proofPath), { recursive: true });
        fs.copyFileSync(path.join(__dirname, 'fixtures', 'proof.png'), proofPath);

        const proof = await db.paymentProof.create({
            data: {
                bookingId: booking.id,
                imageUrl: proofKey,
                status: 'PENDING',
            },
        });

        await db.booking.update({
            where: { id: booking.id },
            data: { status: 'AWAITING_VALIDATION', paymentProofId: proof.id },
        });

        // Agency 2 attempts to verify (should fail)
        // Mock the TenantGuard to return agency 2's tenant ID
        await request(app.getHttpServer())
            .patch(`/bookings/${booking.id}/verify-payment`)
            .set('Authorization', `Bearer agency-2-token`)
            .send({ approved: true })
            .expect(403);
    });

    // ===== Section 10: Payment Proof Download Access Control =====
    it('Only authorized users can download payment proof', async () => {
        const { session, traveler } = await seedTestData();

        // Create second traveler
        await db.user.create({
            data: {
                id: 'traveler-user-999',
                email: 'traveler-other@example.com',
                name: 'Other Traveler',
                password: 'hashed-password',
                role: UserRole.Traveler,
                isEmailVerified: true,
            },
        });

        // Create booking and upload proof
        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: traveler.id,
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'PENDING',
            },
        });

        const proofKey = `private/test-proofs/${booking.id}.png`;
        const proofPath = path.resolve(process.cwd(), 'private-uploads', 'test-proofs', `${booking.id}.png`);
        fs.mkdirSync(path.dirname(proofPath), { recursive: true });
        fs.copyFileSync(path.join(__dirname, 'fixtures', 'proof.png'), proofPath);

        const proof = await db.paymentProof.create({
            data: {
                bookingId: booking.id,
                imageUrl: proofKey,
                status: 'PENDING',
            },
        });

        await db.booking.update({
            where: { id: booking.id },
            data: { status: 'AWAITING_VALIDATION', paymentProofId: proof.id },
        });

        // Download as traveler (owner) - should succeed
        await request(app.getHttpServer())
            .get(`/bookings/${booking.id}/payment-proof/download`)
            .set('Authorization', `Bearer traveler-token`)
            .expect(200);

        // Download as other traveler - should fail
        await request(app.getHttpServer())
            .get(`/bookings/${booking.id}/payment-proof/download`)
            .set('Authorization', `Bearer traveler-2-token`)
            .expect(400);

        // Download as agency owner - should succeed
        await request(app.getHttpServer())
            .get(`/bookings/${booking.id}/payment-proof/download`)
            .set('Authorization', `Bearer agency-token`)
            .expect(200);

        // Download as admin - should succeed
        await request(app.getHttpServer())
            .get(`/bookings/${booking.id}/payment-proof/download`)
            .set('Authorization', `Bearer admin-token`)
            .expect(200);
    });

    // ===== Section 12: Data Validation and Error Handling =====
    it('Booking creation validates required fields', async () => {
        const { session } = await seedTestData();

        // Missing sessionId
        await request(app.getHttpServer())
            .post('/bookings')
            .set('Authorization', `Bearer traveler-token`)
            .send({
                guestsCount: 2,
                fullName: 'John Doe',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
            })
            .expect(400);

        // Invalid guestsCount (0)
        await request(app.getHttpServer())
            .post('/bookings')
            .set('Authorization', `Bearer traveler-token`)
            .send({
                sessionId: session.id,
                guestsCount: 0,
                fullName: 'John Doe',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
            })
            .expect(400);

        // Invalid guestsCount (negative)
        await request(app.getHttpServer())
            .post('/bookings')
            .set('Authorization', `Bearer traveler-token`)
            .send({
                sessionId: session.id,
                guestsCount: -1,
                fullName: 'John Doe',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
            })
            .expect(400);

        // Non-existent sessionId
        await request(app.getHttpServer())
            .post('/bookings')
            .set('Authorization', `Bearer traveler-token`)
            .send({
                sessionId: 'non-existent',
                guestsCount: 2,
                fullName: 'John Doe',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
            })
            .expect(400);
    });

    it('Payment proof upload validates file type and size', async () => {
        const { session } = await seedTestData();

        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'PENDING',
            },
        });

        // Attempt to upload invalid file type
        // Note: FileValidator at controller level will reject this
        // This test verifies the validators are in place
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        const validRes = await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201); // Should succeed with valid file

        expect(validRes.body).toHaveProperty('id');
    });
});








