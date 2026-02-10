"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const request = require("supertest");
const auth_module_1 = require("../src/auth/auth.module");
const database_module_1 = require("../src/database/database.module");
const email_module_1 = require("../src/email/email.module");
const database_service_1 = require("../src/database/database.service");
const email_service_1 = require("../src/email/email.service");
const jwt = require("jsonwebtoken");
jest.setTimeout(60_000);
describe('Auth - Complete E2E (auth-complete.e2e-spec)', () => {
    let app;
    let db;
    const mockEmailService = {
        sendMail: jest.fn(async () => true),
        getOTPTemplate: jest.fn((otp) => `OTP:${otp}`),
        getWelcomeTemplate: jest.fn((name) => `WELCOME:${name}`),
        getPasswordResetTemplate: jest.fn((url) => `RESET:${url}`),
        sendPasswordResetEmail: jest.fn(async () => true),
    };
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [auth_module_1.AuthModule, database_module_1.DatabaseModule, email_module_1.EmailModule],
        })
            .overrideProvider(email_service_1.EmailService)
            .useValue(mockEmailService)
            .compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        db = app.get(database_service_1.DatabaseService);
    });
    afterAll(async () => {
        await clearDatabase();
        await app.close();
    });
    beforeEach(async () => {
        jest.clearAllMocks();
        await clearDatabase();
    });
    async function clearDatabase() {
        if (!db)
            return;
        await db.walletTransaction.deleteMany();
        await db.wallet.deleteMany();
        await db.payoutRequest.deleteMany();
        await db.tripSession.deleteMany();
        await db.tripTemplate.deleteMany();
        await db.agencyProfile.deleteMany();
        await db.refreshToken.deleteMany();
        await db.paymentProof.deleteMany();
        await db.booking.deleteMany();
        await db.user.deleteMany();
    }
    function decodeJwt(token) {
        return jwt.decode(token);
    }
    it('Register TRAVELER and verify OTP flow', async () => {
        const email = 'traveler@example.com';
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password: 'Password123!', name: 'Traveler', role: 'TRAVELER' })
            .expect(201);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
        expect(res.body).toHaveProperty('user');
        expect(mockEmailService.sendMail).toHaveBeenCalled();
        const userInDb = await db.user.findUnique({ where: { email } });
        expect(userInDb).toBeTruthy();
        expect(userInDb?.isEmailVerified).toBe(false);
        expect(userInDb?.otp).toBeTruthy();
        expect(userInDb?.otpExpiresAt).toBeTruthy();
        const otp = userInDb.otp;
        await request(app.getHttpServer())
            .post('/auth/verify-email')
            .send({ email, otp })
            .expect(201)
            .expect(res => {
            expect(res.body).toMatchObject({ message: 'Email verified successfully' });
        });
        const verified = await db.user.findUnique({ where: { email } });
        expect(verified?.isEmailVerified).toBe(true);
        expect(verified?.otp).toBeNull();
        expect(mockEmailService.sendMail).toHaveBeenCalled();
    });
    it('Resend OTP respects cooldown', async () => {
        const email = 'resend@example.com';
        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password: 'Password123!', name: 'Test', role: 'TRAVELER' })
            .expect(201);
        await request(app.getHttpServer())
            .post('/auth/resend-otp')
            .send({ email })
            .expect(429);
        const u = await db.user.findUnique({ where: { email } });
        await db.user.update({ where: { id: u.id }, data: { otpLastSentAt: new Date(Date.now() - 70_000) } });
        await request(app.getHttpServer())
            .post('/auth/resend-otp')
            .send({ email })
            .expect(201);
        expect(mockEmailService.sendMail).toHaveBeenCalled();
    });
    it('Login and refresh token rotation', async () => {
        const email = 'login@example.com';
        const password = 'Password123!';
        await request(app.getHttpServer()).post('/auth/register').send({ email, password, name: 'L', role: 'TRAVELER' }).expect(201);
        const u = await db.user.findUnique({ where: { email } });
        await db.user.update({ where: { id: u.id }, data: { isEmailVerified: true } });
        const loginRes = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(201);
        expect(loginRes.body).toHaveProperty('accessToken');
        expect(loginRes.body).toHaveProperty('refreshToken');
        const refreshRes = await request(app.getHttpServer()).post('/auth/refresh').send({ refresh_token: loginRes.body.refreshToken }).expect(201);
        expect(refreshRes.body).toHaveProperty('accessToken');
        expect(refreshRes.body).toHaveProperty('refreshToken');
        await request(app.getHttpServer()).post('/auth/refresh').send({ refresh_token: loginRes.body.refreshToken }).expect(401);
    });
    it('Password reset flow: request and reset', async () => {
        const email = 'reset@example.com';
        const password = 'Password123!';
        await request(app.getHttpServer()).post('/auth/register').send({ email, password, name: 'Reset', role: 'TRAVELER' }).expect(201);
        const u = await db.user.findUnique({ where: { email } });
        await db.user.update({ where: { id: u.id }, data: { isEmailVerified: true } });
        await request(app.getHttpServer()).post('/auth/forgot-password').send({ email }).expect(201);
        expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
        const callArgs = mockEmailService.sendPasswordResetEmail.mock.calls[0];
        const resetUrl = callArgs[1];
        const tokenMatch = resetUrl.match(/token=([^&]+)/);
        expect(tokenMatch).toBeTruthy();
        const token = decodeURIComponent(tokenMatch[1]);
        await request(app.getHttpServer()).post('/auth/reset-password').send({ email, token, newPassword: 'NewPass123!' }).expect(201);
        await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'NewPass123!' }).expect(201);
    });
});
//# sourceMappingURL=auth-complete.e2e-spec.js.map