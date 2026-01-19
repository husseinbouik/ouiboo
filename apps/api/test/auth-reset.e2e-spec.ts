import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';

describe('E2E: auth login + password reset', () => {
    let app: INestApplication;

    const authService = {
        validateUser: jest.fn(),
        login: jest.fn(),
        requestPasswordReset: jest.fn(),
        resetPassword: jest.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [{ provide: AuthService, useValue: authService }],
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

        await request(app.getHttpServer())
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

        await request(app.getHttpServer())
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

        await request(app.getHttpServer())
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
