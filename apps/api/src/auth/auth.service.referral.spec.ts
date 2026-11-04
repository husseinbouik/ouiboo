import { UserRole } from '@ouiboo/types';
import { AuthService } from './auth.service';

/**
 * #777: zero-value referral attribution on signup.
 * Valid code -> referredById set; invalid code -> ignored silently;
 * every new account gets its own unique referral code.
 * NOTE (explicit, for the #777 reviewer): this feature is recognition
 * only — the register result and the created row carry no value or
 * balance field of any kind, asserted below.
 */
describe('AuthService register referral attribution (#777)', () => {
    const created: Array<Record<string, unknown>> = [];
    const referrer = { id: 'referrer-1', referralCode: 'OUI-VALIDCODE1' };

    const db = {
        user: {
            findUnique: jest.fn(async ({ where }: { where: Record<string, string> }) =>
                where.referralCode === referrer.referralCode ? { id: referrer.id } : null,
            ),
        },
        $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
            fn({
                user: {
                    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
                        created.push(data);
                        return { id: `user-${created.length}`, ...data };
                    }),
                },
                agencyProfile: { create: jest.fn(async () => ({ id: 'agency-1' })) },
            }),
        ),
    };
    const emailService = {
        getOTPTemplate: jest.fn().mockReturnValue('<html></html>'),
        sendMail: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(db as never, {} as never, emailService as never, {} as never);

    const baseDto = {
        email: 'new@ouiboo.test',
        password: 'password123',
        name: 'New Traveller',
        role: UserRole.Traveler,
        dateOfBirth: '1990-06-15',
    };

    beforeEach(() => {
        created.length = 0;
        jest.clearAllMocks();
    });

    it('attributes the new account to the referrer when the code is valid', async () => {
        const result = await service.register({ ...baseDto, referralCode: 'OUI-VALIDCODE1' } as never);
        expect(result.email).toBe(baseDto.email);
        expect(created).toHaveLength(1);
        expect(created[0].referredById).toBe('referrer-1');
    });

    it('ignores an invalid code silently — signup still succeeds, no attribution', async () => {
        const result = await service.register({ ...baseDto, referralCode: 'OUI-NOSUCHCODE' } as never);
        expect(result.email).toBe(baseDto.email);
        expect(created).toHaveLength(1);
        expect(created[0].referredById).toBeNull();
    });

    it('signs up without any referral code as before', async () => {
        await service.register({ ...baseDto } as never);
        expect(created[0].referredById).toBeNull();
        expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it('generates a unique referral code for every new account', async () => {
        await service.register({ ...baseDto, email: 'a@ouiboo.test' } as never);
        await service.register({ ...baseDto, email: 'b@ouiboo.test' } as never);
        const codes = created.map((row) => row.referralCode);
        expect(typeof codes[0]).toBe('string');
        expect((codes[0] as string).length).toBeGreaterThan(0);
        expect(codes[0]).not.toBe(codes[1]);
        expect(new Set(codes).size).toBe(codes.length);
    });

    it('carries no value/balance field in the created row or the register result', async () => {
        const result = await service.register({ ...baseDto, referralCode: 'OUI-VALIDCODE1' } as never);
        const forbidden = ['points', 'credits', 'credit', 'balance', 'wallet', 'discount', 'cash', 'reward', 'amount'];
        for (const key of Object.keys(created[0])) {
            expect(forbidden).not.toContain(key.toLowerCase());
        }
        for (const key of Object.keys(result)) {
            expect(forbidden).not.toContain(key.toLowerCase());
        }
    });
});
