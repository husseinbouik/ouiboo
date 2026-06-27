import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { BookingsController } from '../bookings/bookings.controller';
import { BookingsService } from '../bookings/bookings.service';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailService } from '../email/email.service';
import { UploadService } from '../upload/upload.service';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../common/redis.service';

describe('MVP smoke: auth + booking flow', () => {
    let app: INestApplication;
    const authService = {
        validateUser: jest.fn(),
        login: jest.fn(),
        register: jest.fn(),
    };
    const bookingsService = {
        create: jest.fn(),
        findAllByTraveler: jest.fn(),
        uploadPaymentProof: jest.fn(),
    };
    const usersService = {
        getMe: jest.fn(),
        updateUserProfile: jest.fn(),
        updateAgencyProfile: jest.fn(),
    };
    const emailService = {
        sendOTP: jest.fn(),
        sendWelcomeEmail: jest.fn(),
    };
    const uploadService = {
        uploadFile: jest.fn(),
    };
    const databaseService = {
        user: { findUnique: jest.fn() },
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [AuthController, BookingsController, UsersController],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: BookingsService, useValue: bookingsService },
                { provide: UsersService, useValue: usersService },
                { provide: EmailService, useValue: emailService },
                { provide: UploadService, useValue: uploadService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: RedisService, useValue: { getClient: jest.fn(() => null) } },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    req.user = { userId: 'user-123' };
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
        authService.validateUser.mockReset();
        authService.login.mockReset();
        authService.register.mockReset();
        bookingsService.create.mockReset();
        usersService.getMe.mockReset();
        usersService.updateUserProfile.mockReset();
    });

    afterAll(async () => {
        await app?.close();
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

        await request(app.getHttpServer())
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

        await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                email: 'traveler@example.com',
                password: 'Password123!',
            })
            .expect(201)
            .expect(({ body }) => {
                expect(body).toEqual({ accessToken: 'token', refreshToken: 'refresh' });
            });

        await request(app.getHttpServer())
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

    it('loads and updates the current traveler profile', async () => {
        usersService.getMe.mockResolvedValue({
            id: 'user-123',
            email: 'traveler@example.com',
            name: 'Traveler Test',
            role: 'TRAVELER',
        });
        usersService.updateUserProfile.mockResolvedValue({
            id: 'user-123',
            email: 'traveler@example.com',
            name: 'Traveler Updated',
            role: 'TRAVELER',
            avatar: 'https://example.com/avatar.png',
        });

        await request(app.getHttpServer())
            .get('/users/me')
            .set('Authorization', 'Bearer token')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toMatchObject({
                    id: 'user-123',
                    email: 'traveler@example.com',
                    name: 'Traveler Test',
                });
            });

        await request(app.getHttpServer())
            .patch('/users/me')
            .set('Authorization', 'Bearer token')
            .send({
                name: 'Traveler Updated',
                avatar: 'https://example.com/avatar.png',
            })
            .expect(200)
            .expect(({ body }) => {
                expect(body).toMatchObject({
                    id: 'user-123',
                    name: 'Traveler Updated',
                    avatar: 'https://example.com/avatar.png',
                });
            });
    });
});
