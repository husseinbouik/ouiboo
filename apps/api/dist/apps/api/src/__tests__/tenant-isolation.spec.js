"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const supertest_1 = require("supertest");
const agency_controller_1 = require("../agency/agency.controller");
const database_service_1 = require("../database/database.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const tenant_guard_1 = require("../auth/guards/tenant.guard");
const types_1 = require("@ouiboo/types");
describe('Tenant isolation (agency scope)', () => {
    let app;
    const trips = [
        { id: 'trip-a', agencyId: 'agency-a', title: 'Agency A Trip' },
        { id: 'trip-b', agencyId: 'agency-b', title: 'Agency B Trip' },
    ];
    const bookings = [
        {
            id: 'booking-a',
            session: { template: { agencyId: 'agency-a', title: 'A Trip' } },
            traveler: { name: 'Traveler A', email: 'a@example.com' },
            paymentProof: null,
            bookingDate: new Date('2024-01-01'),
        },
        {
            id: 'booking-b',
            session: { template: { agencyId: 'agency-b', title: 'B Trip' } },
            traveler: { name: 'Traveler B', email: 'b@example.com' },
            paymentProof: null,
            bookingDate: new Date('2024-01-02'),
        },
    ];
    const dbMock = {
        agencyProfile: {
            findUnique: jest.fn(),
        },
        tripTemplate: {
            findMany: jest.fn(({ where }) => trips.filter((trip) => trip.agencyId === where.agencyId)),
        },
        booking: {
            findMany: jest.fn(({ where }) => bookings.filter((booking) => booking.session.template.agencyId === where.session.template.agencyId)),
        },
    };
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [agency_controller_1.AgencyController],
            providers: [
                tenant_guard_1.TenantGuard,
                { provide: database_service_1.DatabaseService, useValue: dbMock },
            ],
        })
            .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
            .useValue({
            canActivate: (context) => {
                const req = context.switchToHttp().getRequest();
                const tenantId = req.header('x-tenant-id');
                req.user = { userId: `user-${tenantId}`, role: types_1.UserRole.Agency, tenantId };
                return true;
            },
        })
            .overrideGuard(roles_guard_1.RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });
    afterAll(async () => {
        await app.close();
    });
    it('returns only trips for the tenant agency', async () => {
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/agency/trips')
            .set('x-tenant-id', 'agency-a')
            .expect(200)
            .expect(({ body }) => {
            expect(body).toHaveLength(1);
            expect(body[0]).toMatchObject({ id: 'trip-a', agencyId: 'agency-a' });
        });
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/agency/trips')
            .set('x-tenant-id', 'agency-b')
            .expect(200)
            .expect(({ body }) => {
            expect(body).toHaveLength(1);
            expect(body[0]).toMatchObject({ id: 'trip-b', agencyId: 'agency-b' });
        });
    });
    it('returns only bookings for the tenant agency', async () => {
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/agency/bookings')
            .set('x-tenant-id', 'agency-a')
            .expect(200)
            .expect(({ body }) => {
            expect(body).toHaveLength(1);
            expect(body[0]).toMatchObject({ id: 'booking-a' });
            expect(body[0].session.template.agencyId).toBe('agency-a');
        });
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/agency/bookings')
            .set('x-tenant-id', 'agency-b')
            .expect(200)
            .expect(({ body }) => {
            expect(body).toHaveLength(1);
            expect(body[0]).toMatchObject({ id: 'booking-b' });
            expect(body[0].session.template.agencyId).toBe('agency-b');
        });
    });
});
//# sourceMappingURL=tenant-isolation.spec.js.map