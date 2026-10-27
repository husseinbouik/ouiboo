import { AgencyController } from './agency.controller';

/** #494 (B16): the agency flag list is scoped to req.tenantId. */
describe('AgencyController duplicate-credit flags (#494)', () => {
    const flagRow = (overrides: Record<string, unknown> = {}) => ({
        id: 'flag-1',
        bookingId: 'booking-1',
        externalPaymentId: 'payment-1',
        agencyId: 'agency-1',
        reportedBy: 'agency-user-1',
        amount: 350,
        currency: 'MAD',
        bankReference: 'DUP-REF-9',
        note: 'Traveller transferred the deposit twice',
        status: 'OPEN',
        resolvedBy: null,
        resolvedAt: null,
        resolutionNote: null,
        createdAt: new Date('2026-10-27T08:00:00.000Z'),
        updatedAt: new Date('2026-10-27T08:00:00.000Z'),
        ...overrides,
    });

    it('queries only the caller’s tenant and serializes money + dates', async () => {
        const db: any = {
            duplicateCreditFlag: {
                findMany: jest.fn(async () => [flagRow()]),
            },
        };
        const controller = new AgencyController(db, {} as any);

        const result = await controller.listDuplicateCreditFlags({ tenantId: 'agency-1' } as any);

        expect(db.duplicateCreditFlag.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { agencyId: 'agency-1' },
        }));
        expect(result).toHaveLength(1);
        expect(result[0].amount).toBe('350.00');
        expect(result[0].createdAt).toBe('2026-10-27T08:00:00.000Z');
        expect(result[0].status).toBe('OPEN');
    });

    it('returns an empty list when the agency has no flags', async () => {
        const db: any = {
            duplicateCreditFlag: {
                findMany: jest.fn(async () => []),
            },
        };
        const controller = new AgencyController(db, {} as any);

        await expect(
            controller.listDuplicateCreditFlags({ tenantId: 'agency-2' } as any),
        ).resolves.toEqual([]);
    });
});
