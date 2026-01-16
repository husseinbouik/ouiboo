import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { BookingsController } from '../bookings/bookings.controller';
import { BookingsService } from '../bookings/bookings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

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
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [AuthController, BookingsController],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: BookingsService, useValue: bookingsService },
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
});
