import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as nodemailer from 'nodemailer';
import { EmailModule } from '../src/email/email.module';
import { DatabaseModule } from '../src/database/database.module';
import { AuthModule } from '../src/auth/auth.module';
import { BookingsModule } from '../src/bookings/bookings.module';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { DatabaseService } from '../src/database/database.service';
import { EmailService } from '../src/email/email.service';
import { NotificationJobsService } from '../src/notifications/notification-jobs.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { UserRole } from '@ouiboo/types';

jest.setTimeout(60_000);

describe('Email Notifications - Complete E2E (email-notifications.e2e-spec)', () => {
    let app: INestApplication;
    let db: DatabaseService;
    let emailService: EmailService;
    let notificationJobsService: NotificationJobsService;

    // Mock transporter for nodemailer
    const mockTransporter = { sendMail: jest.fn(async (opts: any) => ({ messageId: 'msg-1', accepted: [opts.to] })) };

    beforeAll(async () => {
        // mock nodemailer.createTransport to return our mock transporter
        jest.spyOn(nodemailer, 'createTransport').mockImplementation((): any => mockTransporter as any);

        const moduleRef: TestingModule = await Test.createTestingModule({
            imports: [EmailModule, DatabaseModule, AuthModule, BookingsModule, NotificationsModule],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: (ctx: any) => { const req = ctx.switchToHttp().getRequest(); const auth = req.headers.authorization || ''; if (auth.includes('traveler')) req.user = { userId: 'traveler-1', email: 'traveler@test.com', role: UserRole.Traveler }; if (auth.includes('agency')) req.user = { userId: 'agency-1', email: 'agency@test.com', role: UserRole.Agency }; return true; } })
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();

        db = app.get(DatabaseService);
        emailService = app.get(EmailService);
        notificationJobsService = app.get(NotificationJobsService);
    });

    afterAll(async () => {
        await clearDatabase();
        await app.close();
        jest.restoreAllMocks();
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        mockTransporter.sendMail.mockClear();
        await clearDatabase();
    });

    async function clearDatabase() {
        if (!db) return;
        await db.walletTransaction.deleteMany();
        await db.wallet.deleteMany();
        await db.payoutRequest.deleteMany();
        await db.notificationLog.deleteMany();
        await db.paymentProof.deleteMany();
        await db.booking.deleteMany();
        await db.tripSession.deleteMany();
        await db.tripTemplate.deleteMany();
        await db.agencyProfile.deleteMany();
        await db.refreshToken.deleteMany();
        await db.user.deleteMany();
    }

    // ===== Email Templates Rendering =====
    describe('Email Templates', () => {
        it('OTP template renders correctly', () => {
            const html = emailService.getOTPTemplate('123456');
            expect(html).toContain('123456');
            expect(html).toMatch(/Verify your email/i);
            expect(html).toMatch(/10\s*minutes/i);
        });

        it('Welcome template with name', () => {
            const html = emailService.getWelcomeTemplate('John Doe');
            expect(html).toMatch(/Welcome to Ouiboo\s*John Doe/i);
            expect(html).toMatch(/dashboard/i);
        });

        it('Welcome template without name', () => {
            const html = emailService.getWelcomeTemplate(null as any);
            expect(html).toMatch(/Welcome to Ouiboo/i);
        });

        it('Password reset template', () => {
            const url = 'https://example.com/reset?token=abc123';
            const html = emailService.getPasswordResetTemplate(url);
            expect(html).toContain(url);
            expect(html).toMatch(/Reset your password/i);
            expect(html).toMatch(/60\s*minutes/i);
        });

        it('Payment reminder template', () => {
            const html = emailService.getPaymentReminderTemplate('Morocco Adventure', 12, 'https://example.com/bookings/123');
            expect(html).toContain('Morocco Adventure');
            expect(html).toMatch(/12\s*hours/i);
            expect(html).toContain('https://example.com/bookings/123');
            expect(html).toMatch(/payment proof/i);
        });

        it('Trip reminder template (7 days)', () => {
            const html = emailService.getTripReminderTemplate('Desert Safari', 7, 'Adventure Tours', 'https://example.com/trips/456');
            expect(html).toMatch(/one week|7\s*days/i);
            expect(html).toContain('Desert Safari');
            expect(html).toContain('Adventure Tours');
            expect(html).toContain('https://example.com/trips/456');
        });

        it('Trip reminder template (1 day)', () => {
            const html = emailService.getTripReminderTemplate('Desert Safari', 1, 'Adventure Tours', 'https://example.com/trips/456');
            expect(html).toMatch(/one day|1\s*day/i);
            expect(html).toContain('Desert Safari');
        });

        it('Review request template', () => {
            const html = emailService.getReviewRequestTemplate('Beach Getaway', 'Coastal Tours', 'https://example.com/review/789');
            expect(html).toContain('Beach Getaway');
            expect(html).toContain('Coastal Tours');
            expect(html).toContain('https://example.com/review/789');
        });

        it('Auto-cancellation template', () => {
            const html = emailService.getAutoUnpaidCancellationTemplate('Mountain Trek', 'booking-123');
            expect(html).toContain('Mountain Trek');
            expect(html).toContain('booking-123');
            expect(html).toMatch(/cancelled/i);
        });
    });

    // ===== SMTP and Console Sending =====
    describe('Email Sending - SMTP Mode', () => {
        const env = { ...process.env };

        afterEach(() => {
            process.env = { ...env };
        });

        it('Send email with SMTP configured', async () => {
            process.env.SMTP_HOST = 'smtp.test';
            process.env.SMTP_PORT = '587';
            process.env.SMTP_USER = 'user@test.com';
            process.env.SMTP_PASS = 'secret';

            // reinitialize email service is not trivial in test harness; call sendEmail which will use nodemailer.createTransport mocked above
            await emailService.sendEmail('test@to.com', 'Test Subject', '<p>Test Body</p>');
            expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
            const call = mockTransporter.sendMail.mock.calls[0][0];
            expect(call.to).toBe('test@to.com');
            expect(call.subject).toContain('Test Subject');
            expect(call.html).toContain('Test Body');
        });

        it('Console-only mode logs email when SMTP missing', async () => {
            delete process.env.SMTP_HOST;
            delete process.env.SMTP_USER;
            const spy = jest.spyOn(console, 'debug').mockImplementation(() => { });
            await emailService.sendEmail('console@to.com', 'Console Subject', '<p>Body</p>');
            // nodemailer sendMail should not have been used in console mode
            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('Email sending handles errors gracefully', async () => {
            process.env.SMTP_HOST = 'smtp.test';
            mockTransporter.sendMail.mockImplementationOnce(() => { throw new Error('SMTP failure'); });
            const spy = jest.spyOn(console, 'error').mockImplementation(() => { });
            await expect(emailService.sendEmail('err@to.com', 'Err', '<p>x</p>')).resolves.not.toThrow();
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    // ===== Booking Notification Emails =====
    describe('Booking Notification Emails', () => {
        it('Send booking notification to traveler and agency', async () => {
            // create agency and traveler
            const agencyUser = await db.user.create({ data: { id: 'a1', email: 'agency@test.com', name: 'Agency', role: UserRole.Agency, password: 'password' } as any });
            const agencyProfile = await db.agencyProfile.create({ data: { id: 'ap1', userId: agencyUser.id, companyName: 'Agency', ice: 'ICE100010', patente: 'PAT100010', rib: 'RIB100010' } as any });
            const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Trip Title', status: 'ACTIVE' } as any });
            await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const traveler = await db.user.create({ data: { id: 't1', email: 'traveler@test.com', name: 'T', role: UserRole.Traveler, password: 'password' } as any });

            await emailService.sendBookingNotification(traveler.email, agencyUser.email, 'booking-1', template.title);
            // expect two emails - one to traveler and one to agency
            expect(mockTransporter.sendMail).toHaveBeenCalled();
            const toAddrs = mockTransporter.sendMail.mock.calls.map(c => c[0].to);
            expect(toAddrs).toEqual(expect.arrayContaining([traveler.email, agencyUser.email]));
        });

        it('Payment confirmation email', async () => {
            await emailService.sendPaymentConfirmation('traveler@test.com', 'Trip Title');
            expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
            const call = mockTransporter.sendMail.mock.calls[0][0];
            expect(call.subject).toMatch(/Payment Verified/i);
            expect(call.html).toContain('Trip Title');
        });
    });

    // ===== Scheduled Payment Reminder Emails =====
    describe('Payment Reminder Emails', () => {
        it('Send payment reminder for unpaid booking', async () => {
            const agencyUser = await db.user.create({ data: { id: 'a2', email: 'ag2@test.com', name: 'A2', role: UserRole.Agency, password: 'password' } as any });
            const agencyProfile = await db.agencyProfile.create({ data: { id: 'ap2', userId: agencyUser.id, companyName: 'A2', ice: 'ICE100011', patente: 'PAT100011', rib: 'RIB100011' } as any });
            const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'PayTrip', status: 'ACTIVE' } as any });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const traveler = await db.user.create({ data: { id: 't2', email: 'trav2@test.com', name: 'T2', password: 'password' } as any });

            // create booking awaiting validation older than threshold
            const oldDate = new Date(Date.now() - 13 * 60 * 60 * 1000);
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: oldDate } });

            // call job
            await notificationJobsService.sendPaymentProofReminders();

            expect(mockTransporter.sendMail).toHaveBeenCalled();

            const updated = await db.booking.findUnique({ where: { id: booking.id } });
            expect(updated?.lastReminderSentAt).toBeTruthy();
            const logs = await db.notificationLog.findMany({ where: { userId: traveler.id } });
            expect(logs.length).toBeGreaterThan(0);
        });

        it('Skip payment reminder if already sent or paid', async () => {
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-skip', title: 'SkipTrip', status: 'ACTIVE' } as any });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const traveler = await db.user.create({ data: { id: 't-skip', email: 'tskip@test.com', name: 'TS', password: 'password' } as any });

            const recent = new Date();
            await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000), lastReminderSentAt: recent } });
            await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000), paymentStatus: 'PAID' } });

            await notificationJobsService.sendPaymentProofReminders();
            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
        });
    });

    // ===== Trip Reminder Emails =====
    describe('Trip Reminder Emails', () => {
        it('Send 7-day trip reminder', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-rem', title: 'Trip7', status: 'ACTIVE' } as any });
            const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate, endDate: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000), price: 200, totalSeats: 5, availableSeats: 5 } });
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 200, status: 'CONFIRMED' } });

            await notificationJobsService.sendTripReminders7DaysBefore();
            expect(mockTransporter.sendMail).toHaveBeenCalled();
            const updated = await db.booking.findUnique({ where: { id: booking.id } });
            expect((updated?.notificationsSent as any)?.tripReminder7Days).toBeTruthy();
        });

        it('Send 1-day trip reminder', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-rem1', title: 'Trip1', status: 'ACTIVE' } as any });
            const startDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate, endDate: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000), price: 200, totalSeats: 5, availableSeats: 5 } });
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 200, status: 'CONFIRMED' } });

            await notificationJobsService.sendTripReminders1DayBefore();
            expect(mockTransporter.sendMail).toHaveBeenCalled();
            const updated = await db.booking.findUnique({ where: { id: booking.id } });
            expect((updated?.notificationsSent as any)?.tripReminder1Day).toBeTruthy();
        });
    });

    // ===== Review Request Emails =====
    describe('Review Request Emails', () => {
        it('Send review request after trip completion', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-r', title: 'ReviewTrip', status: 'ACTIVE' } as any });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), price: 100, totalSeats: 5, availableSeats: 5 } });
            await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'COMPLETED' } });

            await emailService.sendReviewRequest(traveler.email, template.title, 'AgencyName', 'https://example.com/review/1');
            expect(mockTransporter.sendMail).toHaveBeenCalled();
            const call = mockTransporter.sendMail.mock.calls[0][0];
            expect(call.html).toContain(template.title);
            expect(call.html).toContain('AgencyName');
        });
    });

    // ===== Auto-Cancellation Emails =====
    describe('Auto-Cancellation Emails', () => {
        it('Send auto-cancellation for unpaid booking', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-c', title: 'CancelTrip', status: 'ACTIVE' } as any });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'PENDING', createdAt: old } });

            await notificationJobsService.autoCancelUnpaidBookings();

            const updated = await db.booking.findUnique({ where: { id: booking.id } });
            expect(updated?.status).toBe('CANCELLED');
            expect(updated?.cancellationReason).toBe('AUTO_CANCELLED_UNPAID');
            expect(mockTransporter.sendMail).toHaveBeenCalled();
        });

        it('Skip auto-cancel for paid bookings', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-c2', title: 'PaidTrip', status: 'ACTIVE' } as any });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'PENDING', paymentStatus: 'PAID', createdAt: old } });

            await notificationJobsService.autoCancelUnpaidBookings();
            const updated = await db.booking.findUnique({ where: { id: booking.id } });
            expect(updated?.status).not.toBe('CANCELLED');
            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
        });
    });

    // ===== Email Failure Handling =====
    describe('Email Failure Handling', () => {
        it('Email failure does not block booking creation', async () => {
            // make sendMail throw once
            mockTransporter.sendMail.mockImplementationOnce(() => { throw new Error('boom'); });
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-f', title: 'FTrip', status: 'ACTIVE' } as any });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            await db.user.create({ data: { id: 't-f', email: 'tf@test.com', name: 'TF', password: 'password' } as any });

            const res = await request(app.getHttpServer()).post('/bookings').set('Authorization', 'Bearer traveler').send({ sessionId: session.id, guestsCount: 1, fullName: 'F', phoneNumber: '+1', documentNumber: 'D', paymentMethod: 'BANK_TRANSFER' }).expect(201);
            expect(res.body.id).toBeDefined();
            // error logged but booking created
        });

        it('Notification job continues after individual email failure', async () => {
            // create 3 bookings
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-j', title: 'JobTrip', status: 'ACTIVE' } as any });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000) } });
            await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000) } });
            await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000) } });

            // make second call throw
            let callIndex = 0;
            mockTransporter.sendMail.mockImplementation(() => {
                callIndex += 1;
                if (callIndex === 2) throw new Error('boom');
                return Promise.resolve({ messageId: 'ok', accepted: [] });
            });

            await notificationJobsService.sendPaymentProofReminders();
            // job should have attempted to send for all three (some failed)
            expect(mockTransporter.sendMail).toHaveBeenCalled();
        });
    });

    // ===== Personalization Tests =====
    describe('Email Personalization', () => {
        it('Welcome email includes user name', async () => {
            const user = await db.user.create({ data: { id: 'u-per', email: 'u@p.com', name: 'Alice Smith', role: UserRole.Traveler, password: 'password' } as any });
            await emailService.sendWelcomeEmail(user.email, user.name);
            expect(mockTransporter.sendMail).toHaveBeenCalled();
            const html = mockTransporter.sendMail.mock.calls[0][0].html;
            expect(html).toContain('Alice Smith');
            expect(html).toMatch(/Welcome to Ouiboo/i);
        });

        it('Payment reminder includes booking dashboard URL', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-url', title: 'UrlTrip', status: 'ACTIVE' } as any });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000) } });

            await notificationJobsService.sendPaymentProofReminders();
            const html = mockTransporter.sendMail.mock.calls[0][0].html;
            expect(html).toContain(`/bookings/${booking.id}`);
        });
    });

    // ===== Content Validation =====
    describe('Email Content Validation', () => {
        it('All emails have proper HTML structure', async () => {
            await emailService.sendEmail('a@b.com', 'S1', '<h1>Hi</h1><p>Body</p>');
            const html = mockTransporter.sendMail.mock.calls[0][0].html;
            expect(html).toMatch(/<h1>.*<\/h1>/i);
            expect(html).toMatch(/<p>.*<\/p>/i);
        });

        it('All emails include contact information or footer', async () => {
            const html = emailService.getWelcomeTemplate('X');
            expect(html.toLowerCase()).toMatch(/support|contact|unsubscribe/);
        });

        it('Email subjects are descriptive', async () => {
            emailService.getOTPTemplate('0000');
            const subject = emailService.generateOTPSubject();
            expect(subject.toLowerCase()).toMatch(/verify/);
        });
    });

    // ===== Integration: Complete Email Flow =====
    describe('Complete Email Flow Integration', () => {
        it('Full booking lifecycle emails', async () => {
            const trav = await db.user.create({ data: { id: 'trav-int', email: 'travint@test.com', name: 'TI', role: UserRole.Traveler, password: 'password' } as any });
            // OTP & welcome
            await emailService.sendOTP(trav.email, '0000');
            await emailService.sendWelcomeEmail(trav.email, trav.name);

            const agencyUser = await db.user.create({ data: { id: 'ag-int', email: 'agint@test.com', name: 'AG', role: UserRole.Agency, password: 'password' } as any });
            const ap = await db.agencyProfile.create({ data: { id: 'ap-int', userId: agencyUser.id, companyName: 'AG', ice: 'ICE100012', patente: 'PAT100012', rib: 'RIB100012' } as any });
            const tpl = await db.tripTemplate.create({ data: { agencyId: ap.id, title: 'FlowTrip', status: 'ACTIVE' } as any });
            const sess = await db.tripSession.create({ data: { templateId: tpl.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });

            const bookingRes = await request(app.getHttpServer()).post('/bookings').set('Authorization', 'Bearer traveler').send({ sessionId: sess.id, guestsCount: 1, fullName: 'X', phoneNumber: '+', documentNumber: 'D', paymentMethod: 'BANK_TRANSFER' }).expect(201);
            // agency verify
            await request(app.getHttpServer()).patch(`/bookings/${bookingRes.body.id}/verify-payment`).set('Authorization', 'Bearer agency').send({ approved: true }).expect(200);

            // ensure several emails were sent
            expect(mockTransporter.sendMail.mock.calls.length).toBeGreaterThanOrEqual(3);
        });

        it('Password reset flow emails', async () => {
            const u = await db.user.create({ data: { id: 'u-pr', email: 'upr@test.com', name: 'UP', role: UserRole.Traveler, password: 'password' } as any });
            await emailService.sendPasswordResetEmail(u.email, 'https://example.com/reset?token=tok');
            expect(mockTransporter.sendMail).toHaveBeenCalled();
        });
    });

    // ===== Configuration Tests =====
    describe('Email Configuration', () => {
        it('EmailService initializes with SMTP when configured', () => {
            process.env.SMTP_HOST = 'smtp.x';
            process.env.SMTP_PORT = '465';
            process.env.SMTP_USER = 'u';
            process.env.SMTP_PASS = 'p';
            // initialization message logged when service constructs; we assume transporter created via createTransport mock
            const spy = jest.spyOn(console, 'log').mockImplementation(() => { });
            // construct a new EmailService directly
            new (EmailService as any)();
            expect(nodemailer.createTransport).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('EmailService falls back to console when SMTP missing', () => {
            delete process.env.SMTP_HOST;
            delete process.env.SMTP_USER;
            const spy = jest.spyOn(console, 'warn').mockImplementation(() => { });
            new (EmailService as any)();
            // in console mode, createTransport should not be used (but our mock still exists); ensure warning logged
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    // ---- Helpers ----
    async function seedUsersForReminder() {
        const traveler = await db.user.create({ data: { id: `trav-rem-${Date.now()}`, email: `trav${Date.now()}@test.com`, name: 'RemTraveler', role: UserRole.Traveler, password: 'password' } as any });
        return { traveler };
    }
});
