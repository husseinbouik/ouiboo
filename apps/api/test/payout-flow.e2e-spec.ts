import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AgencyController } from '../src/agency/agency.controller';
import { AdminController } from '../src/admin/admin.controller';
import { DatabaseService } from '../src/database/database.service';
import { WalletsService } from '../src/wallets/wallets.service';
import { EmailService } from '../src/email/email.service';
import { AuditLogService } from '../src/admin/audit-log.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { TenantGuard } from '../src/auth/guards/tenant.guard';

describe('E2E: payout request + admin processing', () => {
    let app: INestApplication;

    const walletsService = {
        requestPayout: jest.fn(),
    };

    const dbMock = {
        payoutRequest: {
            update: jest.fn(),
        },
    };

    const emailService = {
        sendPaymentConfirmation: jest.fn(),
    };

    const auditLogService = {
        log: jest.fn().mockResolvedValue(null),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [AgencyController, AdminController],
            providers: [
                { provide: WalletsService, useValue: walletsService },
                { provide: DatabaseService, useValue: dbMock },
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
                        : { userId: 'agency-user', email: 'agency@example.com', role: 'AGENCY' };
                    req.tenantId = 'agency-123';
                    return true;
                },
            })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(TenantGuard)
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

    it('creates a payout request for an agency', async () => {
        walletsService.requestPayout.mockResolvedValue({
            id: 'payout-123',
            status: 'PENDING',
            amount: 500,
            bankDetails: 'Bank Populaire - RIB 123',
        });

        await request(app.getHttpServer())
            .post('/agency/payouts')
            .send({ amount: 500, bankDetails: 'Bank Populaire - RIB 123' })
            .expect(201)
            .expect(({ body }) => {
                expect(body).toMatchObject({
                    id: 'payout-123',
                    status: 'PENDING',
                    amount: 500,
                });
            });
    });

    it('processes a payout request as admin', async () => {
        dbMock.payoutRequest.update.mockResolvedValue({
            id: 'payout-123',
            status: 'PAID',
            processedAt: new Date(),
        });

        await request(app.getHttpServer())
            .post('/admin/payouts/payout-123/process')
            .send({ status: 'PAID' })
            .expect(201)
            .expect(({ body }) => {
                expect(body).toMatchObject({
                    id: 'payout-123',
                    status: 'PAID',
                });
            });

        expect(auditLogService.log).toHaveBeenCalled();
    });
});
