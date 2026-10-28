import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../src/database/database.module';
import { DatabaseService } from '../src/database/database.service';
import { runWithTenantContext } from '../src/database/tenant-context';
import { TenantScopeViolationError } from '../src/database/tenant-scope';
import { tripTemplateFixture } from './e2e-fixtures';

jest.setTimeout(120_000);

/**
 * #428 PR-C — the data-layer half of tenant isolation, proven against
 * the real test database.
 *
 * The #425 cross-tenant suite proves the SERVICE layer honours the
 * tenant it is handed (real JWTs, real guards). This suite proves the
 * layer beneath it: with a tenant context active — as
 * TenantContextInterceptor establishes for agency requests — even a
 * query that forgets its `where: { agencyId }` cannot read or write
 * another tenant's rows through DatabaseService. Seeding and cleanup
 * run WITHOUT a context, exactly like the admin/cron code paths that
 * must stay cross-tenant.
 */
describe('Tenant scope extension E2E (tenant-scope.e2e-spec)', () => {
    let module: TestingModule;
    let db: DatabaseService;

    const AGENCY_A_USER = 'ts-agency-a-user';
    const AGENCY_B_USER = 'ts-agency-b-user';
    const TRAVELER = 'ts-traveler';
    const AGENCY_A = 'ts-agency-a';
    const AGENCY_B = 'ts-agency-b';
    const TEMPLATE_A = 'ts-template-a';
    const TEMPLATE_B = 'ts-template-b';
    const SESSION_A = 'ts-session-a';
    const SESSION_B = 'ts-session-b';
    const BOOKING_A = 'ts-booking-a';
    const BOOKING_B = 'ts-booking-b';

    beforeAll(async () => {
        module = await Test.createTestingModule({ imports: [DatabaseModule] }).compile();
        db = module.get(DatabaseService);
        await db.$connect();

        // Idempotent reseed: drop any leftovers from a previous run.
        await db.booking.deleteMany({ where: { id: { in: [BOOKING_A, BOOKING_B] } } });
        await db.tripSession.deleteMany({ where: { id: { in: [SESSION_A, SESSION_B] } } });
        await db.tripTemplate.deleteMany({ where: { id: { in: [TEMPLATE_A, TEMPLATE_B] } } });
        await db.agencyProfile.deleteMany({ where: { id: { in: [AGENCY_A, AGENCY_B] } } });
        await db.user.deleteMany({ where: { id: { in: [AGENCY_A_USER, AGENCY_B_USER, TRAVELER] } } });

        await db.user.createMany({
            data: [
                { id: AGENCY_A_USER, email: 'ts-agency-a@ouiboo.test', name: 'Tenant Scope Agency A', password: 'x', role: 'AGENCY', isEmailVerified: true },
                { id: AGENCY_B_USER, email: 'ts-agency-b@ouiboo.test', name: 'Tenant Scope Agency B', password: 'x', role: 'AGENCY', isEmailVerified: true },
                { id: TRAVELER, email: 'ts-traveler@ouiboo.test', name: 'Tenant Scope Traveler', password: 'x', role: 'TRAVELER', isEmailVerified: true },
            ] as any,
        });
        await db.agencyProfile.create({
            data: { id: AGENCY_A, userId: AGENCY_A_USER, companyName: 'Tenant Scope Agency A', verificationStatus: 'VERIFIED', subscriptionStatus: 'ACTIVE' } as any,
        });
        await db.agencyProfile.create({
            data: { id: AGENCY_B, userId: AGENCY_B_USER, companyName: 'Tenant Scope Agency B', verificationStatus: 'VERIFIED', subscriptionStatus: 'ACTIVE' } as any,
        });
        await db.tripTemplate.create({
            data: tripTemplateFixture({ id: TEMPLATE_A, agencyId: AGENCY_A }) as any,
        });
        await db.tripTemplate.create({
            data: tripTemplateFixture({ id: TEMPLATE_B, agencyId: AGENCY_B }) as any,
        });
        const session = (id: string, templateId: string, agencyId: string) => ({
            id,
            templateId,
            agencyId,
            startDate: new Date('2027-06-01T09:00:00.000Z'),
            endDate: new Date('2027-06-03T18:00:00.000Z'),
            price: 1200,
            deposit: 300,
            totalSeats: 20,
            availableSeats: 20,
            status: 'OPEN',
        });
        await db.tripSession.create({ data: session(SESSION_A, TEMPLATE_A, AGENCY_A) as any });
        await db.tripSession.create({ data: session(SESSION_B, TEMPLATE_B, AGENCY_B) as any });
        const booking = (id: string, sessionId: string, agencyId: string) => ({
            id,
            sessionId,
            agencyId,
            travelerId: TRAVELER,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            paymentMethod: 'MANUAL',
            totalAmount: 1200,
            guestsCount: 1,
            fullName: 'Tenant Scope Traveler',
        });
        await db.booking.create({ data: booking(BOOKING_A, SESSION_A, AGENCY_A) as any });
        await db.booking.create({ data: booking(BOOKING_B, SESSION_B, AGENCY_B) as any });
    });

    afterAll(async () => {
        await db.booking.deleteMany({ where: { id: { in: [BOOKING_A, BOOKING_B] } } });
        await db.tripSession.deleteMany({ where: { id: { in: [SESSION_A, SESSION_B] } } });
        await db.tripTemplate.deleteMany({ where: { id: { in: [TEMPLATE_A, TEMPLATE_B] } } });
        await db.agencyProfile.deleteMany({ where: { id: { in: [AGENCY_A, AGENCY_B] } } });
        await db.user.deleteMany({ where: { id: { in: [AGENCY_A_USER, AGENCY_B_USER, TRAVELER] } } });
        await module.close();
    });

    it('an unscoped findMany under a tenant context returns only that tenant\'s rows', async () => {
        // The await lives inside the context callback on purpose:
        // Prisma promises execute lazily, so the extension sees the
        // tenant of the async chain that awaits the query — the same
        // chain a request handler runs on.
        const rows = await runWithTenantContext(AGENCY_A, async () => db.booking.findMany({}));
        expect(rows.map((r) => r.id)).toEqual([BOOKING_A]);
    });

    it('the same query without a context stays cross-tenant (admin/cron paths)', async () => {
        const rows = await db.booking.findMany({
            where: { id: { in: [BOOKING_A, BOOKING_B] } },
            orderBy: { id: 'asc' },
        });
        expect(rows.map((r) => r.id)).toEqual([BOOKING_A, BOOKING_B]);
    });

    it('a direct-id findUnique for another tenant\'s row resolves to null, not the row', async () => {
        const row = await runWithTenantContext(AGENCY_A, async () =>
            db.booking.findUnique({ where: { id: BOOKING_B } }),
        );
        expect(row).toBeNull();
    });

    it('a where pinning a different tenant fails closed', async () => {
        await runWithTenantContext(AGENCY_A, async () => {
            await expect(
                db.booking.findMany({ where: { agencyId: AGENCY_B } }),
            ).rejects.toBeInstanceOf(TenantScopeViolationError);
        });
    });

    it('an update under a tenant context cannot reach another tenant\'s row', async () => {
        const result = await runWithTenantContext(AGENCY_A, async () =>
            db.booking.updateMany({ where: { id: BOOKING_B }, data: { guestsCount: 9 } }),
        );
        expect(result.count).toBe(0);
        const untouched = await db.booking.findUnique({ where: { id: BOOKING_B } });
        expect(untouched?.guestsCount).toBe(1);
    });

    it('a create stamped with a different tenant fails closed; an unstamped create is stamped', async () => {
        await runWithTenantContext(AGENCY_A, async () => {
            await expect(
                db.booking.create({
                    data: {
                        sessionId: SESSION_B, agencyId: AGENCY_B, travelerId: TRAVELER,
                        status: 'PENDING', paymentStatus: 'UNPAID', paymentMethod: 'MANUAL',
                        totalAmount: 1, guestsCount: 1, fullName: 'Cross Tenant Attempt',
                    } as any,
                }),
            ).rejects.toBeInstanceOf(TenantScopeViolationError);
        });

        // A create that forgets the stamp entirely (the fixture type
        // requires agencyId, so strip it back off) must come out
        // stamped with the CONTEXT tenant, not rejected or unstamped.
        const { agencyId: _stripped, ...unstampedData } = tripTemplateFixture({
            agencyId: AGENCY_A,
            title: 'Tenant Scope Stamped Trip',
        });
        const created = await runWithTenantContext(AGENCY_A, async () =>
            db.tripTemplate.create({ data: unstampedData as any }),
        );
        expect(created.agencyId).toBe(AGENCY_A);
        await db.tripTemplate.delete({ where: { id: created.id } });
    });
});
