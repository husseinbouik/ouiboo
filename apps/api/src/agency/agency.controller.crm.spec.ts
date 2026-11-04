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
import {
    aggregateCrmContacts,
    aggregateCrmPipeline,
    CRM_PIPELINE_STATUSES,
} from './agency-crm.util';

/**
 * #786 HARD FENCE — tenant isolation + aggregation correctness for the
 * agency CRM slice (contacts + booking pipeline).
 *
 * The mock database honours `where.agencyId` exactly like Prisma, with
 * rows from TWO agencies. Traveller t-shared books with BOTH agencies:
 * each agency's contact for that traveller must aggregate ONLY its own
 * bookings — counts, value and last-booking date must never leak
 * across the tenant boundary.
 */
describe('AgencyController CRM (#786 tenant isolation + aggregation)', () => {
    let app: INestApplication;

    // agency-a: t-shared x2 (CONFIRMED 2000 trip-1, COMPLETED 1500
    // trip-2), t-aonly x1 CANCELLED 900. agency-b: t-shared x1
    // CONFIRMED 700, t-bonly x1 PENDING 300.
    const bookings: any[] = [
        {
            id: 'bk-a1', agencyId: 'agency-a', travelerId: 't-shared',
            status: 'CONFIRMED', totalAmount: '2000',
            bookingDate: new Date('2026-09-01T10:00:00.000Z'),
            fullName: 'Sara Shared', phoneNumber: '+212611111111',
            traveler: { name: 'Sara Shared', email: 'sara@example.com' },
            session: { templateId: 'trip-1', template: { agencyId: 'agency-a' } },
        },
        {
            id: 'bk-a2', agencyId: 'agency-a', travelerId: 't-shared',
            status: 'COMPLETED', totalAmount: '1500',
            bookingDate: new Date('2026-10-01T10:00:00.000Z'),
            fullName: 'Sara Shared', phoneNumber: '+212622222222',
            traveler: { name: 'Sara Shared', email: 'sara@example.com' },
            session: { templateId: 'trip-2', template: { agencyId: 'agency-a' } },
        },
        {
            id: 'bk-a3', agencyId: 'agency-a', travelerId: 't-aonly',
            status: 'CANCELLED', totalAmount: '900',
            bookingDate: new Date('2026-10-05T10:00:00.000Z'),
            fullName: 'Omar Aonly', phoneNumber: null,
            traveler: { name: 'Omar Aonly', email: 'omar-a@example.com' },
            session: { templateId: 'trip-1', template: { agencyId: 'agency-a' } },
        },
        {
            id: 'bk-b1', agencyId: 'agency-b', travelerId: 't-shared',
            status: 'CONFIRMED', totalAmount: '700',
            bookingDate: new Date('2026-08-01T10:00:00.000Z'),
            fullName: 'Sara Shared', phoneNumber: '+212633333333',
            traveler: { name: 'Sara Shared', email: 'sara@example.com' },
            session: { templateId: 'trip-b1', template: { agencyId: 'agency-b' } },
        },
        {
            id: 'bk-b2', agencyId: 'agency-b', travelerId: 't-bonly',
            status: 'PENDING', totalAmount: '300',
            bookingDate: new Date('2026-10-03T10:00:00.000Z'),
            fullName: 'Lina Bonly', phoneNumber: '+212644444444',
            traveler: { name: 'Lina Bonly', email: 'lina-b@example.com' },
            session: { templateId: 'trip-b1', template: { agencyId: 'agency-b' } },
        },
    ];

    const refundCases: any[] = [
        { id: 'rc-a1', agencyId: 'agency-a', status: 'REFUND_REQUESTED' },
        { id: 'rc-a2', agencyId: 'agency-a', status: 'REFUND_COMPLETED' },
        { id: 'rc-b1', agencyId: 'agency-b', status: 'REFUND_REJECTED' },
    ];

    const matchesWhere = (row: any, where: any): boolean => {
        if (!where) return true;
        if (where.agencyId !== undefined && row.agencyId !== where.agencyId) return false;
        if (where.status !== undefined) {
            if (typeof where.status === 'string' && row.status !== where.status) return false;
            if (where.status?.notIn && where.status.notIn.includes(row.status)) return false;
            if (where.status?.in && !where.status.in.includes(row.status)) return false;
        }
        if (where.session?.template?.agencyId !== undefined
            && row.session?.template?.agencyId !== where.session.template.agencyId) return false;
        return true;
    };

    const dbMock: any = {
        booking: {
            findMany: jest.fn(async ({ where }: any) =>
                bookings.filter((row) => matchesWhere(row, where))),
            count: jest.fn(async ({ where }: any) =>
                bookings.filter((row) => matchesWhere(row, where)).length),
            groupBy: jest.fn(async ({ where }: any) => {
                const rows = bookings.filter((row) => matchesWhere(row, where));
                const byStatus = new Map<string, any>();
                for (const row of rows) {
                    const entry = byStatus.get(row.status)
                        ?? { status: row.status, _count: { _all: 0 }, _sum: { totalAmount: 0 } };
                    entry._count._all += 1;
                    entry._sum.totalAmount += Number(row.totalAmount);
                    byStatus.set(row.status, entry);
                }
                return [...byStatus.values()];
            }),
        },
        refundCase: {
            count: jest.fn(async ({ where }: any) =>
                refundCases.filter((row) => matchesWhere(row, where)).length),
        },
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

    it('returns agency A contacts aggregated from agency A bookings only', async () => {
        const res = await asAgency(
            request(app.getHttpServer()).get('/agency/crm/contacts'),
            'agency-a',
        ).expect(200);

        expect(res.body.pagination.total).toBe(2);
        const sara = res.body.data.find((c: any) => c.travelerId === 't-shared');
        expect(sara).toMatchObject({
            name: 'Sara Shared',
            email: 'sara@example.com',
            // Phone from her MOST RECENT agency-A booking — never the
            // agency-B booking's phone.
            phone: '+212622222222',
            bookingCount: 2,
            tripCount: 2,
            totalBookedValue: '3500.00',
            currency: 'MAD',
        });
        expect(sara.lastBookingDate).toBe('2026-10-01T10:00:00.000Z');
        const omar = res.body.data.find((c: any) => c.travelerId === 't-aonly');
        // Cancelled bookings count as history but carry no booked value.
        expect(omar).toMatchObject({ bookingCount: 1, totalBookedValue: '0.00' });
        expect(res.body.data.some((c: any) => c.travelerId === 't-bonly')).toBe(false);
        expect(JSON.stringify(res.body)).not.toContain('lina-b@example.com');
        expect(dbMock.booking.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { agencyId: 'agency-a' } }),
        );
    });

    it('returns agency B contacts with zero of agency A\'s data', async () => {
        const res = await asAgency(
            request(app.getHttpServer()).get('/agency/crm/contacts'),
            'agency-b',
        ).expect(200);

        expect(res.body.pagination.total).toBe(2);
        const sara = res.body.data.find((c: any) => c.travelerId === 't-shared');
        // Same traveller, different tenant: only agency B's one booking.
        expect(sara).toMatchObject({
            bookingCount: 1,
            tripCount: 1,
            totalBookedValue: '700.00',
            phone: '+212633333333',
        });
        expect(sara.lastBookingDate).toBe('2026-08-01T10:00:00.000Z');
        expect(JSON.stringify(res.body)).not.toContain('omar-a@example.com');
        expect(JSON.stringify(res.body)).not.toContain('3500');
    });

    it('returns an empty contact list for an agency with no bookings', async () => {
        const res = await asAgency(
            request(app.getHttpServer()).get('/agency/crm/contacts'),
            'agency-c',
        ).expect(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.pagination.total).toBe(0);
    });

    it('filters contacts by search within the agency\'s own contacts only', async () => {
        const res = await asAgency(
            request(app.getHttpServer()).get('/agency/crm/contacts?search=omar'),
            'agency-a',
        ).expect(200);
        expect(res.body.pagination.total).toBe(1);
        expect(res.body.data[0].travelerId).toBe('t-aonly');

        const cross = await asAgency(
            request(app.getHttpServer()).get('/agency/crm/contacts?search=omar'),
            'agency-b',
        ).expect(200);
        expect(cross.body.pagination.total).toBe(0);
    });

    it('returns agency A pipeline with counts, amounts and refund cases', async () => {
        const res = await asAgency(
            request(app.getHttpServer()).get('/agency/crm/pipeline'),
            'agency-a',
        ).expect(200);

        expect(res.body.stages).toHaveLength(CRM_PIPELINE_STATUSES.length);
        const byStatus = Object.fromEntries(res.body.stages.map((s: any) => [s.status, s]));
        expect(byStatus.CONFIRMED).toMatchObject({ count: 1, totalAmount: '2000.00' });
        expect(byStatus.COMPLETED).toMatchObject({ count: 1, totalAmount: '1500.00' });
        expect(byStatus.CANCELLED).toMatchObject({ count: 1, totalAmount: '900.00' });
        expect(byStatus.PENDING).toMatchObject({ count: 0, totalAmount: '0.00' });
        // Booked value excludes the cancelled booking.
        expect(res.body.totals).toMatchObject({ bookings: 3, bookedValue: '3500.00' });
        expect(res.body.refundCases).toEqual({ open: 1, total: 2 });
    });

    it('returns agency B pipeline with zero of agency A\'s bookings', async () => {
        const res = await asAgency(
            request(app.getHttpServer()).get('/agency/crm/pipeline'),
            'agency-b',
        ).expect(200);

        expect(res.body.totals).toMatchObject({ bookings: 2, bookedValue: '1000.00' });
        expect(res.body.refundCases).toEqual({ open: 0, total: 1 });
        const byStatus = Object.fromEntries(res.body.stages.map((s: any) => [s.status, s]));
        expect(byStatus.COMPLETED.count).toBe(0);
        expect(dbMock.booking.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({ where: { agencyId: 'agency-b' } }),
        );
    });

    it('scopes the bookings status filter by tenant and validates the status', async () => {
        await asAgency(
            request(app.getHttpServer()).get('/agency/bookings?status=CONFIRMED'),
            'agency-a',
        ).expect(200);
        const lastFindMany = dbMock.booking.findMany.mock.calls.at(-1)[0];
        expect(lastFindMany.where.status).toBe('CONFIRMED');
        expect(lastFindMany.where.session.template.agencyId).toBe('agency-a');

        await asAgency(
            request(app.getHttpServer()).get('/agency/bookings?status=NOT_A_STATUS'),
            'agency-a',
        ).expect(400);
    });

    it('rejects a traveller principal on every CRM route', async () => {
        for (const path of ['/agency/crm/contacts', '/agency/crm/pipeline']) {
            await request(app.getHttpServer())
                .get(path)
                .set('x-test-role', UserRole.Traveler)
                .set('x-tenant-id', 'agency-a')
                .expect(403);
        }
    });
});

