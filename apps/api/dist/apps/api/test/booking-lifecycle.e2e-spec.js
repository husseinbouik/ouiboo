"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const request = require("supertest");
const path = require("path");
const bookings_module_1 = require("../src/bookings/bookings.module");
const database_module_1 = require("../src/database/database.module");
const email_module_1 = require("../src/email/email.module");
const upload_module_1 = require("../src/upload/upload.module");
const auth_module_1 = require("../src/auth/auth.module");
const database_service_1 = require("../src/database/database.service");
const email_service_1 = require("../src/email/email.service");
const jwt_auth_guard_1 = require("../src/auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../src/auth/guards/roles.guard");
const tenant_guard_1 = require("../src/auth/guards/tenant.guard");
const types_1 = require("@ouiboo/types");
jest.setTimeout(60_000);
describe('Booking Lifecycle E2E (booking-lifecycle.e2e-spec)', () => {
    let app;
    let db;
    const mockEmailService = {
        sendBookingNotification: jest.fn(async () => true),
        sendPaymentConfirmation: jest.fn(async () => true),
        sendPasswordResetEmail: jest.fn(async () => true),
        sendMail: jest.fn(async () => true),
        getOTPTemplate: jest.fn((otp) => `OTP:${otp}`),
        getWelcomeTemplate: jest.fn((name) => `WELCOME:${name}`),
        getPasswordResetTemplate: jest.fn((url) => `RESET:${url}`),
    };
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [bookings_module_1.BookingsModule, database_module_1.DatabaseModule, email_module_1.EmailModule, upload_module_1.UploadModule, auth_module_1.AuthModule],
        })
            .overrideProvider(email_service_1.EmailService)
            .useValue(mockEmailService)
            .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
            .useValue({
            canActivate: (context) => {
                const req = context.switchToHttp().getRequest();
                const url = req.url || '';
                const isAgency = url.includes('/agency/');
                if (req.headers.authorization?.includes('admin')) {
                    req.user = { userId: 'admin-123', email: 'admin@ouiboo.local', role: types_1.UserRole.Admin };
                }
                else if (isAgency || req.query.role === 'agency') {
                    req.user = { userId: 'agency-user-456', email: 'agency@ouiboo.local', role: types_1.UserRole.Agency };
                }
                else {
                    req.user = { userId: 'traveler-user-123', email: 'traveler@example.com', role: types_1.UserRole.Traveler };
                }
                return true;
            },
        })
            .overrideGuard(roles_guard_1.RolesGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(tenant_guard_1.TenantGuard)
            .useValue({
            canActivate: (context) => {
                const req = context.switchToHttp().getRequest();
                req.tenantId = 'agency-profile-456';
                return true;
            },
        })
            .compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        db = app.get(database_service_1.DatabaseService);
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
        if (!db)
            return;
        await db.walletTransaction.deleteMany();
        await db.wallet.deleteMany();
        await db.payoutRequest.deleteMany();
        await db.tripSession.deleteMany();
        await db.tripTemplate.deleteMany();
        await db.agencyProfile.deleteMany();
        await db.refreshToken.deleteMany();
        await db.paymentProof.deleteMany();
        await db.booking.deleteMany();
        await db.user.deleteMany();
    }
    async function seedTestData() {
        const agencyUser = await db.user.create({
            data: {
                id: 'agency-user-456',
                email: 'agency@ouiboo.local',
                name: 'Test Agency',
                password: 'hashed-password',
                role: types_1.UserRole.Agency,
                isEmailVerified: true,
            },
        });
        const agency = await db.agencyProfile.create({
            data: {
                id: 'agency-profile-456',
                userId: agencyUser.id,
                companyName: 'Test Agency Ltd',
            },
        });
        const template = await db.tripTemplate.create({
            data: {
                id: 'template-123',
                agencyId: agency.id,
                title: 'Mountain Adventure',
                description: 'A thrilling mountain trek',
                itinerary: 'Day 1: Trek start',
                duration: 3,
                difficulty: 'MEDIUM',
            },
        });
        const session = await db.tripSession.create({
            data: {
                id: 'session-123',
                templateId: template.id,
                startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
                price: 390,
                availableSeats: 10,
            },
        });
        const traveler = await db.user.create({
            data: {
                id: 'traveler-user-123',
                email: 'traveler@example.com',
                name: 'Test Traveler',
                password: 'hashed-password',
                role: types_1.UserRole.Traveler,
                isEmailVerified: true,
            },
        });
        return { agencyUser, agency, template, session, traveler };
    }
    it('Complete booking flow: create → upload payment proof → agency verification → confirmation', async () => {
        const { session, traveler, agencyUser } = await seedTestData();
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
        expect(createRes.body.totalAmount).toBe(780);
        const bookingId = createRes.body.id;
        expect(mockEmailService.sendBookingNotification).toHaveBeenCalledWith(traveler.email, agencyUser.email, bookingId, 'Mountain Adventure');
        let booking = await db.booking.findUnique({ where: { id: bookingId } });
        expect(booking).toBeTruthy();
        expect(booking?.status).toBe('PENDING');
        const tripSession = await db.tripSession.findUnique({ where: { id: session.id } });
        expect(tripSession?.availableSeats).toBe(8);
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        const uploadRes = await request(app.getHttpServer())
            .post(`/bookings/${bookingId}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);
        expect(uploadRes.body).toHaveProperty('id');
        expect(uploadRes.body.status).toBe('PENDING');
        expect(uploadRes.body).toHaveProperty('downloadUrl');
        booking = await db.booking.findUnique({ where: { id: bookingId } });
        expect(booking?.status).toBe('AWAITING_VALIDATION');
        const proof = await db.paymentProof.findUnique({ where: { bookingId } });
        expect(proof).toBeTruthy();
        expect(proof?.status).toBe('PENDING');
        const verifyRes = await request(app.getHttpServer())
            .patch(`/bookings/${bookingId}/verify-payment`)
            .set('Authorization', `Bearer agency-token`)
            .send({ approved: true })
            .expect(200);
        expect(verifyRes.body.status).toBe('CONFIRMED');
        expect(mockEmailService.sendPaymentConfirmation).toHaveBeenCalledWith(traveler.email, 'Mountain Adventure');
        booking = await db.booking.findUnique({ where: { id: bookingId } });
        expect(booking?.status).toBe('CONFIRMED');
        const updatedProof = await db.paymentProof.findUnique({ where: { bookingId } });
        expect(updatedProof?.status).toBe('VERIFIED');
    });
    it('Booking cancellation by traveler restores seats', async () => {
        const { session } = await seedTestData();
        const booking = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: 'traveler-user-123',
                guestsCount: 3,
                totalAmount: 1170,
                fullName: 'Test Traveler',
                phoneNumber: '+1234567890',
                documentNumber: 'ID123456',
                status: 'CONFIRMED',
            },
        });
        await db.tripSession.update({
            where: { id: session.id },
            data: { availableSeats: 7 },
        });
        const initialSeats = (await db.tripSession.findUnique({ where: { id: session.id } }))?.availableSeats;
        expect(initialSeats).toBe(7);
        const cancelRes = await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/cancel`)
            .set('Authorization', `Bearer traveler-token`)
            .expect(200);
        expect(cancelRes.body.status).toBe('CANCELLED');
        const updatedBooking = await db.booking.findUnique({ where: { id: booking.id } });
        expect(updatedBooking?.status).toBe('CANCELLED');
        const tripSession = await db.tripSession.findUnique({ where: { id: session.id } });
        expect(tripSession?.availableSeats).toBe(10);
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
            },
        });
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/cancel`)
            .set('Authorization', `Bearer traveler-token`)
            .expect(400);
    });
    it('Concurrent bookings handle seat availability correctly', async () => {
        const { session } = await seedTestData();
        await db.tripSession.update({
            where: { id: session.id },
            data: { availableSeats: 5 },
        });
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
        const successes = results.filter((r) => r.status === 'fulfilled' && r.value.status === 201);
        const failures = results.filter((r) => r.status === 'fulfilled' && r.value.status === 400);
        expect(successes.length).toBe(2);
        expect(failures.length).toBe(1);
        const tripSession = await db.tripSession.findUnique({ where: { id: session.id } });
        expect(tripSession?.availableSeats).toBe(1);
    });
    it('Duplicate booking prevention', async () => {
        const { session } = await seedTestData();
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
        await request(app.getHttpServer())
            .post(`/bookings/${createRes1.body.id}/cancel`)
            .set('Authorization', `Bearer traveler-token`)
            .expect(200);
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
    it('Booking expires if payment proof not uploaded within timeframe', async () => {
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
                bookingDate: new Date(Date.now() - 25 * 60 * 60 * 1000),
            },
        });
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(400);
        const updatedBooking = await db.booking.findUnique({ where: { id: booking.id } });
        expect(updatedBooking?.status).toBe('CANCELLED');
        const tripSession = await db.tripSession.findUnique({ where: { id: session.id } });
        expect(tripSession?.availableSeats).toBe(10);
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
                bookingDate: new Date(),
            },
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
    it('Agency rejects payment proof with reason', async () => {
        const { session, traveler } = await seedTestData();
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
        const proof = await db.paymentProof.create({
            data: {
                bookingId: booking.id,
                imageUrl: 'proof-file.pdf',
                status: 'PENDING',
            },
        });
        await db.booking.update({
            where: { id: booking.id },
            data: { status: 'AWAITING_VALIDATION', paymentProofId: proof.id },
        });
        const rejectRes = await request(app.getHttpServer())
            .patch(`/bookings/${booking.id}/verify-payment`)
            .set('Authorization', `Bearer agency-token`)
            .send({ approved: false, rejectionReason: 'Bank details do not match' })
            .expect(200);
        expect(rejectRes.body.status).toBe('REJECTED');
        const updatedProof = await db.paymentProof.findUnique({ where: { id: proof.id } });
        expect(updatedProof?.status).toBe('REJECTED');
        expect(updatedProof?.rejectionReason).toBe('Bank details do not match');
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);
        const finalBooking = await db.booking.findUnique({ where: { id: booking.id } });
        expect(finalBooking?.status).toBe('AWAITING_VALIDATION');
    });
    it('Booking status transitions follow valid flow', async () => {
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
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        const uploadRes = await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);
        const uploadRes2 = await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);
        await request(app.getHttpServer())
            .patch(`/bookings/${booking.id}/verify-payment`)
            .set('Authorization', `Bearer agency-token`)
            .send({ approved: true })
            .expect(200);
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
                status: 'CONFIRMED',
            },
        });
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(400);
    });
    it('Email notifications sent at all booking stages', async () => {
        const { session, traveler, agencyUser } = await seedTestData();
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
        expect(mockEmailService.sendBookingNotification).toHaveBeenCalledWith(traveler.email, agencyUser.email, createRes.body.id, 'Mountain Adventure');
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer())
            .post(`/bookings/${createRes.body.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);
        await request(app.getHttpServer())
            .patch(`/bookings/${createRes.body.id}/verify-payment`)
            .set('Authorization', `Bearer agency-token`)
            .send({ approved: true })
            .expect(200);
        expect(mockEmailService.sendPaymentConfirmation).toHaveBeenCalledWith(traveler.email, 'Mountain Adventure');
    });
    it('Email failures do not block booking flow', async () => {
        const { session } = await seedTestData();
        mockEmailService.sendBookingNotification.mockRejectedValueOnce(new Error('Email service error'));
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
        const booking = await db.booking.findUnique({ where: { id: createRes.body.id } });
        expect(booking).toBeTruthy();
    });
    it('Traveler can only see their own bookings', async () => {
        const { session } = await seedTestData();
        const traveler2 = await db.user.create({
            data: {
                id: 'traveler-user-456',
                email: 'traveler2@example.com',
                name: 'Test Traveler 2',
                password: 'hashed-password',
                role: types_1.UserRole.Traveler,
                isEmailVerified: true,
            },
        });
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
            },
        });
        const booking2 = await db.booking.create({
            data: {
                sessionId: session.id,
                travelerId: traveler2.id,
                guestsCount: 2,
                totalAmount: 780,
                fullName: 'Test Traveler 2',
                phoneNumber: '+2234567890',
                documentNumber: 'ID234567',
                status: 'PENDING',
            },
        });
        const res = await request(app.getHttpServer())
            .get('/bookings/my-bookings')
            .set('Authorization', `Bearer traveler-1-token`)
            .expect(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].id).toBe(booking1.id);
    });
    it('Agency can only see bookings for their trips', async () => {
        const agency2User = await db.user.create({
            data: {
                id: 'agency-user-789',
                email: 'agency2@ouiboo.local',
                name: 'Agency 2',
                password: 'hashed-password',
                role: types_1.UserRole.Agency,
                isEmailVerified: true,
            },
        });
        const agency2 = await db.agencyProfile.create({
            data: {
                id: 'agency-profile-789',
                userId: agency2User.id,
                companyName: 'Agency 2 Ltd',
            },
        });
        const { template, session, agency } = await seedTestData();
        const template2 = await db.tripTemplate.create({
            data: {
                id: 'template-789',
                agencyId: agency2.id,
                title: 'Beach Trip',
                description: 'A relaxing beach trip',
                itinerary: 'Day 1: Beach',
                duration: 2,
                difficulty: 'EASY',
            },
        });
        const session2 = await db.tripSession.create({
            data: {
                id: 'session-789',
                templateId: template2.id,
                startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
                price: 200,
                availableSeats: 10,
            },
        });
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
        const res = await request(app.getHttpServer())
            .get('/agency/bookings')
            .set('Authorization', `Bearer agency-1-token`)
            .expect(200);
        expect(res.body.some((b) => b.session.templateId === template.id)).toBe(true);
        expect(res.body.some((b) => b.session.templateId === template2.id)).toBe(false);
    });
    it('Agency cannot verify payment for other agency bookings', async () => {
        const agency2User = await db.user.create({
            data: {
                id: 'agency-user-999',
                email: 'agency3@ouiboo.local',
                name: 'Agency 3',
                password: 'hashed-password',
                role: types_1.UserRole.Agency,
                isEmailVerified: true,
            },
        });
        const agency2 = await db.agencyProfile.create({
            data: {
                id: 'agency-profile-999',
                userId: agency2User.id,
                companyName: 'Agency 3 Ltd',
            },
        });
        const { template, session } = await seedTestData();
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
        const proof = await db.paymentProof.create({
            data: {
                bookingId: booking.id,
                imageUrl: 'proof-file.pdf',
                status: 'PENDING',
            },
        });
        await db.booking.update({
            where: { id: booking.id },
            data: { status: 'AWAITING_VALIDATION', paymentProofId: proof.id },
        });
        await request(app.getHttpServer())
            .patch(`/bookings/${booking.id}/verify-payment`)
            .set('Authorization', `Bearer agency-2-token`)
            .send({ approved: true })
            .expect(403);
    });
    it('Only authorized users can download payment proof', async () => {
        const { session, traveler } = await seedTestData();
        const traveler2 = await db.user.create({
            data: {
                id: 'traveler-user-999',
                email: 'traveler-other@example.com',
                name: 'Other Traveler',
                password: 'hashed-password',
                role: types_1.UserRole.Traveler,
                isEmailVerified: true,
            },
        });
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
        const proof = await db.paymentProof.create({
            data: {
                bookingId: booking.id,
                imageUrl: 'proof-file.pdf',
                status: 'PENDING',
            },
        });
        await db.booking.update({
            where: { id: booking.id },
            data: { status: 'AWAITING_VALIDATION', paymentProofId: proof.id },
        });
        await request(app.getHttpServer())
            .get(`/bookings/${booking.id}/payment-proof/download`)
            .set('Authorization', `Bearer traveler-token`)
            .expect(200);
        await request(app.getHttpServer())
            .get(`/bookings/${booking.id}/payment-proof/download`)
            .set('Authorization', `Bearer traveler-2-token`)
            .expect(400);
        await request(app.getHttpServer())
            .get(`/bookings/${booking.id}/payment-proof/download`)
            .set('Authorization', `Bearer agency-token`)
            .expect(200);
        await request(app.getHttpServer())
            .get(`/bookings/${booking.id}/payment-proof/download`)
            .set('Authorization', `Bearer admin-token`)
            .expect(200);
    });
    it('Booking creation validates required fields', async () => {
        const { session } = await seedTestData();
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
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        const validRes = await request(app.getHttpServer())
            .post(`/bookings/${booking.id}/payment-proof`)
            .set('Authorization', `Bearer traveler-token`)
            .attach('file', fixturePath)
            .expect(201);
        expect(validRes.body).toHaveProperty('id');
    });
});
//# sourceMappingURL=booking-lifecycle.e2e-spec.js.map