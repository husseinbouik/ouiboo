import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AgencyController } from './agency.controller';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { UserRole } from '@ouiboo/types';
import { ExternalPaymentsService } from '../external-payments/external-payments.service';
import { BOOKING_EXPORT_HEADERS, bookingsToCsv } from './agency-export.util';

/**
 * #780 HARD FENCE — tenant isolation for the agency CSV export.
 *
 * The mock database honours `where.agencyId` exactly like Prisma, with
 * rows from TWO agencies in every table. The export endpoints must:
 *  - scope every query by req.tenantId (stamped by TenantGuard from the
 *    authenticated principal — never from a request parameter),
 *  - return only the calling agency's rows,
 *  - return an empty-but-valid (header-only) CSV for an agency with no
 *    rows,
 *  - reject a traveller principal (the real RolesGuard enforces the
 *    class-level @Roles(UserRole.Agency)).
 */
describe('AgencyController CSV exports (#780 tenant isolation)', () => {
    let app: INestApplication;

    const bookings = [
        {
            id: 'booking-a',
            agencyId: 'agency-a',
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            guestsCount: 2,
            totalAmount: '2000',
            fullName: 'Amina Secret',
            phoneNumber: '+212600000001',
            createdAt: new Date('2026-10-01T10:00:00.000Z'),
            traveler: { name: 'Amina Secret', email: 'amina-a@example.com' },
            session: {
                startDate: new Date('2026-11-10T09:00:00.000Z'),
                deposit: '100',
                template: { title: 'A, Secret "Trip"' },
            },
            paymentPlan: { depositAmount: '200', balanceAmount: '1800' },
        },
        {
            id: 'booking-b',
            agencyId: 'agency-b',
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            guestsCount: 3,
            totalAmount: '900',
            fullName: 'Bilal Bennani',
            phoneNumber: '+212600000002',
            createdAt: new Date('2026-10-02T10:00:00.000Z'),
            traveler: { name: 'Bilal Bennani', email: 'bilal-b@example.com' },
            session: {
                startDate: new Date('2026-11-12T09:00:00.000Z'),
                deposit: '50',
                template: { title: 'B Trip' },
            },
            paymentPlan: null,
        },
    ];

    const trips = [
        {
            id: 'trip-a',
            agencyId: 'agency-a',
            title: 'Agency A Trip',
            status: 'ACTIVE',
            startingPrice: '1200',
            durationDays: 2,
            durationNights: 1,
            createdAt: new Date('2026-09-01T10:00:00.000Z'),
            _count: { sessions: 4 },
            sessions: [{ price: '1200' }],
        },
        {
            id: 'trip-b',
            agencyId: 'agency-b',
            title: 'Agency B Trip',
            status: 'DRAFT',
            startingPrice: '700',
            durationDays: 1,
            durationNights: 0,
            createdAt: new Date('2026-09-02T10:00:00.000Z'),
            _count: { sessions: 2 },
            sessions: [{ price: '700' }],
        },
    ];

    const reviews = [
        {
            id: 'review-a',
            agencyId: 'agency-a',
            rating: 5,
            comment: 'A-only comment',
            status: 'HIDDEN',
            createdAt: new Date('2026-10-05T10:00:00.000Z'),
            traveler: { name: 'Amina Secret' },
            tripTemplate: { title: 'Agency A Trip' },
        },
        {
            id: 'review-b',
            agencyId: 'agency-b',
            rating: 4,
            comment: 'Great, warm guide',
            status: 'VISIBLE',
            createdAt: new Date('2026-10-06T10:00:00.000Z'),
            traveler: { name: 'Bilal Bennani' },
            tripTemplate: { title: 'Agency B Trip' },
        },
    ];

    const byAgency = (rows: any[]) =>
        jest.fn(({ where }: any) => rows.filter((row) => row.agencyId === where.agencyId));

    const dbMock: any = {
        booking: { findMany: byAgency(bookings) },
        tripTemplate: { findMany: byAgency(trips) },
        review: { findMany: byAgency(reviews) },
    };

    const externalPaymentsService = {
        getAgencyPaymentsOverview: jest.fn(),
        listAgencyPayments: jest.fn(),
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [AgencyController],
            providers: [
                TenantGuard,
                RolesGuard,
                { provide: DatabaseService, useValue: dbMock },
                { provide: ExternalPaymentsService, useValue: externalPaymentsService },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: any) => {
                    const req = context.switchToHttp().getRequest();
                    const role = req.header('x-test-role');
                    const tenantId = req.header('x-tenant-id');
                    req.user = role
                        ? { userId: `user-${tenantId ?? 'none'}`, role, tenantId }
                        : undefined;
                    return true;
                },
            })
            .compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    const asAgency = (req: request.Test, tenantId: string) =>
        req.set('x-test-role', UserRole.Agency).set('x-tenant-id', tenantId);

    it('exports only agency B bookings for agency B, with CSV headers', async () => {
        const res = await asAgency(
            request(app.getHttpServer()).get('/agency/exports/bookings'),
            'agency-b',
        ).expect(200);

        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.headers['content-disposition']).toContain('attachment; filename="ouiboo-bookings-');
        expect(res.text).toContain('booking-b');
        expect(res.text).toContain('Bilal Bennani');
        expect(res.text).toContain('bilal-b@example.com');
        // Session deposit (50/seat x 3 guests) + balance reconcile with the total.
        expect(res.text).toContain('900.00,150.00,750.00');
        expect(res.text).not.toContain('booking-a');
        expect(res.text).not.toContain('Amina Secret');
        expect(res.text).not.toContain('amina-a@example.com');
        // The query itself was scoped by the authenticated tenant.
        expect(dbMock.booking.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { agencyId: 'agency-b' } }),
        );
    });

    it('exports only agency B trips and reviews for agency B', async () => {
        const tripsRes = await asAgency(
            request(app.getHttpServer()).get('/agency/exports/trips'),
            'agency-b',
        ).expect(200);
        expect(tripsRes.text).toContain('trip-b');
        expect(tripsRes.text).toContain('Agency B Trip');
        expect(tripsRes.text).not.toContain('trip-a');
        expect(tripsRes.text).not.toContain('Agency A Trip');
        expect(dbMock.tripTemplate.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { agencyId: 'agency-b' } }),
        );

        const reviewsRes = await asAgency(
            request(app.getHttpServer()).get('/agency/exports/reviews'),
            'agency-b',
        ).expect(200);
        expect(reviewsRes.text).toContain('review-b');
        expect(reviewsRes.text).toContain('"Great, warm guide"');
        expect(reviewsRes.text).not.toContain('review-a');
        expect(reviewsRes.text).not.toContain('A-only comment');
        expect(dbMock.review.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { agencyId: 'agency-b' } }),
        );
    });

    it('returns an empty-but-valid CSV for an agency with no rows', async () => {
        const res = await asAgency(
            request(app.getHttpServer()).get('/agency/exports/bookings'),
            'agency-c',
        ).expect(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expect(res.text).toBe(`${BOOKING_EXPORT_HEADERS.join(',')}\n`);
    });

    it('rejects a traveller principal on every export route', async () => {
        for (const kind of ['bookings', 'trips', 'reviews']) {
            await request(app.getHttpServer())
                .get(`/agency/exports/${kind}`)
                .set('x-test-role', UserRole.Traveler)
                .set('x-tenant-id', 'agency-b')
                .expect(403);
        }
    });

    it('escapes commas, quotes and newlines in exported values', () => {
        const csv = bookingsToCsv([
            {
                id: 'booking-x',
                status: 'CONFIRMED',
                paymentStatus: 'PAID',
                guestsCount: 1,
                totalAmount: '100',
                fullName: 'Line\nBreak',
                phoneNumber: null,
                createdAt: new Date('2026-10-01T00:00:00.000Z'),
                traveler: { name: 'Line\nBreak', email: 'x@example.com' },
                session: {
                    startDate: new Date('2026-11-01T00:00:00.000Z'),
                    deposit: '0',
                    template: { title: 'A, Secret "Trip"' },
                },
                paymentPlan: null,
            } as any,
        ]);
        expect(csv).toContain('"A, Secret ""Trip"""');
        expect(csv).toContain('"Line\nBreak"');
    });
});
