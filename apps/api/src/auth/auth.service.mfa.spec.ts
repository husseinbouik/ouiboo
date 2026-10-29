/**
 * #418 (Council P0-13) — admin MFA + break-glass flows in AuthService.
 *
 * Covered behaviour:
 * - an enrolled admin's password login returns an MFA challenge, never
 *   tokens; the challenge + correct TOTP completes the sign-in, the
 *   challenge is single-use, and wrong codes feed a lockout gate;
 * - with ADMIN_MFA_REQUIRED=true an unenrolled admin is forced through
 *   enrolment (start → confirm) before any token exists;
 * - recovery codes burn on use and alert by email;
 * - #660: recovery burn is atomic under concurrency — the challenge is
 *   claimed with SET NX before matching, and the code itself is claimed
 *   with a conditional updateMany keyed on the exact hashes array, so
 *   parallel submits can neither double-spend one code nor resurrect
 *   another via lost update;
 * - break-glass is a SEPARATE one-time credential: password + secret,
 *   atomic claim, audit-before-tokens (ADMIN_BREAK_GLASS_USED), alert
 *   fan-out, and uniform 401s on every failure mode;
 * - non-admin logins are untouched.
 */
import { HttpException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';

const ADMIN_EMAIL = 'admin@ouiboo.local';
const ADMIN_PASSWORD = 'correct horse battery staple';

function makeFakeRedis() {
    const store = new Map<string, { value: string; expiresAt: number }>();
    const alive = (key: string) => {
        const entry = store.get(key);
        if (!entry || entry.expiresAt <= Date.now()) {
            store.delete(key);
            return undefined;
        }
        return entry;
    };
    return {
        async get(key: string) {
            return alive(key)?.value ?? null;
        },
        async set(key: string, value: string, ...rest: any[]) {
            // ioredis call shapes used by AuthService: set(k, v) and
            // set(k, v, 'EX', seconds) and — #660 — set(k, v, 'EX',
            // seconds, 'NX'), where NX on a live key replies null and
            // writes nothing (the atomic challenge claim).
            const nx = rest.includes('NX');
            if (nx && alive(key)) return null;
            const exIndex = rest.indexOf('EX');
            const ttlSeconds = exIndex >= 0 ? Number(rest[exIndex + 1]) : undefined;
            store.set(key, {
                value: String(value),
                expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : Number.MAX_SAFE_INTEGER,
            });
            return 'OK';
        },
        async incr(key: string) {
            const current = alive(key);
            const next = (current ? parseInt(current.value, 10) : 0) + 1;
            store.set(key, {
                value: String(next),
                expiresAt: current?.expiresAt ?? Number.MAX_SAFE_INTEGER,
            });
            return next;
        },
        async expire(key: string, seconds: number) {
            const current = store.get(key);
            if (current) current.expiresAt = Date.now() + seconds * 1000;
            return 1;
        },
        async del(key: string) {
            store.delete(key);
            return 1;
        },
    };
}

type FakeUser = Record<string, any>;

function makeDb(admin: FakeUser) {
    const state = {
        users: [admin] as FakeUser[],
        auditRows: [] as Array<Record<string, any>>,
        credentials: [] as Array<Record<string, any>>,
        refreshTokens: [] as Array<Record<string, any>>,
    };
    const db = {
        user: {
            findUnique: jest.fn(async ({ where }: any) => {
                if (where.id) return state.users.find((u) => u.id === where.id) ?? null;
                if (where.email) return state.users.find((u) => u.email === where.email) ?? null;
                return null;
            }),
            findMany: jest.fn(async ({ where }: any) =>
                state.users.filter((u) => !where?.role || u.role === where.role)),
            update: jest.fn(async ({ where, data }: any) => {
                const user = state.users.find((u) => u.id === where.id) as FakeUser;
                Object.assign(user, data);
                return user;
            }),
            // #642: the single-use TOTP claim — honour the exact where
            // shape AuthService uses (id + OR over the step column).
            // #660: the recovery-code claim — conditional on the Json
            // hashes array equalling the exact value that was matched.
            updateMany: jest.fn(async ({ where, data }: any) => {
                const user = state.users.find((u) => u.id === where.id) as FakeUser;
                if (!user) return { count: 0 };
                if (where.mfaRecoveryCodeHashes && 'equals' in where.mfaRecoveryCodeHashes) {
                    const expected = JSON.stringify(where.mfaRecoveryCodeHashes.equals ?? null);
                    const actual = JSON.stringify(user.mfaRecoveryCodeHashes ?? null);
                    if (expected !== actual) return { count: 0 };
                    Object.assign(user, data);
                    return { count: 1 };
                }
                const conditions: any[] = where.OR ?? [];
                const matches = conditions.some((cond) => {
                    if (!('mfaTotpLastAcceptedStep' in cond)) return false;
                    const expected = cond.mfaTotpLastAcceptedStep;
                    if (expected === null) return user.mfaTotpLastAcceptedStep == null;
                    if (expected && typeof expected === 'object' && 'lt' in expected) {
                        return user.mfaTotpLastAcceptedStep != null
                            && user.mfaTotpLastAcceptedStep < expected.lt;
                    }
                    return false;
                });
                if (conditions.length > 0 && !matches) return { count: 0 };
                Object.assign(user, data);
                return { count: 1 };
            }),
        },
        auditLog: {
            create: jest.fn(async ({ data }: any) => {
                state.auditRows.push(data);
                return data;
            }),
        },
        breakGlassCredential: {
            create: jest.fn(async ({ data }: any) => {
                const row = { id: `bg-${state.credentials.length + 1}`, usedAt: null, revokedAt: null, createdAt: new Date(), ...data };
                state.credentials.push(row);
                return row;
            }),
            findMany: jest.fn(async ({ where = {} }: any = {}) =>
                state.credentials.filter((c) =>
                    (where.usedAt === undefined || (where.usedAt === null) === (c.usedAt === null)) &&
                    (where.revokedAt === undefined || (where.revokedAt === null) === (c.revokedAt === null)) &&
                    (!where.expiresAt?.gt || c.expiresAt > where.expiresAt.gt))),
            findUnique: jest.fn(async ({ where }: any) =>
                state.credentials.find((c) => c.id === where.id) ?? null),
            update: jest.fn(async ({ where, data }: any) => {
                const row = state.credentials.find((c) => c.id === where.id) as Record<string, any>;
                Object.assign(row, data);
                return row;
            }),
            updateMany: jest.fn(async ({ where, data }: any) => {
                const row = state.credentials.find((c) => c.id === where.id);
                if (!row || row.usedAt || row.revokedAt) return { count: 0 };
                Object.assign(row, data);
                return { count: 1 };
            }),
        },
        refreshToken: {
            create: jest.fn(async ({ data }: any) => {
                const row = { id: `rt-${state.refreshTokens.length + 1}`, ...data };
                state.refreshTokens.push(row);
                return row;
            }),
        },
    };
    return { db, state };
}

describe('AuthService admin MFA + break-glass (#418)', () => {
    const mfa = new MfaService();
    let adminPasswordHash: string;

    beforeAll(async () => {
        process.env.JWT_SECRET = 'test-access-secret-0123456789abcdef';
        process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef';
        process.env.MFA_ENCRYPTION_KEY = 'a1'.repeat(32);
        adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    });

    afterAll(() => {
        delete process.env.ADMIN_MFA_REQUIRED;
    });

    beforeEach(() => {
        delete process.env.ADMIN_MFA_REQUIRED;
    });

    function makeService(adminOverrides: Record<string, any> = {}) {
        const admin: FakeUser = {
            id: 'admin-1',
            email: ADMIN_EMAIL,
            name: 'admin',
            password: adminPasswordHash,
            role: 'ADMIN',
            isEmailVerified: true,
            mfaEnabled: false,
            mfaTotpSecret: null,
            mfaRecoveryCodeHashes: null,
            mfaEnrolledAt: null,
            mfaTotpLastAcceptedStep: null,
            ...adminOverrides,
        };
        const { db, state } = makeDb(admin);
        const jwtService = new JwtService({});
        const emailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
        const redis = makeFakeRedis();
        const service = new AuthService(
            db as never,
            jwtService,
            emailService as never,
            { getClient: () => redis } as never,
            mfa,
        );
        return { service, state, admin, emailService, redis };
    }

    /** TOTP code for the step `stepOffset` away from the current one,
     * generated mid-step so the step it belongs to is unambiguous.
     * (otplib v12 takes `epoch` in milliseconds.) */
    function totpCodeForStep(secret: string, stepOffset: number): string {
        const nowSeconds = Math.floor(Date.now() / 1000);
        const currentStepStart = Math.floor(nowSeconds / 30) * 30;
        const epoch = (currentStepStart + stepOffset * 30 + 15) * 1000;
        authenticator.options = { window: 1, epoch };
        try {
            return mfa.generateTotpCode(secret);
        } finally {
            // otplib options merge and never unset: a shifted epoch
            // would poison every later verification in this process.
            authenticator.resetOptions();
            authenticator.options = { window: 1 };
        }
    }

    async function enrollAdmin(service: AuthService) {
        const start = await service.startMfaEnrollment('admin-1', false, ADMIN_PASSWORD);
        const secret = start.secret;
        // #642: enrolment consumes the code it confirms with (it is
        // recorded as the last accepted step), so confirm with the
        // PREVIOUS step's code — exactly like an admin who enrolled a
        // moment ago. The current step's code stays usable below.
        const code = totpCodeForStep(secret, -1);
        const confirmed = await service.confirmMfaEnrollment('admin-1', false, code);
        return { secret, recoveryCodes: confirmed.recoveryCodes as string[] };
    }

    it('returns an MFA challenge (not tokens) for an enrolled admin, and TOTP completes sign-in', async () => {
        const { service, state, admin } = makeService();
        const { secret } = await enrollAdmin(service);
        expect(admin.mfaEnabled).toBe(true);

        const begin: any = await service.beginLogin(admin);
        expect(begin.accessToken).toBeUndefined();
        expect(begin.mfaRequired).toBe(true);
        expect(typeof begin.challengeToken).toBe('string');

        const tokens = await service.verifyMfa(begin.challengeToken, mfa.generateTotpCode(secret));
        expect(tokens.accessToken).toBeTruthy();
        expect(tokens.refreshToken).toBeTruthy();
        expect(state.auditRows.map((r) => r.action)).toContain('ADMIN_MFA_ENROLLED');
        expect(state.auditRows.map((r) => r.action)).toContain('ADMIN_LOGIN_SUCCEEDED');

        // The challenge is single-use: replaying it must fail.
        await expect(
            service.verifyMfa(begin.challengeToken, mfa.generateTotpCode(secret)),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong TOTP code and locks the challenge gate after 5 failures', async () => {
        const { service, admin } = makeService();
        const { secret } = await enrollAdmin(service);
        const good = mfa.generateTotpCode(secret);
        const wrong = good === '000000' ? '111111' : '000000';

        for (let i = 0; i < 5; i++) {
            const begin: any = await service.beginLogin(admin);
            await expect(service.verifyMfa(begin.challengeToken, wrong))
                .rejects.toBeInstanceOf(UnauthorizedException);
        }
        const begin: any = await service.beginLogin(admin);
        const error = await service.verifyMfa(begin.challengeToken, good).catch((e) => e);
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(429);
    });

    describe('single-use TOTP (#642)', () => {
        it('refuses the same code a second time (fresh challenge)', async () => {
            const { service, admin } = makeService();
            const { secret } = await enrollAdmin(service);
            const code = totpCodeForStep(secret, 0);

            const begin1: any = await service.beginLogin(admin);
            const tokens = await service.verifyMfa(begin1.challengeToken, code);
            expect(tokens.accessToken).toBeTruthy();
            expect(admin.mfaTotpLastAcceptedStep).not.toBeNull();

            const begin2: any = await service.beginLogin(admin);
            await expect(service.verifyMfa(begin2.challengeToken, code))
                .rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('refuses a previous-step code after the current step succeeded', async () => {
            const { service, admin } = makeService();
            const { secret } = await enrollAdmin(service);

            const begin1: any = await service.beginLogin(admin);
            await service.verifyMfa(begin1.challengeToken, totpCodeForStep(secret, 0));

            const begin2: any = await service.beginLogin(admin);
            await expect(service.verifyMfa(begin2.challengeToken, totpCodeForStep(secret, -1)))
                .rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('still admits the next step code — the ±1 drift window is unchanged', async () => {
            const { service, admin } = makeService();
            const { secret } = await enrollAdmin(service);

            const begin1: any = await service.beginLogin(admin);
            await service.verifyMfa(begin1.challengeToken, totpCodeForStep(secret, 0));

            const begin2: any = await service.beginLogin(admin);
            const tokens = await service.verifyMfa(begin2.challengeToken, totpCodeForStep(secret, 1));
            expect(tokens.accessToken).toBeTruthy();
        });

        it('consumes the enrolment code: it cannot be replayed as the first sign-in code', async () => {
            const { service, admin } = makeService();
            const start = await service.startMfaEnrollment('admin-1', false, ADMIN_PASSWORD);
            const enrollCode = totpCodeForStep(start.secret, 0);
            await service.confirmMfaEnrollment('admin-1', false, enrollCode);

            const begin: any = await service.beginLogin(admin);
            await expect(service.verifyMfa(begin.challengeToken, enrollCode))
                .rejects.toBeInstanceOf(UnauthorizedException);
        });
    });

    it('forces enrolment at login when ADMIN_MFA_REQUIRED=true', async () => {
        process.env.ADMIN_MFA_REQUIRED = 'true';
        const { service, admin } = makeService();
        const begin: any = await service.beginLogin(admin);
        expect(begin.accessToken).toBeUndefined();
        expect(begin.mfaEnrollmentRequired).toBe(true);

        // The enrolment challenge token drives start + confirm; confirm
        // completes the sign-in with real tokens and one-time codes.
        const start = await service.startMfaEnrollment(admin.id, true);
        const confirmed = await service.confirmMfaEnrollment(
            admin.id, true, mfa.generateTotpCode(start.secret),
        );
        expect(confirmed.accessToken).toBeTruthy();
        expect(confirmed.recoveryCodes).toHaveLength(10);
        expect(admin.mfaEnabled).toBe(true);
    });

    it('requires password re-entry for enrolment with a full access token', async () => {
        const { service } = makeService();
        await expect(service.startMfaEnrollment('admin-1', false, 'wrong-password'))
            .rejects.toBeInstanceOf(UnauthorizedException);
        await expect(service.startMfaEnrollment('admin-1', false))
            .rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('burns a recovery code on use, audits it, and alerts by email', async () => {
        const { service, state, admin, emailService } = makeService();
        const { recoveryCodes } = await enrollAdmin(service);

        const begin: any = await service.beginLogin(admin);
        const tokens = await service.verifyMfaRecovery(begin.challengeToken, recoveryCodes[0].toLowerCase());
        expect(tokens.accessToken).toBeTruthy();
        expect(admin.mfaRecoveryCodeHashes).toHaveLength(9);
        expect(state.auditRows.map((r) => r.action)).toContain('ADMIN_MFA_RECOVERY_USED');
        expect(emailService.sendMail).toHaveBeenCalled();

        // The same code a second time (fresh challenge) must fail.
        const begin2: any = await service.beginLogin(admin);
        await expect(service.verifyMfaRecovery(begin2.challengeToken, recoveryCodes[0]))
            .rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('#660: parallel dual-submit of ONE recovery code (two challenges) succeeds exactly once', async () => {
        const { service, admin } = makeService();
        const { recoveryCodes } = await enrollAdmin(service);

        const beginA: any = await service.beginLogin(admin);
        const beginB: any = await service.beginLogin(admin);
        const results = await Promise.allSettled([
            service.verifyMfaRecovery(beginA.challengeToken, recoveryCodes[0]),
            service.verifyMfaRecovery(beginB.challengeToken, recoveryCodes[0]),
        ]);
        const fulfilled = results.filter((r) => r.status === 'fulfilled');
        const rejected = results.filter((r) => r.status === 'rejected');
        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(UnauthorizedException);
        // The code burned exactly once — 9 remain, not 8, and the spent
        // code cannot be resurrected by the losing write.
        expect(admin.mfaRecoveryCodeHashes).toHaveLength(9);
        const status = await service.getMfaStatus('admin-1');
        expect(status.recoveryCodesRemaining).toBe(9);
    });

    it('#660: parallel submit of TWO different recovery codes burns both exactly once', async () => {
        const { service, admin } = makeService();
        const { recoveryCodes } = await enrollAdmin(service);

        const beginA: any = await service.beginLogin(admin);
        const beginB: any = await service.beginLogin(admin);
        const results = await Promise.allSettled([
            service.verifyMfaRecovery(beginA.challengeToken, recoveryCodes[0]),
            service.verifyMfaRecovery(beginB.challengeToken, recoveryCodes[1]),
        ]);
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
        // Neither code was resurrected by the other's lost update.
        expect(admin.mfaRecoveryCodeHashes).toHaveLength(8);
    });

    it('#660: parallel submits carrying the SAME challenge succeed exactly once', async () => {
        const { service, admin } = makeService();
        const { recoveryCodes } = await enrollAdmin(service);

        const begin: any = await service.beginLogin(admin);
        const results = await Promise.allSettled([
            service.verifyMfaRecovery(begin.challengeToken, recoveryCodes[0]),
            service.verifyMfaRecovery(begin.challengeToken, recoveryCodes[0]),
        ]);
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
        expect(admin.mfaRecoveryCodeHashes).toHaveLength(9);
    });

    it('#660: a failed code match still spends the challenge (claim before matching)', async () => {
        const { service, admin } = makeService();
        const { recoveryCodes } = await enrollAdmin(service);

        const begin: any = await service.beginLogin(admin);
        await expect(service.verifyMfaRecovery(begin.challengeToken, 'ZZZZ-ZZZZ'))
            .rejects.toBeInstanceOf(UnauthorizedException);
        // The same challenge cannot be retried with the correct code —
        // it was claimed by the failed attempt; a fresh login is needed.
        await expect(service.verifyMfaRecovery(begin.challengeToken, recoveryCodes[0]))
            .rejects.toBeInstanceOf(UnauthorizedException);
        // …and the correct code itself was NOT burned by any of this.
        expect(admin.mfaRecoveryCodeHashes).toHaveLength(10);
    });

    it('leaves non-admin login untouched', async () => {
        const { service } = makeService();
        const traveler = { id: 't-1', email: 't@example.com', name: 'T', role: 'TRAVELER' };
        const result: any = await service.beginLogin(traveler);
        expect(result.accessToken).toBeTruthy();
        expect(result.mfaRequired).toBeUndefined();
    });

    describe('break-glass', () => {
        it('creates a credential with password re-entry and stores only a hash', async () => {
            const { service, state } = makeService();
            await expect(service.createBreakGlassCredential('admin-1', {
                label: 'Safe envelope', password: 'nope',
            })).rejects.toBeInstanceOf(UnauthorizedException);

            const created = await service.createBreakGlassCredential('admin-1', {
                label: 'Safe envelope', password: ADMIN_PASSWORD, expiresInDays: 30,
            });
            expect(created.secret).toMatch(/^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/);
            expect(state.credentials).toHaveLength(1);
            expect(state.credentials[0].secretHash).not.toContain(created.secret.replace(/-/g, ''));
            expect(state.auditRows.map((r) => r.action)).toContain('ADMIN_BREAK_GLASS_CREATED');
        });

        it('signs in with password + secret exactly once, audits before tokens, and alerts', async () => {
            const { service, state, emailService } = makeService();
            const created = await service.createBreakGlassCredential('admin-1', {
                label: 'Safe envelope', password: ADMIN_PASSWORD,
            });

            // Wrong secret: generic 401 + failure audit row.
            await expect(service.useBreakGlass(ADMIN_EMAIL, ADMIN_PASSWORD, 'AAAAA-BBBBB-CCCCC-DDDDD'))
                .rejects.toBeInstanceOf(UnauthorizedException);
            expect(state.auditRows.map((r) => r.action)).toContain('ADMIN_BREAK_GLASS_FAILED');

            // Wrong password: same generic 401.
            await expect(service.useBreakGlass(ADMIN_EMAIL, 'wrong-password', created.secret))
                .rejects.toBeInstanceOf(UnauthorizedException);

            const result = await service.useBreakGlass(ADMIN_EMAIL, ADMIN_PASSWORD, created.secret.toLowerCase());
            expect(result.accessToken).toBeTruthy();
            expect(result.usedBreakGlass).toBe(true);
            expect(state.credentials[0].usedAt).toBeInstanceOf(Date);
            expect(state.credentials[0].usedByEmail).toBe(ADMIN_EMAIL);
            const actions = state.auditRows.map((r) => r.action);
            expect(actions).toContain('ADMIN_BREAK_GLASS_USED');
            expect(actions.indexOf('ADMIN_BREAK_GLASS_USED'))
                .toBeLessThan(actions.lastIndexOf('ADMIN_LOGIN_SUCCEEDED'));
            expect(emailService.sendMail).toHaveBeenCalled();

            // One-time: replay fails.
            await expect(service.useBreakGlass(ADMIN_EMAIL, ADMIN_PASSWORD, created.secret))
                .rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('refuses a revoked credential and lists credential metadata without secrets', async () => {
            const { service } = makeService();
            const created = await service.createBreakGlassCredential('admin-1', {
                label: 'Safe envelope', password: ADMIN_PASSWORD,
            });
            const list = await service.listBreakGlassCredentials('admin-1');
            expect(list).toHaveLength(1);
            expect(list[0].status).toBe('ACTIVE');
            expect(JSON.stringify(list)).not.toContain('secretHash');

            await service.revokeBreakGlassCredential('admin-1', created.id);
            await expect(service.useBreakGlass(ADMIN_EMAIL, ADMIN_PASSWORD, created.secret))
                .rejects.toBeInstanceOf(UnauthorizedException);
            const after = await service.listBreakGlassCredentials('admin-1');
            expect(after[0].status).toBe('REVOKED');
        });

        it('fails closed when the break-glass audit write fails', async () => {
            const { service, state } = makeService();
            const created = await service.createBreakGlassCredential('admin-1', {
                label: 'Safe envelope', password: ADMIN_PASSWORD,
            });
            // Break audit writes from here on.
            const db: any = (service as any).db;
            db.auditLog.create.mockImplementation(async ({ data }: any) => {
                if (data.action === 'ADMIN_BREAK_GLASS_USED') throw new Error('db down');
                state.auditRows.push(data);
                return data;
            });
            await expect(service.useBreakGlass(ADMIN_EMAIL, ADMIN_PASSWORD, created.secret))
                .rejects.toBeInstanceOf(HttpException);
            // The credential stays burned — the safe direction.
            expect(state.credentials[0].usedAt).toBeInstanceOf(Date);
        });
    });

    describe('status, enrolment guards, and credential lifecycle edges', () => {
        it('reports MFA status with the remaining recovery-code count', async () => {
            const { service } = makeService();
            const before = await service.getMfaStatus('admin-1');
            expect(before).toMatchObject({ mfaEnabled: false, recoveryCodesRemaining: 0, adminMfaRequired: false });
            await enrollAdmin(service);
            const after = await service.getMfaStatus('admin-1');
            expect(after.mfaEnabled).toBe(true);
            expect(after.recoveryCodesRemaining).toBe(10);
            expect(after.mfaEnrolledAt).toBeTruthy();
        });

        it('rejects MFA status for a non-admin actor', async () => {
            const { service, state } = makeService();
            state.users.push({ id: 'trav-1', email: 't@example.com', role: 'TRAVELER', isEmailVerified: true });
            await expect(service.getMfaStatus('trav-1')).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('issues plain tokens to an unenrolled admin when MFA is not required, and audits it', async () => {
            const { service, state, admin } = makeService();
            const result: any = await service.beginLogin(admin);
            expect(result.accessToken).toEqual(expect.any(String));
            expect(result.refreshToken).toEqual(expect.any(String));
            expect(state.auditRows.some((r) => r.action === 'ADMIN_LOGIN_SUCCEEDED')).toBe(true);
        });

        it('rejects enrolment start with a wrong password', async () => {
            const { service } = makeService();
            await expect(service.startMfaEnrollment('admin-1', false, 'wrong-password')).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('rejects enrolment confirmation when no enrolment is pending', async () => {
            const { service } = makeService();
            const err = await service.confirmMfaEnrollment('admin-1', false, '123456').catch((e) => e);
            expect(err).toBeInstanceOf(HttpException);
            expect(err.getStatus()).toBe(400);
        });

        it('refuses to revoke a used or already-revoked credential', async () => {
            const { service, state } = makeService();
            const used = await service.createBreakGlassCredential('admin-1', { label: 'Used one', password: ADMIN_PASSWORD });
            await service.useBreakGlass(ADMIN_EMAIL, ADMIN_PASSWORD, used.secret as string);
            const errUsed = await service.revokeBreakGlassCredential('admin-1', used.id).catch((e) => e);
            expect(errUsed.getStatus()).toBe(400);
            expect((errUsed.getResponse() as any).message).toBe('CREDENTIAL_NOT_REVOCABLE');

            const second = await service.createBreakGlassCredential('admin-1', { label: 'Second', password: ADMIN_PASSWORD });
            await service.revokeBreakGlassCredential('admin-1', second.id);
            const errAgain = await service.revokeBreakGlassCredential('admin-1', second.id).catch((e) => e);
            expect(errAgain.getStatus()).toBe(400);
            expect(state.auditRows.filter((r) => r.action === 'ADMIN_BREAK_GLASS_REVOKED')).toHaveLength(1);
        });

        it('derives EXPIRED status for an unused credential past its expiry', async () => {
            const { service, state } = makeService();
            const created = await service.createBreakGlassCredential('admin-1', { label: 'Old', password: ADMIN_PASSWORD, expiresInDays: 1 });
            state.credentials[0].expiresAt = new Date(Date.now() - 60_000);
            const list = await service.listBreakGlassCredentials('admin-1');
            expect(list.find((c) => c.id === created.id)?.status).toBe('EXPIRED');
        });

        it('rejects break-glass sign-in with an expired credential and audits the failure', async () => {
            const { service, state } = makeService();
            const created = await service.createBreakGlassCredential('admin-1', { label: 'Old', password: ADMIN_PASSWORD });
            state.credentials[0].expiresAt = new Date(Date.now() - 60_000);
            await expect(service.useBreakGlass(ADMIN_EMAIL, ADMIN_PASSWORD, created.secret as string)).rejects.toBeInstanceOf(UnauthorizedException);
            expect(state.auditRows.some((r) => r.action === 'ADMIN_BREAK_GLASS_FAILED')).toBe(true);
        });

        it('rejects a wrong recovery code without burning any code', async () => {
            const { service, admin } = makeService();
            const { recoveryCodes } = await enrollAdmin(service);
            const begin: any = await service.beginLogin(admin);
            await expect(service.verifyMfaRecovery(begin.challengeToken, 'ZZZZ-ZZZZ')).rejects.toBeInstanceOf(UnauthorizedException);
            const status = await service.getMfaStatus('admin-1');
            expect(status.recoveryCodesRemaining).toBe(recoveryCodes.length);
        });

        it('caps break-glass TTL at the maximum and trims the label', async () => {
            const { service } = makeService();
            const created = await service.createBreakGlassCredential('admin-1', { label: '  Vault copy  ', password: ADMIN_PASSWORD, expiresInDays: 10_000 });
            expect(created.label).toBe('Vault copy');
            const maxMs = 365 * 24 * 60 * 60 * 1000;
            expect(created.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(maxMs);
            expect(created.expiresAt.getTime() - Date.now()).toBeGreaterThan(maxMs - 60_000);
        });
    });
});
