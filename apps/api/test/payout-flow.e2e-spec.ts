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
import { WalletsModule } from '../src/wallets/wallets.module';

jest.setTimeout(60_000);

describe('E2E: payout request + admin processing', () => {
    let app: INestApplication;
    let db: DatabaseService;

    const auditLogService = { log: jest.fn().mockResolvedValue(null) };
    const emailService = { sendPaymentConfirmation: jest.fn().mockResolvedValue(true) };
    const paymentsService = { refundBookingById: jest.fn() };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [DatabaseModule, WalletsModule],
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
                            id: 'admin-payout-user',
                            userId: 'admin-payout-user',
                            email: 'admin-payout@ouiboo.test',
                            role: UserRole.Admin,
                        };
                    } else if (authorization.includes('agency')) {
                        req.user = {
                            id: 'agency-payout-user',
                            userId: 'agency-payout-user',
                            email: 'agency-payout@ouiboo.test',
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
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await clearDatabase();
        await seedAgencyWallet();
    });

    afterAll(async () => {
        if (db) await clearDatabase();
        if (app) await app.close();
    });

    async function clearDatabase() {
        await db.auditLog.deleteMany({ where: { actorId: { in: ['admin-payout-user', 'agency-payout-user'] } } });
        await db.payoutRequest.deleteMany({ where: { agencyId: 'agency-payout-profile' } });
        await db.walletTransaction.deleteMany({ where: { wallet: { agencyId: 'agency-payout-profile' } } });
        await db.wallet.deleteMany({ where: { agencyId: 'agency-payout-profile' } });
        await db.agencyProfile.deleteMany({ where: { id: 'agency-payout-profile' } });
        await db.user.deleteMany({ where: { id: { in: ['admin-payout-user', 'agency-payout-user'] } } });
    }

    async function seedAgencyWallet() {
        await db.user.createMany({
            data: [
                {
                    id: 'agency-payout-user',
                    email: 'agency-payout@ouiboo.test',
                    name: 'Payout Agency',
                    password: 'test',
                    role: UserRole.Agency,
                    isEmailVerified: true,
                },
                {
                    id: 'admin-payout-user',
                    email: 'admin-payout@ouiboo.test',
                    name: 'Payout Admin',
                    password: 'test',
                    role: UserRole.Admin,
                    isEmailVerified: true,
                },
            ],
        });
        await db.agencyProfile.create({
            data: {
                id: 'agency-payout-profile',
                userId: 'agency-payout-user',
                companyName: 'Payout Agency',
                ice: 'PAYOUT-ICE-0001',
                patente: 'PAYOUT-PATENTE-0001',
                rib: 'PAYOUT-RIB-000000000001',
                bankDetails: 'Verified account ending 0001',
                verificationStatus: 'VERIFIED',
                subscriptionStatus: 'TRIAL',
                trialEndsAt: new Date(Date.now() + 7 * 86_400_000),
            },
        });
        await db.wallet.create({
            data: {
                agencyId: 'agency-payout-profile',
                availableBalance: 1000,
            },
        });
    }

    const agencyRequest = () => request(app.getHttpServer())
        .post('/agency/payouts')
        .set('Authorization', 'Bearer agency');

    it('reserves funds when a verified agency requests a payout', async () => {
        const response = await agencyRequest()
            .send({ amount: 500, bankDetails: 'Verified account ending 0001' })
            .expect(201);

        expect(response.body).toMatchObject({ status: 'PENDING' });
        expect(Number(response.body.amount)).toBe(500);

        const wallet = await db.wallet.findUniqueOrThrow({
            where: { agencyId: 'agency-payout-profile' },
            include: { transactions: true },
        });
        expect(wallet.availableBalance.toNumber()).toBe(500);
        expect(wallet.transactions).toHaveLength(1);
        expect(wallet.transactions[0].amount.toNumber()).toBe(-500);
    });

    it('returns payout history with pagination metadata', async () => {
        for (let index = 0; index < 3; index++) {
            await agencyRequest()
                .send({ amount: 100, bankDetails: 'Verified account ending 0001' })
                .expect(201);
        }

        const firstPage = await request(app.getHttpServer())
            .get('/agency/payouts?page=1&limit=2')
            .set('Authorization', 'Bearer agency')
            .expect(200);

        expect(firstPage.body.pagination).toEqual({ total: 3, page: 1, limit: 2, totalPages: 2 });
        expect(firstPage.body.data).toHaveLength(2);
        expect(firstPage.body.data[0]).toMatchObject({ agencyId: 'agency-payout-profile', status: 'PENDING' });

        const secondPage = await request(app.getHttpServer())
            .get('/agency/payouts?page=2&limit=2')
            .set('Authorization', 'Bearer agency')
            .expect(200);

        expect(secondPage.body.pagination).toEqual({ total: 3, page: 2, limit: 2, totalPages: 2 });
        expect(secondPage.body.data).toHaveLength(1);
    });

    it('rejects payout details that do not match the verified agency profile', async () => {
        await agencyRequest()
            .send({ amount: 100, bankDetails: 'Attacker controlled account' })
            .expect(400);

        const wallet = await db.wallet.findUniqueOrThrow({ where: { agencyId: 'agency-payout-profile' } });
        expect(wallet.availableBalance.toNumber()).toBe(1000);
        expect(await db.payoutRequest.count({ where: { agencyId: 'agency-payout-profile' } })).toBe(0);
    });

    it('marks a payout paid without returning the reserved funds', async () => {
        const payout = await agencyRequest()
            .send({ amount: 500, bankDetails: 'Verified account ending 0001' })
            .expect(201);

        await request(app.getHttpServer())
            .post(`/admin/payouts/${payout.body.id}/process`)
            .set('Authorization', 'Bearer admin')
            .send({ status: 'PAID' })
            .expect(201)
            .expect(({ body }) => expect(body.status).toBe('PAID'));

        const wallet = await db.wallet.findUniqueOrThrow({ where: { agencyId: 'agency-payout-profile' } });
        expect(wallet.availableBalance.toNumber()).toBe(500);
        expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
            action: 'PAYOUT_PROCESSED',
            targetId: payout.body.id,
        }));
    });

    it('restores a rejected payout exactly once under concurrent processing', async () => {
        const payout = await agencyRequest()
            .send({ amount: 300, bankDetails: 'Verified account ending 0001' })
            .expect(201);

        const process = () => request(app.getHttpServer())
            .post(`/admin/payouts/${payout.body.id}/process`)
            .set('Authorization', 'Bearer admin')
            .send({ status: 'REJECTED' });
        const responses = await Promise.all([process(), process()]);
        expect(responses.map((response) => response.status).sort()).toEqual([201, 400]);

        const wallet = await db.wallet.findUniqueOrThrow({
            where: { agencyId: 'agency-payout-profile' },
            include: { transactions: true },
        });
        expect(wallet.availableBalance.toNumber()).toBe(1000);
        expect(wallet.transactions).toHaveLength(2);
        expect(wallet.transactions.reduce((total, transaction) => total + transaction.amount.toNumber(), 0)).toBe(0);
        expect(await db.walletTransaction.count({
            where: { idempotencyKey: `payout:${payout.body.id}:rejection-credit` },
        })).toBe(1);
    });

    it('enforces role and authentication on payout processing', async () => {
        await request(app.getHttpServer())
            .post('/admin/payouts/not-owned/process')
            .set('Authorization', 'Bearer agency')
            .send({ status: 'PAID' })
            .expect(403);

        await request(app.getHttpServer())
            .post('/agency/payouts')
            .send({ amount: 100, bankDetails: 'Verified account ending 0001' })
            .expect(401);
    });
});
