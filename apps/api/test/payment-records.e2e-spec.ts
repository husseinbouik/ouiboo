import {
    INestApplication,
    UnauthorizedException,
    ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '@ouiboo/types';
import * as request from 'supertest';
import { AdminController } from '../src/admin/admin.controller';
import { AuditLogService } from '../src/admin/audit-log.service';
import { AgencyController } from '../src/agency/agency.controller';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { TenantGuard } from '../src/auth/guards/tenant.guard';
import { DatabaseModule } from '../src/database/database.module';
import { DatabaseService } from '../src/database/database.service';
import { EmailService } from '../src/email/email.service';
import { PaymentsService } from '../src/payments/payments.service';
import {
    ExternalPaymentsModule,
} from '../src/external-payments/external-payments.module';
import { ExternalPaymentsService } from '../src/external-payments/external-payments.service';
import { StagedPaymentsModule } from '../src/staged-payments/staged-payments.module';
import { PaymentCustodian, PaymentLedgerSource, PaymentMethod } from '@ouiboo/database';

jest.setTimeout(60_000);

/**
 * #368 — Phase 1 payment-status model.
 *
 * The traveller-money withdrawal path (agency payout requests + admin payout
 * processing) is gone, and verified traveller payments are recorded as
 * ExternalPayment facts with the agency as custodian — never as a
 * withdrawable OuiBoo wallet balance.
 */
describe('E2E: payment records replace the traveller-money wallet', () => {
    let app: INestApplication;
    let db: DatabaseService;
    let externalPayments: ExternalPaymentsService;

    const auditLogService = { log: jest.fn().mockResolvedValue(null) };
    const emailService = { sendPaymentConfirmation: jest.fn().mockResolvedValue(true) };
    const paymentsService = { refundBookingById: jest.fn() };

    const AGENCY_PROFILE_ID = 'agency-payments-profile';
    const BOOKING_ID = 'booking-payments-1';

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [DatabaseModule, ExternalPaymentsModule, StagedPaymentsModule],
            controllers: [AgencyController, AdminController],
            providers: [
                RolesGuard,
                TenantGuard,
                { provide: EmailService, useValue: emailService },
                { provide: AuditLogService, useValue: auditLogService },
                { provide: PaymentsService, useValue: paymentsService },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    const authorization = String(req.headers.authorization || '');
                    if (authorization.includes('admin')) {
                        req.user = {
                            id: 'admin-payments-user',
                            userId: 'admin-payments-user',
                            email: 'admin-payments@ouiboo.test',
                            role: UserRole.Admin,
                        };
                    } else if (authorization.includes('agency')) {
                        req.user = {
                            id: 'agency-payments-user',
                            userId: 'agency-payments-user',
                            email: 'agency-payments@ouiboo.test',
                            role: UserRole.Agency,
                        };
                    } else {
                        throw new UnauthorizedException();
                    }
                    return true;
                },
            })
            .compile();

        app = moduleRef.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }));
        await app.init();
        db = app.get(DatabaseService);
        externalPayments = app.get(ExternalPaymentsService);
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await clearDatabase();
        await seedAgencyAndBooking();
    });

    afterAll(async () => {
        if (db) await clearDatabase();
        if (app) await app.close();
    });

    async function clearDatabase() {
        await db.paymentStatusLedgerEntry.deleteMany({ where: { agencyId: AGENCY_PROFILE_ID } });
        await db.externalPayment.deleteMany({ where: { agencyId: AGENCY_PROFILE_ID } });
        await db.booking.deleteMany({ where: { id: BOOKING_ID } });
        await db.tripSession.deleteMany({ where: { id: 'session-payments-1' } });
        await db.tripTemplate.deleteMany({ where: { id: 'template-payments-1' } });
        await db.agencyProfile.deleteMany({ where: { id: AGENCY_PROFILE_ID } });
        await db.user.deleteMany({ where: { id: { in: ['admin-payments-user', 'agency-payments-user', 'traveler-payments-user'] } } });
    }

    async function seedAgencyAndBooking() {
        await db.user.createMany({
            data: [
                {
                    id: 'agency-payments-user',
                    email: 'agency-payments@ouiboo.test',
                    name: 'Payments Agency',
                    password: 'test',
                    role: UserRole.Agency,
                    isEmailVerified: true,
                },
                {
                    id: 'admin-payments-user',
                    email: 'admin-payments@ouiboo.test',
                    name: 'Payments Admin',
                    password: 'test',
                    role: UserRole.Admin,
                    isEmailVerified: true,
                },
                {
                    id: 'traveler-payments-user',
                    email: 'traveler-payments@ouiboo.test',
                    name: 'Payments Traveler',
                    password: 'test',
                    role: UserRole.Traveler,
                    isEmailVerified: true,
                },
            ],
        });
        await db.agencyProfile.create({
            data: {
                id: AGENCY_PROFILE_ID,
                userId: 'agency-payments-user',
                companyName: 'Payments Agency',
                ice: 'PAYMENTS-ICE-0001',
                patente: 'PAYMENTS-PATENTE-0001',
                rib: 'PAYMENTS-RIB-000000000001',
                bankDetails: 'Verified account ending 0001',
                verificationStatus: 'VERIFIED',
                subscriptionStatus: 'TRIAL',
                trialEndsAt: new Date(Date.now() + 7 * 86_400_000),
            },
        });
        await db.tripTemplate.create({
            data: {
                id: 'template-payments-1',
                agencyId: AGENCY_PROFILE_ID,
                title: 'Payments Test Trip',
                description: 'Seed trip for payment record tests',
                category: 'ADVENTURE',
                startLocation: 'Marrakech',
                durationDays: 2,
                durationNights: 1,
                inclusions: [],
                exclusions: [],
                checklist: [],
                images: [],
                status: 'ACTIVE',
            },
        });
        await db.tripSession.create({
            data: {
                id: 'session-payments-1',
                templateId: 'template-payments-1',
                agencyId: AGENCY_PROFILE_ID,
                startDate: new Date(Date.now() + 7 * 86_400_000),
                endDate: new Date(Date.now() + 9 * 86_400_000),
                price: 390,
                totalSeats: 10,
                availableSeats: 10,
                status: 'OPEN',
            },
        });
        await db.booking.create({
            data: {
                id: BOOKING_ID,
                sessionId: 'session-payments-1',
                agencyId: AGENCY_PROFILE_ID,
                travelerId: 'traveler-payments-user',
                guestsCount: 2,
                totalAmount: 780,
                currency: 'MAD',
                status: 'CONFIRMED',
                paymentStatus: 'PAID',
                paymentMethod: 'MANUAL',
            },
        });
    }

    it('has no traveller-money withdrawal endpoints anymore', async () => {
        await request(app.getHttpServer())
            .post('/agency/payouts')
            .set('Authorization', 'Bearer agency')
            .send({ amount: 100, bankDetails: 'Verified account ending 0001' })
            .expect(404);

        await request(app.getHttpServer())
            .get('/agency/payouts')
            .set('Authorization', 'Bearer agency')
            .expect(404);

        await request(app.getHttpServer())
            .get('/admin/payout-requests')
            .set('Authorization', 'Bearer admin')
            .expect(404);

        await request(app.getHttpServer())
            .post('/admin/payouts/some-id/process')
            .set('Authorization', 'Bearer admin')
            .send({ status: 'PAID' })
            .expect(404);
    });

    it('returns an empty payments overview for an agency with no payments', async () => {
        await request(app.getHttpServer())
            .get('/agency/payments/overview')
            .set('Authorization', 'Bearer agency')
            .expect(200)
            .expect(({ body }) => {
                expect(body.totalReceived).toBe('0.00');
                expect(body.totalRefunded).toBe('0.00');
                expect(body.pendingVerificationCount).toBe(0);
            });

        await request(app.getHttpServer())
            .get('/agency/payments')
            .set('Authorization', 'Bearer agency')
            .expect(200)
            .expect(({ body }) => {
                expect(body.data).toHaveLength(0);
                expect(body.pagination.total).toBe(0);
            });
    });

    it('records a verified payment as an external fact and never creates a wallet', async () => {
        const record = {
            bookingId: BOOKING_ID,
            agencyId: AGENCY_PROFILE_ID,
            travelerId: 'traveler-payments-user',
            amount: 780,
            currency: 'MAD',
            method: PaymentMethod.MANUAL,
            externalReference: 'proof-payments-1',
            custodian: PaymentCustodian.AGENCY,
            source: PaymentLedgerSource.MANUAL_PROOF_REVIEW,
        };

        await db.$transaction((tx) => externalPayments.recordPaymentVerifiedInTransaction(tx, record));
        // Idempotency: recording the same verified payment again must not
        // duplicate the ledger entry.
        await db.$transaction((tx) => externalPayments.recordPaymentVerifiedInTransaction(tx, record));

        const payment = await db.externalPayment.findUniqueOrThrow({ where: { bookingId_stage: { bookingId: BOOKING_ID, stage: 'FULL' } } });
        expect(payment.status).toBe('VERIFIED');
        expect(payment.custodian).toBe('AGENCY');
        expect(payment.amount.toNumber()).toBe(780);

        const entries = await db.paymentStatusLedgerEntry.findMany({ where: { bookingId: BOOKING_ID } });
        expect(entries).toHaveLength(1);
        expect(entries[0].type).toBe('PAYMENT_VERIFIED');

        // The invariant: no wallet row — and therefore no withdrawable
        // balance — exists for this agency.
        expect(await db.wallet.count({ where: { agencyId: AGENCY_PROFILE_ID } })).toBe(0);

        await request(app.getHttpServer())
            .get('/agency/payments/overview')
            .set('Authorization', 'Bearer agency')
            .expect(200)
            .expect(({ body }) => {
                expect(body.totalReceived).toBe('780.00');
                expect(body.pendingVerificationCount).toBe(0);
            });

        await request(app.getHttpServer())
            .get('/agency/payments')
            .set('Authorization', 'Bearer agency')
            .expect(200)
            .expect(({ body }) => {
                expect(body.data).toHaveLength(1);
                expect(body.data[0]).toMatchObject({
                    bookingId: BOOKING_ID,
                    status: 'VERIFIED',
                    custodian: 'AGENCY',
                    amount: '780.00',
                });
            });
    });

    it('refuses to record traveller funds with OuiBoo as custodian', async () => {
        await expect(
            db.$transaction((tx) => externalPayments.recordPaymentVerifiedInTransaction(tx, {
                bookingId: BOOKING_ID,
                agencyId: AGENCY_PROFILE_ID,
                travelerId: 'traveler-payments-user',
                amount: 780,
                currency: 'MAD',
                method: PaymentMethod.MANUAL,
                custodian: 'OUIBOO' as PaymentCustodian,
                source: PaymentLedgerSource.MANUAL_PROOF_REVIEW,
            })),
        ).rejects.toThrow(/never by OuiBoo/);

        expect(await db.externalPayment.count({ where: { bookingId: BOOKING_ID } })).toBe(0);
    });
});
