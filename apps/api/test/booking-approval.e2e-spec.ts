import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as path from 'path';
import { BookingsController } from '../src/bookings/bookings.controller';
import { BookingsService } from '../src/bookings/bookings.service';
import { AdminController } from '../src/admin/admin.controller';
import { DatabaseService } from '../src/database/database.service';
import { WalletsService } from '../src/wallets/wallets.service';
import { EmailService } from '../src/email/email.service';
import { AuditLogService } from '../src/admin/audit-log.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';

describe('E2E: booking + payment approval flow', () => {
    let app: INestApplication;

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
        $transaction: jest.fn((cb: any) => cb(dbMock)),
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
        const moduleRef = await Test.createTestingModule({
            controllers: [BookingsController, AdminController],
            providers: [
                { provide: BookingsService, useValue: bookingsService },
                { provide: DatabaseService, useValue: dbMock },
                { provide: WalletsService, useValue: walletsService },
                { provide: EmailService, useValue: emailService },
                { provide: AuditLogService, useValue: auditLogService },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    const isAdminRoute = req.url?.startsWith('/admin');
                    req.user = isAdminRoute
                        ? { userId: 'admin-123', email: 'admin@ouiboo.local', role: 'ADMIN' }
                        : { userId: 'traveler-123', email: 'traveler@example.com', role: 'TRAVELER' };
                    return true;
                },
            })
            .overrideGuard(RolesGuard)
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
