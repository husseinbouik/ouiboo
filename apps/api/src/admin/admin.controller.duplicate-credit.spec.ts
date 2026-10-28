import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';

/** #494 (B16): admin duplicate-credit queue — resolve/dismiss paths. */
describe('AdminController duplicate-credit flags (#494)', () => {
    const req: any = { user: { userId: 'admin-1', email: 'admin@example.com' } };

    const flagRow = (overrides: Record<string, unknown> = {}) => ({
        id: 'flag-1',
        bookingId: 'booking-1',
        externalPaymentId: 'payment-1',
        agencyId: 'agency-1',
        reportedBy: 'agency-user-1',
        amount: 200,
        currency: 'MAD',
        bankReference: 'DUP-REF-1',
        note: null,
        status: 'OPEN',
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
        createdAt: new Date('2026-10-27T08:00:00.000Z'),
        updatedAt: new Date('2026-10-27T08:00:00.000Z'),
        ...overrides,
    });

    function makeController(flags: any[], byId?: any) {
        const db: any = {
            duplicateCreditFlag: {
                findMany: jest.fn(async () => flags),
                findUnique: jest.fn(async () => byId ?? null),
                update: jest.fn(async ({ data }: any) => flagRow({ ...byId, ...data })),
            },
        };
        const auditLogService: any = { log: jest.fn().mockResolvedValue(undefined) };
        const controller = new AdminController(
            db,
            {} as any,
            {} as any,
            {} as any,
            auditLogService,
            {} as any,
        );
        return { controller, db, auditLogService };
    }

    it('lists flags OPEN-first with serialized amounts', async () => {
        const resolved = flagRow({
            id: 'flag-old',
            status: 'RESOLVED',
            resolvedBy: 'admin-0',
            resolvedAt: new Date('2026-10-26T08:00:00.000Z'),
            createdAt: new Date('2026-10-25T08:00:00.000Z'),
        });
        const open = flagRow({ id: 'flag-new' });
        const { controller } = makeController([open, resolved]);

        const result = await controller.listDuplicateCreditFlags();

        expect(result.map((f) => f.id)).toEqual(['flag-new', 'flag-old']);
        expect(result[0].amount).toBe('200.00');
        expect(result[0].status).toBe('OPEN');
    });

    it('resolves an OPEN flag, stamps the resolver and writes an audit entry', async () => {
        const { controller, db, auditLogService } = makeController([], flagRow());

        const result = await controller.resolveDuplicateCreditFlag(req, 'flag-1', {
            status: 'RESOLVED',
            resolutionNote: 'Agency confirmed the duplicate was returned to the traveller',
        });

        expect(result.status).toBe('RESOLVED');
        expect(result.resolvedBy).toBe('admin-1');
        const updateData = db.duplicateCreditFlag.update.mock.calls[0][0].data;
        expect(updateData.status).toBe('RESOLVED');
        expect(updateData.resolutionNote).toContain('returned to the traveller');
        expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
            action: 'DUPLICATE_CREDIT_FLAG_CLOSED',
            targetId: 'flag-1',
        }));
    });

    it('defaults to RESOLVED when no status is given', async () => {
        const { controller, db } = makeController([], flagRow());
        await controller.resolveDuplicateCreditFlag(req, 'flag-1', {});
        expect(db.duplicateCreditFlag.update.mock.calls[0][0].data.status).toBe('RESOLVED');
    });

    it('rejects an invalid resolution status', async () => {
        const { controller } = makeController([], flagRow());
        await expect(
            controller.resolveDuplicateCreditFlag(req, 'flag-1', { status: 'MAYBE' as any }),
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects resolving a flag that does not exist', async () => {
        const { controller } = makeController([], null);
        await expect(
            controller.resolveDuplicateCreditFlag(req, 'nope', { status: 'RESOLVED' }),
        ).rejects.toThrow('not found');
    });

    it('rejects resolving an already-closed flag', async () => {
        const { controller, db } = makeController([], flagRow({ status: 'DISMISSED' }));
        await expect(
            controller.resolveDuplicateCreditFlag(req, 'flag-1', { status: 'RESOLVED' }),
        ).rejects.toThrow('already closed');
        expect(db.duplicateCreditFlag.update).not.toHaveBeenCalled();
    });
});
