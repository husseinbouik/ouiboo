"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const request = require("supertest");
const path = require("path");
const bookings_controller_1 = require("../src/bookings/bookings.controller");
const bookings_service_1 = require("../src/bookings/bookings.service");
const admin_controller_1 = require("../src/admin/admin.controller");
const database_service_1 = require("../src/database/database.service");
const wallets_service_1 = require("../src/wallets/wallets.service");
const email_service_1 = require("../src/email/email.service");
const audit_log_service_1 = require("../src/admin/audit-log.service");
const jwt_auth_guard_1 = require("../src/auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../src/auth/guards/roles.guard");
describe('E2E: booking + payment approval flow', () => {
    let app;
    const bookingsService = {
        create: jest.fn(),
        uploadPaymentProof: jest.fn(),
    };
    const dbMock = {
        paymentProof: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        booking: {
            update: jest.fn(),
        },
        $transaction: jest.fn((cb) => cb(dbMock)),
    };
    const walletsService = {
        creditWallet: jest.fn(),
    };
    const emailService = {
        sendPaymentConfirmation: jest.fn(),
    };
    const auditLogService = {
        log: jest.fn().mockResolvedValue(null),
    };
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [bookings_controller_1.BookingsController, admin_controller_1.AdminController],
            providers: [
                { provide: bookings_service_1.BookingsService, useValue: bookingsService },
                { provide: database_service_1.DatabaseService, useValue: dbMock },
                { provide: wallets_service_1.WalletsService, useValue: walletsService },
                { provide: email_service_1.EmailService, useValue: emailService },
                { provide: audit_log_service_1.AuditLogService, useValue: auditLogService },
            ],
        })
            .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
            .useValue({
            canActivate: (context) => {
                const req = context.switchToHttp().getRequest();
                const isAdminRoute = req.url?.startsWith('/admin');
                req.user = isAdminRoute
                    ? { userId: 'admin-123', email: 'admin@ouiboo.local', role: 'ADMIN' }
                    : { userId: 'traveler-123', email: 'traveler@example.com', role: 'TRAVELER' };
                return true;
            },
        })
            .overrideGuard(roles_guard_1.RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await app.close();
    });
    it('creates a booking and uploads a payment proof', async () => {
        bookingsService.create.mockResolvedValue({
            id: 'booking-123',
            status: 'PENDING',
        });
        bookingsService.uploadPaymentProof.mockResolvedValue({
            id: 'proof-123',
            status: 'PENDING',
        });
        await request(app.getHttpServer())
            .post('/bookings')
            .send({ sessionId: 'session-abc', guestsCount: 2 })
            .expect(201)
            .expect(({ body }) => {
            expect(body).toMatchObject({ id: 'booking-123', status: 'PENDING' });
        });
        const fixturePath = path.join(__dirname, 'fixtures', 'proof.png');
        await request(app.getHttpServer())
            .post('/bookings/booking-123/payment-proof')
            .attach('file', fixturePath)
            .expect(201)
            .expect(({ body }) => {
            expect(body).toMatchObject({ id: 'proof-123', status: 'PENDING' });
        });
    });
    it('approves a payment proof and logs the action', async () => {
        dbMock.paymentProof.findUnique.mockResolvedValue({
            id: 'proof-123',
            status: 'PENDING',
            bookingId: 'booking-123',
            booking: {
                id: 'booking-123',
                status: 'AWAITING_VALIDATION',
                totalAmount: 780,
                traveler: { email: 'traveler@example.com' },
                session: { template: { agencyId: 'agency-123', title: 'Atlas Escape' } },
            },
        });
        dbMock.paymentProof.update.mockResolvedValue({
            id: 'proof-123',
            status: 'VERIFIED',
        });
        dbMock.booking.update.mockResolvedValue({
            id: 'booking-123',
            status: 'CONFIRMED',
            totalAmount: 780,
            session: { template: { agencyId: 'agency-123', title: 'Atlas Escape' } },
        });
        await request(app.getHttpServer())
            .post('/admin/payments/proof-123/verify')
            .send({ status: 'VERIFIED' })
            .expect(201)
            .expect(({ body }) => {
            expect(body).toMatchObject({ id: 'proof-123', status: 'VERIFIED' });
        });
        expect(walletsService.creditWallet).toHaveBeenCalled();
        expect(emailService.sendPaymentConfirmation).toHaveBeenCalled();
        expect(auditLogService.log).toHaveBeenCalled();
    });
    it('requires a rejection reason when rejecting a payment proof', async () => {
        await request(app.getHttpServer())
            .post('/admin/payments/proof-123/verify')
            .send({ status: 'REJECTED' })
            .expect(400);
    });
});
//# sourceMappingURL=booking-approval.e2e-spec.js.map