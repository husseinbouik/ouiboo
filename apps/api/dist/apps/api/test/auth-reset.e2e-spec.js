"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const supertest_1 = require("supertest");
const auth_controller_1 = require("../src/auth/auth.controller");
const auth_service_1 = require("../src/auth/auth.service");
describe('E2E: auth login + password reset', () => {
    let app;
    const authService = {
        validateUser: jest.fn(),
        login: jest.fn(),
        requestPasswordReset: jest.fn(),
        resetPassword: jest.fn(),
    };
    beforeAll(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [auth_controller_1.AuthController],
            providers: [{ provide: auth_service_1.AuthService, useValue: authService }],
        }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await app.close();
    });
    it('logs in and returns tokens', async () => {
        authService.validateUser.mockResolvedValue({
            id: 'user-123',
            email: 'traveler@example.com',
            role: 'TRAVELER',
        });
        authService.login.mockResolvedValue({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        });
        await (0, supertest_1.default)(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'traveler@example.com', password: 'Password123!' })
            .expect(201)
            .expect(({ body }) => {
            expect(body).toEqual({
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            });
        });
    });
    it('requests a password reset', async () => {
        authService.requestPasswordReset.mockResolvedValue({
            message: 'If an account exists, a reset link has been sent.',
        });
        await (0, supertest_1.default)(app.getHttpServer())
            .post('/auth/forgot-password')
            .send({ email: 'traveler@example.com' })
            .expect(201)
            .expect(({ body }) => {
            expect(body).toEqual({
                message: 'If an account exists, a reset link has been sent.',
            });
        });
    });
    it('resets a password with a token', async () => {
        authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully' });
        await (0, supertest_1.default)(app.getHttpServer())
            .post('/auth/reset-password')
            .send({
            email: 'traveler@example.com',
            token: 'reset-token',
            newPassword: 'NewPassword123!',
        })
            .expect(201)
            .expect(({ body }) => {
            expect(body).toEqual({ message: 'Password reset successfully' });
        });
    });
});
//# sourceMappingURL=auth-reset.e2e-spec.js.map