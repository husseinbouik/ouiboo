import { UsersService } from './users.service';

/**
 * #777: GET /users/me/referrals backing service — recognition only.
 * NOTE (explicit, for the #777 reviewer): the payload is exactly
 * { referralCode, referralCount }. No value/balance field exists in
 * it — asserted by exact key equality below.
 */
describe('UsersService.getReferrals (#777)', () => {
    const createService = (overrides: Record<string, unknown> = {}) => {
        const db = {
            user: {
                findUnique: jest.fn().mockResolvedValue({ referralCode: 'OUI-MYCODE1234' }),
                update: jest.fn().mockResolvedValue({}),
                count: jest.fn().mockResolvedValue(3),
                ...overrides,
            },
        };
        return { db, service: new UsersService(db as never, {} as never) };
    };

    it('returns the caller code and an accurate attributed count', async () => {
        const { db, service } = createService();
        const result = await service.getReferrals('user-1');
        expect(result).toEqual({ referralCode: 'OUI-MYCODE1234', referralCount: 3 });
        expect(db.user.count).toHaveBeenCalledWith({ where: { referredById: 'user-1' } });
    });

    it('payload has no value/balance field — exactly two keys', async () => {
        const { service } = createService();
        const result = await service.getReferrals('user-1');
        expect(Object.keys(result).sort()).toEqual(['referralCode', 'referralCount']);
    });

    it('assigns a code lazily to an existing account that has none', async () => {
        const { db, service } = createService({
            findUnique: jest.fn().mockResolvedValue({ referralCode: null }),
            count: jest.fn().mockResolvedValue(0),
        });
        const result = await service.getReferrals('legacy-1');
        expect(typeof result.referralCode).toBe('string');
        expect(result.referralCode.length).toBeGreaterThan(0);
        expect(result.referralCount).toBe(0);
        expect(db.user.update).toHaveBeenCalledWith({
            where: { id: 'legacy-1' },
            data: { referralCode: result.referralCode },
        });
    });

    it('reports zero for an account nobody has joined through yet', async () => {
        const { service } = createService({ count: jest.fn().mockResolvedValue(0) });
        const result = await service.getReferrals('user-9');
        expect(result.referralCount).toBe(0);
    });
});
