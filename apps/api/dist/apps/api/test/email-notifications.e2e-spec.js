"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const request = require("supertest");
const nodemailer = require("nodemailer");
const email_module_1 = require("../src/email/email.module");
const database_module_1 = require("../src/database/database.module");
const auth_module_1 = require("../src/auth/auth.module");
const bookings_module_1 = require("../src/bookings/bookings.module");
const notifications_module_1 = require("../src/notifications/notifications.module");
const database_service_1 = require("../src/database/database.service");
const email_service_1 = require("../src/email/email.service");
const notification_jobs_service_1 = require("../src/notifications/notification-jobs.service");
const jwt_auth_guard_1 = require("../src/auth/guards/jwt-auth.guard");
const types_1 = require("@ouiboo/types");
jest.setTimeout(60_000);
describe('Email Notifications - Complete E2E (email-notifications.e2e-spec)', () => {
    let app;
    let db;
    let emailService;
    let notificationJobsService;
    const mockTransporter = { sendMail: jest.fn(async (opts) => ({ messageId: 'msg-1', accepted: [opts.to] })) };
    beforeAll(async () => {
        jest.spyOn(nodemailer, 'createTransport').mockImplementation(() => mockTransporter);
        const moduleRef = await testing_1.Test.createTestingModule({
            imports: [email_module_1.EmailModule, database_module_1.DatabaseModule, auth_module_1.AuthModule, bookings_module_1.BookingsModule, notifications_module_1.NotificationsModule],
        })
            .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
            .useValue({ canActivate: (ctx) => { const req = ctx.switchToHttp().getRequest(); const auth = req.headers.authorization || ''; if (auth.includes('traveler'))
                req.user = { userId: 'traveler-1', email: 'traveler@test.com', role: types_1.UserRole.Traveler }; if (auth.includes('agency'))
                req.user = { userId: 'agency-1', email: 'agency@test.com', role: types_1.UserRole.Agency }; return true; } })
            .compile();
        app = moduleRef.createNestApplication();
        await app.init();
        db = app.get(database_service_1.DatabaseService);
        emailService = app.get(email_service_1.EmailService);
        notificationJobsService = app.get(notification_jobs_service_1.NotificationJobsService);
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
        if (!db)
            return;
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
            const html = emailService.getWelcomeTemplate(null);
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
    describe('Booking Notification Emails', () => {
        it('Send booking notification to traveler and agency', async () => {
            const agencyUser = await db.user.create({ data: { id: 'a1', email: 'agency@test.com', name: 'Agency', role: types_1.UserRole.Agency } });
            const agencyProfile = await db.agencyProfile.create({ data: { id: 'ap1', userId: agencyUser.id, companyName: 'Agency' } });
            const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'Trip Title', status: 'ACTIVE' } });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const traveler = await db.user.create({ data: { id: 't1', email: 'traveler@test.com', name: 'T', role: types_1.UserRole.Traveler } });
            await emailService.sendBookingNotification(traveler.email, agencyUser.email, 'booking-1', template.title);
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
    describe('Payment Reminder Emails', () => {
        it('Send payment reminder for unpaid booking', async () => {
            const agencyUser = await db.user.create({ data: { id: 'a2', email: 'ag2@test.com', name: 'A2', role: types_1.UserRole.Agency } });
            const agencyProfile = await db.agencyProfile.create({ data: { id: 'ap2', userId: agencyUser.id, companyName: 'A2' } });
            const template = await db.tripTemplate.create({ data: { agencyId: agencyProfile.id, title: 'PayTrip', status: 'ACTIVE' } });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const traveler = await db.user.create({ data: { id: 't2', email: 'trav2@test.com', name: 'T2' } });
            const oldDate = new Date(Date.now() - 13 * 60 * 60 * 1000);
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: oldDate } });
            await notificationJobsService.sendPaymentProofReminders();
            expect(mockTransporter.sendMail).toHaveBeenCalled();
            const updated = await db.booking.findUnique({ where: { id: booking.id } });
            expect(updated?.lastReminderSentAt).toBeTruthy();
            const logs = await db.notificationLog.findMany({ where: { bookingId: booking.id } });
            expect(logs.length).toBeGreaterThan(0);
        });
        it('Skip payment reminder if already sent or paid', async () => {
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-skip', title: 'SkipTrip', status: 'ACTIVE' } });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const traveler = await db.user.create({ data: { id: 't-skip', email: 'tskip@test.com', name: 'TS' } });
            const recent = new Date();
            const b1 = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000), lastReminderSentAt: recent } });
            const b2 = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000), paymentStatus: 'PAID' } });
            await notificationJobsService.sendPaymentProofReminders();
            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
        });
    });
    describe('Trip Reminder Emails', () => {
        it('Send 7-day trip reminder', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-rem', title: 'Trip7', status: 'ACTIVE' } });
            const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate, endDate: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000), price: 200, totalSeats: 5, availableSeats: 5 } });
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 200, status: 'CONFIRMED' } });
            await notificationJobsService.sendTripReminders7DaysBefore();
            expect(mockTransporter.sendMail).toHaveBeenCalled();
            const updated = await db.booking.findUnique({ where: { id: booking.id } });
            expect(updated?.notificationsSent?.tripReminder7Days).toBeTruthy();
        });
        it('Send 1-day trip reminder', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-rem1', title: 'Trip1', status: 'ACTIVE' } });
            const startDate = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate, endDate: new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000), price: 200, totalSeats: 5, availableSeats: 5 } });
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 200, status: 'CONFIRMED' } });
            await notificationJobsService.sendTripReminders1DayBefore();
            expect(mockTransporter.sendMail).toHaveBeenCalled();
            const updated = await db.booking.findUnique({ where: { id: booking.id } });
            expect(updated?.notificationsSent?.tripReminder1Day).toBeTruthy();
        });
    });
    describe('Review Request Emails', () => {
        it('Send review request after trip completion', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-r', title: 'ReviewTrip', status: 'ACTIVE' } });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), endDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), price: 100, totalSeats: 5, availableSeats: 5 } });
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'COMPLETED' } });
            await emailService.sendReviewRequest(traveler.email, template.title, 'AgencyName', 'https://example.com/review/1');
            expect(mockTransporter.sendMail).toHaveBeenCalled();
            const call = mockTransporter.sendMail.mock.calls[0][0];
            expect(call.html).toContain(template.title);
            expect(call.html).toContain('AgencyName');
        });
    });
    describe('Auto-Cancellation Emails', () => {
        it('Send auto-cancellation for unpaid booking', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-c', title: 'CancelTrip', status: 'ACTIVE' } });
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
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-c2', title: 'PaidTrip', status: 'ACTIVE' } });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'PENDING', paymentStatus: 'PAID', createdAt: old } });
            await notificationJobsService.autoCancelUnpaidBookings();
            const updated = await db.booking.findUnique({ where: { id: booking.id } });
            expect(updated?.status).not.toBe('CANCELLED');
            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
        });
    });
    describe('Email Failure Handling', () => {
        it('Email failure does not block booking creation', async () => {
            mockTransporter.sendMail.mockImplementationOnce(() => { throw new Error('boom'); });
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-f', title: 'FTrip', status: 'ACTIVE' } });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const traveler = await db.user.create({ data: { id: 't-f', email: 'tf@test.com', name: 'TF' } });
            const res = await request(app.getHttpServer()).post('/bookings').set('Authorization', 'Bearer traveler').send({ sessionId: session.id, guestsCount: 1, fullName: 'F', phoneNumber: '+1', documentNumber: 'D', paymentMethod: 'BANK_TRANSFER' }).expect(201);
            expect(res.body.id).toBeDefined();
        });
        it('Notification job continues after individual email failure', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-j', title: 'JobTrip', status: 'ACTIVE' } });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const b1 = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000) } });
            const b2 = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000) } });
            const b3 = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000) } });
            let callIndex = 0;
            mockTransporter.sendMail.mockImplementation(() => {
                callIndex += 1;
                if (callIndex === 2)
                    throw new Error('boom');
                return { messageId: 'ok' };
            });
            await notificationJobsService.sendPaymentProofReminders();
            expect(mockTransporter.sendMail).toHaveBeenCalled();
        });
    });
    describe('Email Personalization', () => {
        it('Welcome email includes user name', async () => {
            const user = await db.user.create({ data: { id: 'u-per', email: 'u@p.com', name: 'Alice Smith', role: types_1.UserRole.Traveler } });
            await emailService.sendWelcomeEmail(user.email, user.name);
            expect(mockTransporter.sendMail).toHaveBeenCalled();
            const html = mockTransporter.sendMail.mock.calls[0][0].html;
            expect(html).toContain('Alice Smith');
            expect(html).toMatch(/Welcome to Ouiboo/i);
        });
        it('Payment reminder includes booking dashboard URL', async () => {
            const { traveler } = await seedUsersForReminder();
            const template = await db.tripTemplate.create({ data: { agencyId: 'ap-url', title: 'UrlTrip', status: 'ACTIVE' } });
            const session = await db.tripSession.create({ data: { templateId: template.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const booking = await db.booking.create({ data: { sessionId: session.id, travelerId: traveler.id, guestsCount: 1, totalAmount: 100, status: 'AWAITING_VALIDATION', createdAt: new Date(Date.now() - 13 * 60 * 60 * 1000) } });
            await notificationJobsService.sendPaymentProofReminders();
            const html = mockTransporter.sendMail.mock.calls[0][0].html;
            expect(html).toContain(`/bookings/${booking.id}`);
        });
    });
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
            const otpHtml = emailService.getOTPTemplate('0000');
            const subject = emailService.generateOTPSubject();
            expect(subject.toLowerCase()).toMatch(/verify/);
        });
    });
    describe('Complete Email Flow Integration', () => {
        it('Full booking lifecycle emails', async () => {
            const trav = await db.user.create({ data: { id: 'trav-int', email: 'travint@test.com', name: 'TI', role: types_1.UserRole.Traveler } });
            await emailService.sendOTP(trav.email, '0000');
            await emailService.sendWelcomeEmail(trav.email, trav.name);
            const agencyUser = await db.user.create({ data: { id: 'ag-int', email: 'agint@test.com', name: 'AG', role: types_1.UserRole.Agency } });
            const ap = await db.agencyProfile.create({ data: { id: 'ap-int', userId: agencyUser.id, companyName: 'AG' } });
            const tpl = await db.tripTemplate.create({ data: { agencyId: ap.id, title: 'FlowTrip', status: 'ACTIVE' } });
            const sess = await db.tripSession.create({ data: { templateId: tpl.id, startDate: new Date(), endDate: new Date(), price: 100, totalSeats: 5, availableSeats: 5 } });
            const bookingRes = await request(app.getHttpServer()).post('/bookings').set('Authorization', 'Bearer traveler').send({ sessionId: sess.id, guestsCount: 1, fullName: 'X', phoneNumber: '+', documentNumber: 'D', paymentMethod: 'BANK_TRANSFER' }).expect(201);
            await request(app.getHttpServer()).patch(`/bookings/${bookingRes.body.id}/verify-payment`).set('Authorization', 'Bearer agency').send({ approved: true }).expect(200);
            expect(mockTransporter.sendMail.mock.calls.length).toBeGreaterThanOrEqual(3);
        });
        it('Password reset flow emails', async () => {
            const u = await db.user.create({ data: { id: 'u-pr', email: 'upr@test.com', name: 'UP', role: types_1.UserRole.Traveler } });
            await emailService.sendPasswordResetEmail(u.email, 'https://example.com/reset?token=tok');
            expect(mockTransporter.sendMail).toHaveBeenCalled();
        });
    });
    describe('Email Configuration', () => {
        it('EmailService initializes with SMTP when configured', () => {
            process.env.SMTP_HOST = 'smtp.x';
            process.env.SMTP_PORT = '465';
            process.env.SMTP_USER = 'u';
            process.env.SMTP_PASS = 'p';
            const spy = jest.spyOn(console, 'log').mockImplementation(() => { });
            const svc = new email_service_1.EmailService();
            expect(nodemailer.createTransport).toHaveBeenCalled();
            spy.mockRestore();
        });
        it('EmailService falls back to console when SMTP missing', () => {
            delete process.env.SMTP_HOST;
            delete process.env.SMTP_USER;
            const spy = jest.spyOn(console, 'warn').mockImplementation(() => { });
            const svc = new email_service_1.EmailService();
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });
    async function seedUsersForReminder() {
        const traveler = await db.user.create({ data: { id: `trav-rem-${Date.now()}`, email: `trav${Date.now()}@test.com`, name: 'RemTraveler', role: types_1.UserRole.Traveler } });
        return { traveler };
    }
});
//# sourceMappingURL=email-notifications.e2e-spec.js.map