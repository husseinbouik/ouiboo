import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { DatabaseModule } from '../src/database/database.module';
import { EmailModule } from '../src/email/email.module';
import { DatabaseService } from '../src/database/database.service';
import { EmailService } from '../src/email/email.service';

jest.setTimeout(60_000);

describe('Auth - Complete E2E (auth-complete.e2e-spec)', () => {
    let app: INestApplication;
    let db: DatabaseService;

    const mockEmailService = {
        sendMail: jest.fn(async () => true),
        getOTPTemplate: jest.fn((otp: string) => `OTP:${otp}`),
        getWelcomeTemplate: jest.fn((name?: string) => `WELCOME:${name}`),
        getPasswordResetTemplate: jest.fn((url: string) => `RESET:${url}`),
        sendPasswordResetEmail: jest.fn(async () => true),
    } as unknown as EmailService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AuthModule, DatabaseModule, EmailModule],
        })
            .overrideProvider(EmailService)
            .useValue(mockEmailService)
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        db = app.get(DatabaseService);
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
        if (!db) return;
        // delete children first to avoid FK errors
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

    it('Register TRAVELER and verify OTP flow', async () => {
        const email = 'traveler@example.com';
        const res = await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password: 'Password123!', name: 'Traveler', role: 'TRAVELER' })
            .expect(201);

        expect(res.body).toMatchObject({
            email,
            requiresEmailVerification: true,
        });
        expect(res.body).not.toHaveProperty('accessToken');
        expect(res.body).not.toHaveProperty('refreshToken');
        expect(mockEmailService.sendMail).toHaveBeenCalled();

        const userInDb = await db.user.findUnique({ where: { email } });
        expect(userInDb).toBeTruthy();
        expect(userInDb?.isEmailVerified).toBe(false);
        expect(userInDb?.otp).toBeTruthy();
        expect(userInDb?.otpExpiresAt).toBeTruthy();

        // OTP is stored hashed at rest, so extract the plaintext OTP from the mocked email
        const otpEmail = (mockEmailService.sendMail as jest.Mock).mock.calls[0]?.[2] as string | undefined;
        const otp = otpEmail?.match(/\d{6}/)?.[0];
        expect(otp).toBeTruthy();

        // Verify email with correct OTP
        const verificationResponse = await request(app.getHttpServer())
            .post('/auth/verify-email')
            .send({ email, otp })
            .expect(201);

        expect(verificationResponse.body).toHaveProperty('accessToken');
        expect(verificationResponse.body).not.toHaveProperty('refreshToken');
        expect(verificationResponse.headers['set-cookie']?.[0]).toContain('refresh_token=');

        const verified = await db.user.findUnique({ where: { email } });
        expect(verified?.isEmailVerified).toBe(true);
        expect(verified?.otp).toBeNull();
        expect(mockEmailService.sendMail).toHaveBeenCalled();
    });

    it('accepts an unexpired OTP issued before OTP hashing was enabled', async () => {
        const email = 'legacy-otp@example.com';
        const legacyOtp = '654321';

        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password: 'Password123!', name: 'Legacy OTP', role: 'TRAVELER' })
            .expect(201);

        await db.user.update({
            where: { email },
            data: {
                otp: legacyOtp,
                otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
            },
        });

        await request(app.getHttpServer())
            .post('/auth/verify-email')
            .send({ email, otp: legacyOtp })
            .expect(201);

        const verified = await db.user.findUnique({ where: { email } });
        expect(verified?.isEmailVerified).toBe(true);
        expect(verified?.otp).toBeNull();
    });

    it('Resend OTP respects cooldown', async () => {
        const email = 'resend@example.com';
        await request(app.getHttpServer())
            .post('/auth/register')
            .send({ email, password: 'Password123!', name: 'Test', role: 'TRAVELER' })
            .expect(201);

        // immediate resend should be rate limited
        await request(app.getHttpServer())
            .post('/auth/resend-otp')
            .send({ email })
            .expect(429);

        // advance otpLastSentAt to past by updating DB
        const u = await db.user.findUnique({ where: { email } });
        await db.user.update({ where: { id: u!.id }, data: { otpLastSentAt: new Date(Date.now() - 70_000) } });

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
        // verify
        await db.user.update({ where: { id: u!.id }, data: { isEmailVerified: true } });

        const loginRes = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(201);
        expect(loginRes.body).toHaveProperty('accessToken');
        expect(loginRes.body).not.toHaveProperty('refreshToken');
        const refreshCookie = loginRes.headers['set-cookie']?.[0]?.split(';')[0];
        expect(refreshCookie).toContain('refresh_token=');
        if (!refreshCookie) throw new Error('Login response did not set the refresh cookie');

        const refreshRes = await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', refreshCookie).send({}).expect(201);
        expect(refreshRes.body).toHaveProperty('accessToken');
        expect(refreshRes.body).not.toHaveProperty('refreshToken');
        expect(refreshRes.headers['set-cookie']?.[0]).toContain('refresh_token=');

        // old token should be revoked
        await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', refreshCookie).send({}).expect(401);
    });

    it('Password reset flow: request and reset', async () => {
        const email = 'reset@example.com';
        const password = 'Password123!';
        await request(app.getHttpServer()).post('/auth/register').send({ email, password, name: 'Reset', role: 'TRAVELER' }).expect(201);
        const u = await db.user.findUnique({ where: { email } });
        await db.user.update({ where: { id: u!.id }, data: { isEmailVerified: true } });

        await request(app.getHttpServer()).post('/auth/forgot-password').send({ email }).expect(201);
        expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();

        // extract token from the reset URL that would be generated
        const callArgs = (mockEmailService.sendPasswordResetEmail as jest.Mock).mock.calls[0];
        const resetUrl = callArgs[1] as string;
        const tokenMatch = resetUrl.match(/token=([^&]+)/);
        expect(tokenMatch).toBeTruthy();
        const token = decodeURIComponent(tokenMatch![1]);

        // perform reset
        await request(app.getHttpServer()).post('/auth/reset-password').send({ email, token, newPassword: 'NewPass123!' }).expect(201);

        // login with new password
        await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'NewPass123!' }).expect(201);
    });
});
