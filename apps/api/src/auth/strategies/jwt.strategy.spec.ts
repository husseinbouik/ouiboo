/**
 * #418 (Council P0-13) — JwtStrategy must never honour purpose-scoped
 * tokens (MFA challenge / enrolment) as access tokens.
 */
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy purpose rejection (#418)', () => {
    const db = {
        user: {
            findUnique: jest.fn(async () => ({
                id: 'admin-1',
                email: 'admin@ouiboo.local',
                role: 'ADMIN',
                isEmailVerified: true,
                agencyProfile: null,
            })),
        },
    };

    beforeAll(() => {
        process.env.JWT_SECRET = 'strategy-test-secret';
    });

    it('rejects tokens carrying an mfa-challenge purpose', async () => {
        const strategy = new JwtStrategy(db as never);
        await expect(strategy.validate({ sub: 'admin-1', purpose: 'mfa-challenge' }))
            .rejects.toBeInstanceOf(UnauthorizedException);
        await expect(strategy.validate({ sub: 'admin-1', purpose: 'mfa-enrollment' }))
            .rejects.toBeInstanceOf(UnauthorizedException);
        expect(db.user.findUnique).not.toHaveBeenCalled();
    });

    it('accepts a normal access-token payload', async () => {
        const strategy = new JwtStrategy(db as never);
        const result = await strategy.validate({ sub: 'admin-1' });
        expect(result.id).toBe('admin-1');
        expect(result.role).toBe('ADMIN');
    });
});
