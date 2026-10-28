import { scopeOperationArgs, TenantScopeViolationError } from './tenant-scope';
import { runWithTenantContext, currentTenantAgencyId } from './tenant-context';
import { DatabaseService } from './database.service';

/**
 * #428 PR-C — the pure scoping rules. The extension itself is a thin
 * adapter over scopeOperationArgs, so the semantics are proven here
 * without a database; tenant-scope.e2e-spec.ts proves them against
 * real tables in CI.
 */
describe('scopeOperationArgs (#428 PR-C)', () => {
    const TENANT = 'agency-a';
    const OTHER = 'agency-b';

    describe('reads', () => {
        it('adds the tenant to an unscoped findMany where', () => {
            const out = scopeOperationArgs('Booking', 'findMany', { where: { status: 'PENDING' } }, TENANT);
            expect(out.where).toEqual({ status: 'PENDING', agencyId: TENANT });
        });

        it('creates the where when the caller passed none', () => {
            const out = scopeOperationArgs('Booking', 'findMany', {}, TENANT);
            expect(out.where).toEqual({ agencyId: TENANT });
        });

        it('keeps a where that already pins the same tenant', () => {
            const where = { agencyId: TENANT, status: 'PENDING' };
            const out = scopeOperationArgs('Booking', 'findMany', { where }, TENANT);
            expect(out.where).toEqual(where);
        });

        it('fails closed when a read pins a different tenant', () => {
            expect(() =>
                scopeOperationArgs('Booking', 'findMany', { where: { agencyId: OTHER } }, TENANT),
            ).toThrow(TenantScopeViolationError);
            expect(() =>
                scopeOperationArgs('Booking', 'findFirst', { where: { agencyId: OTHER } }, TENANT),
            ).toThrow(TenantScopeViolationError);
        });

        it('passes unique-key lookups through untouched — services own the denial contract', () => {
            // Deliberate exception (see tenant-scope.ts header): the
            // #425 suite pins 403 for foreign direct-ID reads, which
            // only the service's ownership check can produce.
            const args = { where: { id: 'x' } };
            expect(scopeOperationArgs('Booking', 'findUnique', args, TENANT)).toBe(args);
            expect(scopeOperationArgs('Booking', 'findUniqueOrThrow', args, TENANT)).toBe(args);
        });

        it('AND-wraps a complex agencyId filter with the tenant equality', () => {
            const out = scopeOperationArgs(
                'Booking', 'findMany', { where: { agencyId: { in: [TENANT, OTHER] } } }, TENANT,
            );
            expect(out.where).toEqual({ AND: [{ agencyId: { in: [TENANT, OTHER] } }, { agencyId: TENANT }] });
        });

        it('scopes count/aggregate/groupBy wheres too', () => {
            for (const op of ['count', 'aggregate', 'groupBy']) {
                const out = scopeOperationArgs('Booking', op, { where: {} }, TENANT);
                expect(out.where).toEqual({ agencyId: TENANT });
            }
        });

        it('does not mutate the caller args', () => {
            const args = { where: { status: 'PENDING' } };
            scopeOperationArgs('Booking', 'findMany', args, TENANT);
            expect(args.where).toEqual({ status: 'PENDING' });
        });
    });

    describe('creates', () => {
        it('stamps the tenant when the caller did not', () => {
            const out = scopeOperationArgs('Booking', 'create', { data: { totalAmount: 100 } }, TENANT);
            expect(out.data).toEqual({ totalAmount: 100, agencyId: TENANT });
        });

        it('keeps a create already stamped with the same tenant', () => {
            const out = scopeOperationArgs('Booking', 'create', { data: { agencyId: TENANT } }, TENANT);
            expect(out.data).toEqual({ agencyId: TENANT });
        });

        it('fails closed on a create stamped with a different tenant', () => {
            expect(() =>
                scopeOperationArgs('Booking', 'create', { data: { agencyId: OTHER } }, TENANT),
            ).toThrow(TenantScopeViolationError);
        });

        it('fails closed on an agency connect naming a different tenant', () => {
            expect(() =>
                scopeOperationArgs('Booking', 'create', { data: { agency: { connect: { id: OTHER } } } }, TENANT),
            ).toThrow(TenantScopeViolationError);
        });

        it('leaves a same-tenant agency connect untouched', () => {
            const data = { agency: { connect: { id: TENANT } } };
            const out = scopeOperationArgs('Booking', 'create', { data }, TENANT);
            expect(out.data).toEqual(data);
        });

        it('stamps every row of a createMany', () => {
            const out = scopeOperationArgs(
                'InvoiceLineItem', 'createMany', { data: [{ label: 'a' }, { label: 'b', agencyId: TENANT }] }, TENANT,
            );
            expect(out.data).toEqual([
                { label: 'a', agencyId: TENANT },
                { label: 'b', agencyId: TENANT },
            ]);
        });
    });

    describe('updates, deletes, upserts', () => {
        it('scopes update and delete wheres', () => {
            expect(scopeOperationArgs('Booking', 'update', { where: { id: 'x' }, data: {} }, TENANT).where)
                .toEqual({ id: 'x', agencyId: TENANT });
            expect(scopeOperationArgs('Booking', 'deleteMany', { where: {} }, TENANT).where)
                .toEqual({ agencyId: TENANT });
        });

        it('fails closed when an update tries to move a row to another tenant', () => {
            expect(() =>
                scopeOperationArgs('Booking', 'update', { where: { id: 'x' }, data: { agencyId: OTHER } }, TENANT),
            ).toThrow(TenantScopeViolationError);
            expect(() =>
                scopeOperationArgs('Booking', 'update', { where: { id: 'x' }, data: { agencyId: { set: OTHER } } }, TENANT),
            ).toThrow(TenantScopeViolationError);
        });

        it('scopes an upsert where, create and update together', () => {
            const out = scopeOperationArgs('Wallet', 'upsert', {
                where: { agencyId: TENANT },
                create: { agencyId: TENANT, availableBalance: 0 },
                update: { availableBalance: 5 },
            }, TENANT);
            expect(out.where).toEqual({ agencyId: TENANT });
            expect(out.create).toEqual({ agencyId: TENANT, availableBalance: 0 });
            expect(out.update).toEqual({ availableBalance: 5 });
        });
    });

    it('passes unknown operations through unchanged', () => {
        const args = { where: { id: 'x' } };
        expect(scopeOperationArgs('Booking', 'findRaw', args, TENANT)).toBe(args);
    });
});

