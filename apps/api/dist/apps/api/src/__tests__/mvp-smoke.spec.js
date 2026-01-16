"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const supertest_1 = require("supertest");
const auth_controller_1 = require("../auth/auth.controller");
const auth_service_1 = require("../auth/auth.service");
const bookings_controller_1 = require("../bookings/bookings.controller");
const bookings_service_1 = require("../bookings/bookings.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
describe('MVP smoke: auth + booking flow', () => {
    let app;
    const authService = {
        validateUser: jest.fn(),
        login: jest.fn(),
        register: jest.fn(),
    };
    const bookingsService = {
        create: jest.fn(),
        findAllByTraveler: jest.fn(),
    };
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [auth_controller_1.AuthController, bookings_controller_1.BookingsController],
            providers: [
                { provide: auth_service_1.AuthService, useValue: authService },
                { provide: bookings_service_1.BookingsService, useValue: bookingsService },
            ],
        })
            .overrideGuard(jwt_auth_guard_1.JwtAuthGuard)
            .useValue({
            canActivate: (context) => {
                const req = context.switchToHttp().getRequest();
                req.user = { userId: 'user-123' };
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
        authService.validateUser.mockReset();
        authService.login.mockReset();
        authService.register.mockReset();
        bookingsService.create.mockReset();
    });
    afterAll(async () => {
        await app.close();
    });
    it('registers, logs in, and creates a booking', async () => {
        authService.register.mockResolvedValue({ id: 'user-123', email: 'traveler@example.com' });
        authService.validateUser.mockResolvedValue({ id: 'user-123', email: 'traveler@example.com' });
        authService.login.mockResolvedValue({ accessToken: 'token', refreshToken: 'refresh' });
        bookingsService.create.mockResolvedValue({
            id: 'booking-456',
            travelerId: 'user-123',
            status: 'pending',
        });
        await (0, supertest_1.default)(app.getHttpServer())
            .post('/auth/register')
            .send({
            email: 'traveler@example.com',
            password: 'Password123!',
            firstName: 'Traveler',
            lastName: 'Test',
        })
            .expect(201)
            .expect(({ body }) => {
            expect(body).toEqual({ id: 'user-123', email: 'traveler@example.com' });
        });
        await (0, supertest_1.default)(app.getHttpServer())
            .post('/auth/login')
            .send({
            email: 'traveler@example.com',
            password: 'Password123!',
        })
            .expect(201)
            .expect(({ body }) => {
            expect(body).toEqual({ accessToken: 'token', refreshToken: 'refresh' });
        });
        await (0, supertest_1.default)(app.getHttpServer())
            .post('/bookings')
            .set('Authorization', 'Bearer token')
            .send({
            sessionId: 'session-abc',
            guestsCount: 2,
        })
            .expect(201)
            .expect(({ body }) => {
            expect(body).toEqual({
                id: 'booking-456',
                travelerId: 'user-123',
                status: 'pending',
            });
        });
    });
});
//# sourceMappingURL=mvp-smoke.spec.js.map