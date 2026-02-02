"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const supertest_1 = require("supertest");
const agency_controller_1 = require("../src/agency/agency.controller");
const admin_controller_1 = require("../src/admin/admin.controller");
const database_service_1 = require("../src/database/database.service");
const wallets_service_1 = require("../src/wallets/wallets.service");
const email_service_1 = require("../src/email/email.service");
const audit_log_service_1 = require("../src/admin/audit-log.service");
const jwt_auth_guard_1 = require("../src/auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../src/auth/guards/roles.guard");
const tenant_guard_1 = require("../src/auth/guards/tenant.guard");
describe('E2E: payout request + admin processing', () => {
    let app;
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
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [agency_controller_1.AgencyController, admin_controller_1.AdminController],
            providers: [
                { provide: wallets_service_1.WalletsService, useValue: walletsService },
                { provide: database_service_1.DatabaseService, useValue: dbMock },
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
                    : { userId: 'agency-user', email: 'agency@example.com', role: 'AGENCY' };
                req.tenantId = 'agency-123';
                return true;
            },
        })
            .overrideGuard(roles_guard_1.RolesGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(tenant_guard_1.TenantGuard)
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
        await (0, supertest_1.default)(app.getHttpServer())
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
        await (0, supertest_1.default)(app.getHttpServer())
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
//# sourceMappingURL=payout-flow.e2e-spec.js.map