describe('tenant context', () => {
    it('exposes the agency id inside runWithTenantContext and nowhere else', async () => {
        expect(currentTenantAgencyId()).toBeNull();
        const seen = runWithTenantContext('agency-a', async () => {
            await new Promise((resolve) => setImmediate(resolve));
            return currentTenantAgencyId();
        });
        await expect(seen).resolves.toBe('agency-a');
        expect(currentTenantAgencyId()).toBeNull();
    });
});

/**
 * Wiring proof without a database: a DatabaseService must route its
 * model delegates through the extension. With an unreachable
 * DATABASE_URL the proof is which error surfaces — the extension's
 * fail-closed violation (thrown before any query is attempted) versus
 * a Prisma initialisation error from the attempted connection.
 */
describe('DatabaseService wiring (#428 PR-C)', () => {
    const previousUrl = process.env.DATABASE_URL;
    let db: DatabaseService;

    beforeAll(() => {
        process.env.DATABASE_URL = 'postgresql://u:p@localhost:5499/nonexistent';
        db = new DatabaseService();
    });

    afterAll(async () => {
        await (db as unknown as { $disconnect: () => Promise<void> }).$disconnect().catch(() => undefined);
        if (previousUrl === undefined) {
            delete process.env.DATABASE_URL;
        } else {
            process.env.DATABASE_URL = previousUrl;
        }
    });

    it('fails closed inside a tenant context when the where pins another tenant', async () => {
        await runWithTenantContext('agency-a', async () => {
            await expect(
                (db as any).booking.findMany({ where: { agencyId: 'agency-b' } }),
            ).rejects.toBeInstanceOf(TenantScopeViolationError);
        });
    });

    it('passes the hook untouched outside a tenant context', async () => {
        await expect(
            (db as any).booking.findMany({ where: { agencyId: 'agency-b' } }),
        ).rejects.not.toBeInstanceOf(TenantScopeViolationError);
    });

    it('passes the hook untouched inside a context when the where is compatible', async () => {
        await runWithTenantContext('agency-a', async () => {
            await expect(
                (db as any).booking.findMany({ where: { status: 'PENDING' } }),
            ).rejects.not.toBeInstanceOf(TenantScopeViolationError);
        });
    });
});