describe('agency-crm.util aggregation', () => {
    it('counts distinct trips and takes name/phone from the latest booking', () => {
        const contacts = aggregateCrmContacts([
            {
                travelerId: 't1', status: 'CONFIRMED', totalAmount: '100',
                bookingDate: new Date('2026-09-01T00:00:00.000Z'),
                fullName: 'Old Name', phoneNumber: '111',
                traveler: { name: 'Account Name', email: 't1@example.com' },
                session: { templateId: 'trip-1' },
            },
            {
                travelerId: 't1', status: 'CONFIRMED', totalAmount: '100',
                bookingDate: new Date('2026-10-01T00:00:00.000Z'),
                fullName: 'New Name', phoneNumber: '222',
                traveler: { name: 'Account Name', email: 't1@example.com' },
                session: { templateId: 'trip-1' },
            },
        ] as any);
        expect(contacts).toHaveLength(1);
        expect(contacts[0]).toMatchObject({
            name: 'New Name', phone: '222', bookingCount: 2, tripCount: 1,
            totalBookedValue: '200.00',
        });
    });

    it('zero-fills every pipeline stage in a stable order', () => {
        const pipeline = aggregateCrmPipeline([], { open: 0, total: 0 });
        expect(pipeline.stages.map((s) => s.status)).toEqual([...CRM_PIPELINE_STATUSES]);
        expect(pipeline.totals).toMatchObject({ bookings: 0, bookedValue: '0.00' });
    });
});
