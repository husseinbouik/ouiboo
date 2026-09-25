import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AdminController } from '../admin/admin.controller';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WalletsService } from '../wallets/wallets.service';
import { EmailService } from '../email/email.service';
import { AuditLogService } from '../admin/audit-log.service';
import { PaymentsService } from '../payments/payments.service';

describe('Admin audit smoke', () => {
    let app: INestApplication;

    const findManyMock = jest.fn();
    const countMock = jest.fn().mockResolvedValue(1);
    const deleteManyMock = jest.fn();
    const logMock = jest.fn().mockResolvedValue(undefined);

    const databaseService = {
        auditLog: {
            findMany: findManyMock,
            count: countMock,
            deleteMany: deleteManyMock,
        },
    };

    const walletsService = {
        creditWallet: jest.fn(),
    };

    const emailService = {
        sendPaymentConfirmation: jest.fn(),
    };

    const auditLogService = {
        log: logMock,
    };

    const paymentsService = {
        refundBookingById: jest.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [AdminController],
            providers: [
                { provide: DatabaseService, useValue: databaseService },
                { provide: WalletsService, useValue: walletsService },
                { provide: EmailService, useValue: emailService },
                { provide: AuditLogService, useValue: auditLogService },
                { provide: PaymentsService, useValue: paymentsService },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = { userId: 'admin-1', email: 'admin@example.com' };
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
        findManyMock.mockReset();
        deleteManyMock.mockReset();
        logMock.mockClear();
    });

    afterAll(async () => {
        await app.close();
    });

    it('lists audit logs with search filters', async () => {
        findManyMock.mockResolvedValue([
            {
                id: 'audit-1',
                createdAt: new Date('2026-04-22T10:00:00.000Z'),
                actorId: 'admin-1',
                actorEmail: 'admin@example.com',
                action: 'PAYOUT_PROCESSED',
                targetType: 'PayoutRequest',
                targetId: 'payout-123',
                metadata: { status: 'PAID' },
            },
        ]);

        await request(app.getHttpServer())
            .get('/admin/audit-logs')
            .query({ q: 'payout', limit: 20 })
            .expect(200)
            .expect(({ body }) => {
                expect(body.data).toHaveLength(1);
                expect(body.data[0]).toMatchObject({
                    id: 'audit-1',
                    action: 'PAYOUT_PROCESSED',
                    targetType: 'PayoutRequest',
                });
                expect(body.pagination).toEqual({
                    total: 1,
                    page: 1,
                    limit: 20,
                    totalPages: 1,
                });
            });

        expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                OR: expect.arrayContaining([
                    expect.objectContaining({ action: expect.objectContaining({ contains: 'payout' }) }),
                ]),
            }),
            skip: 0,
            take: 20,
        }));

        expect(countMock).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                OR: expect.arrayContaining([
                    expect.objectContaining({ action: expect.objectContaining({ contains: 'payout' }) }),
                ]),
            }),
        }));
    });

    it('prunes old audit logs using the retention endpoint', async () => {
        deleteManyMock.mockResolvedValue({ count: 4 });

        await request(app.getHttpServer())
            .post('/admin/audit-logs/retention')
            .send({ days: 30 })
            .expect(201)
            .expect(({ body }) => {
                expect(body.deleted).toBe(4);
                expect(body.cutoff).toBeDefined();
            });

        expect(deleteManyMock).toHaveBeenCalled();
        expect(logMock).toHaveBeenCalledWith(expect.objectContaining({
            action: 'AUDIT_LOG_PRUNED',
            actorEmail: 'admin@example.com',
        }));
    });
});
