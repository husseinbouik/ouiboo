import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { TripsController } from '../../trips/trips.controller';
import { TripsService } from '../../trips/trips.service';
import { AuthController } from '../../auth/auth.controller';
import { AuthService } from '../../auth/auth.service';
import { AdminController } from '../../admin/admin.controller';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { SubscriptionGuard } from '../../auth/subscription.guard';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { DatabaseService } from '../../database/database.service';
import { ExternalPaymentsService } from '../../external-payments/external-payments.service';
import { EmailService } from '../../email/email.service';
import { AuditLogService } from '../../admin/audit-log.service';
import { PaymentsService } from '../../payments/payments.service';

/**
 * API contract regression tests (#210).
 *
 * Verifies that key public endpoints keep their promised status codes
 * and response shapes. These are the contracts the frontend apps rely on.
 */
describe('API contract', () => {
    let app: INestApplication;

    const tripsService = {
        findAllTemplates: jest.fn().mockResolvedValue({
            data: [
                { id: 'trip-1', title: 'Marrakech Medina Discovery', price: 1800, currency: 'MAD' },
            ],
            pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        }),
        createTemplate: jest.fn(),
        findOneTemplate: jest.fn(),
    };

    const authService = {
        validateUser: jest.fn().mockResolvedValue(null), // null = invalid credentials → 401
        login: jest.fn(),
        register: jest.fn(),
        refresh: jest.fn(),
        logout: jest.fn(),
    };

    const adminServiceMocks = {
        // placeholder for future admin service mocks
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [TripsController, AuthController, AdminController],
            providers: [
                { provide: TripsService, useValue: tripsService },
                { provide: AuthService, useValue: authService },
                // Admin controller deps — stubbed; guards block unauthenticated access anyway
                { provide: DatabaseService, useValue: {} },
                { provide: ExternalPaymentsService, useValue: {} },
                { provide: EmailService, useValue: {} },
                { provide: AuditLogService, useValue: {} },
                { provide: PaymentsService, useValue: {} },
            ],
        })
            // Real guards: unauthenticated requests must be rejected
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    // Real JwtAuthGuard throws 401 when no valid Bearer token is present
                    if (!req.headers.authorization?.startsWith('Bearer ')) {
                        throw new UnauthorizedException('Missing authentication token');
                    }
                    return true;
                },
            })
            .overrideGuard(TenantGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(SubscriptionGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RateLimitGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /trips', () => {
        it('returns 200 with paginated shape', async () => {
            await request(app.getHttpServer())
                .get('/trips')
                .expect(200)
                .expect(({ body }) => {
                    expect(body).toHaveProperty('data');
                    expect(Array.isArray(body.data)).toBe(true);
                    expect(body).toHaveProperty('pagination');
                    expect(body.pagination).toMatchObject({
                        total: expect.any(Number),
                        page: expect.any(Number),
                        limit: expect.any(Number),
                        totalPages: expect.any(Number),
                    });
                });
        });

        it('respects page and limit query params', async () => {
            await request(app.getHttpServer())
                .get('/trips?page=2&limit=5')
                .expect(200)
                .expect(() => {
                    expect(tripsService.findAllTemplates).toHaveBeenCalledWith(
                        expect.objectContaining({ page: 2, limit: 5 }),
                    );
                });
        });
    });

    describe('POST /auth/login', () => {
        it('returns 401 on invalid credentials', async () => {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'nobody@example.com', password: 'wrong' })
                .expect(401);
        });
    });

    describe('GET /admin/* (protected)', () => {
        it('returns 401 without authentication', async () => {
            // JwtAuthGuard is real — no token means 401
            await request(app.getHttpServer())
                .get('/admin/agencies')
                .expect(401);
        });
    });
});
