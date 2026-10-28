/**
 * #418 (Council P0-13) — MfaEnrollmentGuard.
 *
 * Enrolment endpoints accept exactly two credentials: a normal admin
 * access token, or the short-lived `mfa-enrollment` challenge issued by
 * login when ADMIN_MFA_REQUIRED=true. The `mfa-challenge` token (and any
 * non-admin token) must NOT open enrolment.
 */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MfaEnrollmentGuard } from './mfa-enrollment.guard';

const SECRET = 'guard-test-secret-0123456789abcdef';

function makeContext(token?: string) {
    const req: any = { headers: token ? { authorization: `Bearer ${token}` } : {} };
    return {
        context: { switchToHttp: () => ({ getRequest: () => req }) } as any,
        req,
    };
}

describe('MfaEnrollmentGuard (#418)', () => {
    const jwtService = new JwtService({});
    const users: Record<string, any> = {
        'admin-1': { id: 'admin-1', email: 'admin@ouiboo.local', role: 'ADMIN', isEmailVerified: true },
        'trav-1': { id: 'trav-1', email: 't@example.com', role: 'TRAVELER', isEmailVerified: true },
    };
    const db = {
        user: {
            findUnique: jest.fn(async ({ where }: any) => users[where.id] ?? null),
        },
    };
    const guard = new MfaEnrollmentGuard(jwtService, db as never);

    beforeAll(() => {
        process.env.JWT_SECRET = SECRET;
    });

    const sign = (payload: Record<string, any>) =>
        jwtService.sign(payload, { secret: SECRET, expiresIn: '5m' });

    it('accepts a normal admin access token (no challenge flag)', async () => {
        const { context, req } = makeContext(sign({ sub: 'admin-1', email: 'admin@ouiboo.local', role: 'ADMIN' }));
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(req.mfaEnrollmentViaChallenge).toBe(false);
        expect(req.user.id).toBe('admin-1');
    });

    it('accepts an mfa-enrollment challenge token and flags it', async () => {
        const { context, req } = makeContext(sign({ sub: 'admin-1', purpose: 'mfa-enrollment', jti: 'j-1' }));
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(req.mfaEnrollmentViaChallenge).toBe(true);
    });

    it('rejects an mfa-challenge token (wrong purpose)', async () => {
        const { context } = makeContext(sign({ sub: 'admin-1', purpose: 'mfa-challenge', jti: 'j-2' }));
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a token whose user no longer exists or is unverified', async () => {
        const ghost = makeContext(sign({ sub: 'ghost-1', role: 'ADMIN' }));
        await expect(guard.canActivate(ghost.context)).rejects.toBeInstanceOf(UnauthorizedException);
        users['admin-unverified'] = { id: 'admin-unverified', email: 'u@ouiboo.local', role: 'ADMIN', isEmailVerified: false };
        const unverified = makeContext(sign({ sub: 'admin-unverified', role: 'ADMIN' }));
        await expect(guard.canActivate(unverified.context)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a token signed with a different secret', async () => {
        const foreign = jwtService.sign({ sub: 'admin-1', role: 'ADMIN' }, { secret: 'some-other-secret-0123456789', expiresIn: '5m' });
        const { context } = makeContext(foreign);
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects non-admin tokens and missing/garbage tokens', async () => {
        const traveller = makeContext(sign({ sub: 'trav-1', role: 'TRAVELER' }));
        await expect(guard.canActivate(traveller.context)).rejects.toBeInstanceOf(UnauthorizedException);
        const missing = makeContext(undefined);
        await expect(guard.canActivate(missing.context)).rejects.toBeInstanceOf(UnauthorizedException);
        const garbage = makeContext('not-a-jwt');
        await expect(guard.canActivate(garbage.context)).rejects.toBeInstanceOf(UnauthorizedException);
    });
});
