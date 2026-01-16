import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AgencyController } from '../agency/agency.controller';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { UserRole } from '@ouiboo/types';

describe('Tenant isolation (agency scope)', () => {
    let app: INestApplication;

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
        const moduleRef = await Test.createTestingModule({
            controllers: [AgencyController],
            providers: [
                TenantGuard,
                { provide: DatabaseService, useValue: dbMock },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    const tenantId = req.header('x-tenant-id');
                    req.user = { userId: `user-${tenantId}`, role: UserRole.Agency, tenantId };
                    return true;
                },
            })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('returns only trips for the tenant agency', async () => {
        await request(app.getHttpServer())
            .get('/agency/trips')
            .set('x-tenant-id', 'agency-a')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toHaveLength(1);
                expect(body[0]).toMatchObject({ id: 'trip-a', agencyId: 'agency-a' });
            });

        await request(app.getHttpServer())
            .get('/agency/trips')
            .set('x-tenant-id', 'agency-b')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toHaveLength(1);
                expect(body[0]).toMatchObject({ id: 'trip-b', agencyId: 'agency-b' });
            });
    });

    it('returns only bookings for the tenant agency', async () => {
        await request(app.getHttpServer())
            .get('/agency/bookings')
            .set('x-tenant-id', 'agency-a')
            .expect(200)
            .expect(({ body }) => {
                expect(body).toHaveLength(1);
                expect(body[0]).toMatchObject({ id: 'booking-a' });
                expect(body[0].session.template.agencyId).toBe('agency-a');
            });

        await request(app.getHttpServer())
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
