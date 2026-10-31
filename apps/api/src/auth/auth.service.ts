import { Injectable, UnauthorizedException, HttpException, HttpStatus, Logger, Optional, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { UserRole } from '@ouiboo/types';
import { RedisService } from '../common/redis.service';
import { CURRENT_SUBSCRIPTION_TERMS_VERSION } from '../common/subscription-terms';
import {
    MfaService,
    BREAK_GLASS_DEFAULT_TTL_DAYS,
    BREAK_GLASS_MAX_TTL_DAYS,
} from './mfa.service';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// #321: age gate. Ouiboo contracts bookings, which minors cannot legally
// enter, so accounts are 18+. Enforced server-side in register(); the client
// checks are UX only. CURRENT_TERMS_VERSION is recorded with the attestation
// so a future terms change (legal sign-off: #251) can bump it in one place.
export const MINIMUM_ACCOUNT_AGE = 18;
export const CURRENT_TERMS_VERSION = '1.0';

export function ageInYears(dateOfBirth: Date, on: Date): number {
    let age = on.getFullYear() - dateOfBirth.getFullYear();
    const monthDelta = on.getMonth() - dateOfBirth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && on.getDate() < dateOfBirth.getDate())) {
        age -= 1;
    }
    return age;
}
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const UNAUTHORIZED_MESSAGE = 'Unauthorized';

// #264: cheap pre-bcrypt risk gate.
// bcrypt.compare costs ~200-300ms of CPU; a Redis GET costs ~0.1ms. This gate
// tracks failed logins per email in Redis and fails fast (429) once the
// threshold is exceeded, so credential-stuffing cannot burn bcrypt CPU.
// Sliding window via key TTL — never a permanent lockout. Fails open if
// Redis is unavailable so login never breaks on a Redis outage.
const LOGIN_GATE_KEY_PREFIX = 'login:gate';
const LOGIN_GATE_MAX_FAILURES = 10;
const LOGIN_GATE_WINDOW_SECONDS = 15 * 60;

// #418 (Council P0-13): MFA challenge hardening. Challenge tokens live 5
// minutes and are single-use (their jti is burned in Redis on success).
// MFA code attempts get their own stricter gate: 5 failures / 15 minutes
// per admin, after which challenge verification returns 429 until the
// window slides — the challenge token itself will have expired by then,
// forcing a fresh password login.
const MFA_CHALLENGE_TTL = '5m';
const MFA_GATE_KEY_PREFIX = 'mfa:gate';
const MFA_GATE_MAX_FAILURES = 5;
const MFA_GATE_WINDOW_SECONDS = 15 * 60;
const MFA_CHALLENGE_USED_PREFIX = 'mfa:challenge-used';
const MFA_PENDING_SECRET_PREFIX = 'mfa:pending-secret';
const MFA_PENDING_SECRET_TTL_SECONDS = 10 * 60;
// #660: bounded retries for the recovery-code claim — a claim lost to a
// concurrent burn re-reads and re-matches, so parallel submits of two
// DIFFERENT codes both land, while the SAME code is simply gone on the
// second read. Three attempts is far beyond any realistic contention
// (each attempt burns at most one of ten codes).
const MFA_RECOVERY_CLAIM_ATTEMPTS = 3;

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private db: DatabaseService,
        private jwtService: JwtService,
        private emailService: EmailService,
        private redisService: RedisService,
        // Optional so pre-#418 unit specs that construct AuthService with
        // four arguments keep compiling; Nest always provides it in prod.
        @Optional() private mfaService?: MfaService,
    ) { }

    private requireMfaService(): MfaService {
        if (!this.mfaService) {
            throw new HttpException('MFA_NOT_CONFIGURED', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return this.mfaService;
    }

    /**
     * Redis key for the pre-bcrypt login gate. The email is hashed so no PII
     * lands in Redis keys (which may appear in slow-logs or monitoring).
     */
    private loginGateKey(email: string): string {
        const normalized = email.trim().toLowerCase();
        const digest = createHash('sha256').update(normalized).digest('hex');
        return `${LOGIN_GATE_KEY_PREFIX}:${digest}`;
    }

    /**
     * Cheap check run BEFORE bcrypt.compare. Throws 429 when the failure
     * threshold is exceeded. Fails open (no-op) when Redis is unavailable.
     */
    private async checkLoginGate(email: string): Promise<void> {
        try {
            const redis = this.redisService.getClient();
            if (!redis) return;
            const raw = await redis.get(this.loginGateKey(email));
            const failures = raw ? Number.parseInt(raw, 10) : 0;
            if (Number.isFinite(failures) && failures >= LOGIN_GATE_MAX_FAILURES) {
                throw new HttpException(
                    'Too many failed login attempts. Please try again later.',
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.warn(`login gate check failed (fail-open): ${(err as Error).message}`);
        }
    }

    /** Increment the failure counter with a sliding-window TTL. Never logs the password. */
    private async recordLoginFailure(email: string): Promise<void> {
        try {
            const redis = this.redisService.getClient();
            if (!redis) return;
            const key = this.loginGateKey(email);
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, LOGIN_GATE_WINDOW_SECONDS);
            }
        } catch (err) {
            this.logger.warn(`login gate record failed (fail-open): ${(err as Error).message}`);
        }
    }

    /** Clear the failure counter after a successful (correct-password) login. */
    private async clearLoginFailures(email: string): Promise<void> {
        try {
            const redis = this.redisService.getClient();
            if (!redis) return;
            await redis.del(this.loginGateKey(email));
        } catch (err) {
            this.logger.warn(`login gate clear failed (fail-open): ${(err as Error).message}`);
        }
    }

    async validateUser(email: string, pass: string): Promise<any> {
        // #264: gate checked before any expensive work (DB lookup + bcrypt)
        await this.checkLoginGate(email);
        const user = await this.db.user.findUnique({ where: { email } });
        if (user && await bcrypt.compare(pass, user.password)) {
            // Correct password — reset the gate even if email is unverified
            await this.clearLoginFailures(email);
            if (!user.isEmailVerified) {
                // Explicit code so frontends can show a friendly message
                throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
            }
            const { password: _removed, ...result } = user;
            return result;
        }
        await this.recordLoginFailure(email);
        // #418: admin login attempts are audit-logged (the Security seat
        // verifies from the Audit tab). Best-effort: never break login.
        if (user?.role === UserRole.Admin) {
            await this.writeAdminAudit(user, 'ADMIN_LOGIN_FAILED', { stage: 'password' });
        }
        return null;
    }

    async login(user: any) {
        const accessSecret = process.env.JWT_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!accessSecret || !refreshSecret) {
            // Surface a clear configuration error instead of a generic 500
            throw new HttpException('JWT_NOT_CONFIGURED', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        const payload = { email: user.email, sub: user.id, role: user.role };
        const accessToken = this.jwtService.sign(payload, {
            secret: accessSecret,
            expiresIn: '15m',
        });
        const { token: refreshToken } = await this.issueRefreshToken(payload, refreshSecret);
        return {
            accessToken,
            refreshToken: refreshToken,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }

    // ==================================================================
    // #418 (Council P0-13): admin MFA + break-glass recovery path
    // ==================================================================

    /**
     * Login entry point used by POST /auth/login after validateUser.
     * Non-admin users get tokens immediately, exactly as before. ADMIN
     * users are routed through MFA:
     *  - MFA enrolled  → `{ mfaRequired, challengeToken }`, NO tokens yet.
     *  - Not enrolled but ADMIN_MFA_REQUIRED=true → enrolment challenge.
     *  - Not enrolled and MFA not required → tokens (legacy behaviour,
     *    enrolment stays voluntary until the flag is switched on).
     */
    async beginLogin(user: any) {
        if (user.role !== UserRole.Admin) {
            return this.login(user);
        }
        if (user.mfaEnabled && user.mfaTotpSecret) {
            return {
                mfaRequired: true,
                challengeToken: this.issueMfaChallenge(user, 'mfa-challenge'),
                user: { id: user.id, email: user.email, name: user.name, role: user.role },
            };
        }
        if (process.env.ADMIN_MFA_REQUIRED === 'true') {
            return {
                mfaEnrollmentRequired: true,
                challengeToken: this.issueMfaChallenge(user, 'mfa-enrollment'),
                user: { id: user.id, email: user.email, name: user.name, role: user.role },
            };
        }
        await this.writeAdminAudit(user, 'ADMIN_LOGIN_SUCCEEDED', { via: 'password' });
        return this.login(user);
    }

    private issueMfaChallenge(
        user: { id: string; email: string; role: string },
        purpose: 'mfa-challenge' | 'mfa-enrollment',
    ): string {
        const accessSecret = process.env.JWT_SECRET;
        if (!accessSecret) {
            throw new HttpException('JWT_NOT_CONFIGURED', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return this.jwtService.sign(
            { sub: user.id, email: user.email, role: user.role, purpose, jti: randomUUID() },
            { secret: accessSecret, expiresIn: MFA_CHALLENGE_TTL },
        );
    }

    /**
     * Verify a challenge token and load its admin. Any problem — bad
     * signature, expiry, wrong purpose, non-admin, unverified, already
     * burned — is the same generic 401 (no oracle about which check failed).
     */
    private async loadChallengeUser(
        challengeToken: string,
        expectedPurpose: 'mfa-challenge' | 'mfa-enrollment',
    ) {
        const accessSecret = process.env.JWT_SECRET;
        if (!accessSecret) {
            throw new HttpException('JWT_NOT_CONFIGURED', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        let payload: { sub?: string; purpose?: string; jti?: string };
        try {
            payload = this.jwtService.verify(challengeToken, { secret: accessSecret });
        } catch {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        if (!payload?.sub || payload.purpose !== expectedPurpose || !payload.jti) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        if (await this.isChallengeBurned(payload.jti)) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        const user = await this.db.user.findUnique({ where: { id: payload.sub } });
        if (!user || user.role !== UserRole.Admin || !user.isEmailVerified) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        return { user, jti: payload.jti };
    }

    // ---- MFA attempt gate + challenge single-use (Redis, fail-open) ----

    private mfaGateKey(userId: string): string {
        // Internal Redis key only — user ids are not secrets, so the id
        // is used verbatim (no digest needed).
        return `${MFA_GATE_KEY_PREFIX}:${userId}`;
    }

    private async checkMfaGate(userId: string): Promise<void> {
        try {
            const redis = this.redisService.getClient();
            if (!redis) return;
            const raw = await redis.get(this.mfaGateKey(userId));
            const failures = raw ? Number.parseInt(raw, 10) : 0;
            if (Number.isFinite(failures) && failures >= MFA_GATE_MAX_FAILURES) {
                throw new HttpException(
                    'Too many failed MFA attempts. Please sign in again and try later.',
                    HttpStatus.TOO_MANY_REQUESTS,
                );
            }
        } catch (err) {
            if (err instanceof HttpException) throw err;
            this.logger.warn(`mfa gate check failed (fail-open): ${(err as Error).message}`);
        }
    }

    private async recordMfaFailure(userId: string): Promise<void> {
        try {
            const redis = this.redisService.getClient();
            if (!redis) return;
            const key = this.mfaGateKey(userId);
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, MFA_GATE_WINDOW_SECONDS);
            }
        } catch (err) {
            this.logger.warn(`mfa gate record failed (fail-open): ${(err as Error).message}`);
        }
    }

    private async clearMfaFailures(userId: string): Promise<void> {
        try {
            const redis = this.redisService.getClient();
            if (!redis) return;
            await redis.del(this.mfaGateKey(userId));
        } catch (err) {
            this.logger.warn(`mfa gate clear failed (fail-open): ${(err as Error).message}`);
        }
    }

    private async isChallengeBurned(jti: string): Promise<boolean> {
        try {
            const redis = this.redisService.getClient();
            if (!redis) return false;
            return (await redis.get(`${MFA_CHALLENGE_USED_PREFIX}:${jti}`)) !== null;
        } catch {
            return false;
        }
    }

    private async burnChallenge(jti: string): Promise<void> {
        try {
            const redis = this.redisService.getClient();
            if (!redis) return;
            await redis.set(`${MFA_CHALLENGE_USED_PREFIX}:${jti}`, '1', 'EX', 5 * 60);
        } catch (err) {
            this.logger.warn(`mfa challenge burn failed: ${(err as Error).message}`);
        }
    }

    /**
     * #660: atomically claim a challenge (SET NX) so exactly one submit
     * can spend it. Returns false only when the key already existed —
     * the challenge was already claimed/burned. On Redis unavailability
     * this fails open (true), matching this section's outage posture:
     * the recovery code's atomic DB claim still guarantees single-use,
     * and a Redis outage must not lock the admin out of recovery.
     */
    private async claimChallenge(jti: string): Promise<boolean> {
        try {
            const redis = this.redisService.getClient();
            if (!redis) return true;
            const reply = await redis.set(
                `${MFA_CHALLENGE_USED_PREFIX}:${jti}`,
                '1',
                'EX',
                5 * 60,
                'NX',
            );
            return reply !== null;
        } catch (err) {
            this.logger.warn(`mfa challenge claim failed (fail-open): ${(err as Error).message}`);
            return true;
        }
    }

    // ---- Audit + alert helpers ----

    /**
     * Write an admin-security audit row directly (same AuditLog table the
     * admin Audit tab reads). Returns false instead of throwing so callers
     * choose: login-path audits are best-effort, break-glass REQUIRES the
     * audit and checks the result (fail closed).
     */
    private async writeAdminAudit(
        actor: { id?: string | null; email?: string | null },
        action: string,
        metadata?: Record<string, any>,
    ): Promise<boolean> {
        try {
            await this.db.auditLog.create({
                data: {
                    actorId: actor.id ?? undefined,
                    actorEmail: actor.email ?? undefined,
                    action,
                    targetType: 'ADMIN_SECURITY',
                    targetId: actor.id ?? undefined,
                    metadata: metadata ?? undefined,
                },
            });
            return true;
        } catch (err) {
            this.logger.error(`audit write failed for ${action}: ${(err as Error).message}`);
            return false;
        }
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Security alert email (recovery-code use, break-glass use). Sent to
     * the affected admin, every OTHER admin, and ADMIN_ALERT_EMAIL when
     * configured. Best-effort: an SMTP failure never blocks the auth flow,
     * but it is logged loudly.
     */
    private async sendAdminSecurityAlert(
        subject: string,
        lines: string[],
        excludeUserId?: string,
    ): Promise<void> {
        try {
            const recipients = new Set<string>();
            const alertEmail = process.env.ADMIN_ALERT_EMAIL?.trim();
            if (alertEmail) recipients.add(alertEmail);
            const admins = await this.db.user.findMany({
                where: { role: UserRole.Admin },
                select: { id: true, email: true },
            });
            for (const admin of admins) {
                if (admin.id !== excludeUserId) recipients.add(admin.email);
            }
            if (recipients.size === 0) return;
            const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
                <h2 style="color:#071B33;">${this.escapeHtml(subject)}</h2>
                ${lines.map((line) => `<p style="color:#334155;">${this.escapeHtml(line)}</p>`).join('')}
                <p style="color:#64748B;font-size:12px;">Ouiboo admin security alert — sent automatically. If this was not expected, treat the admin account as compromised and follow the break-glass runbook.</p>
            </div>`;
            for (const to of recipients) {
                try {
                    await this.emailService.sendMail(to, subject, html);
                } catch (err) {
                    this.logger.error(`security alert email failed for recipient: ${(err as Error).message}`);
                }
            }
        } catch (err) {
            this.logger.error(`security alert fan-out failed: ${(err as Error).message}`);
        }
    }

    // ---- MFA challenge completion ----

    /** POST /auth/mfa/verify — exchange a challenge + TOTP code for tokens. */
    async verifyMfa(challengeToken: string, code: string) {
        const mfa = this.requireMfaService();
        const { user, jti } = await this.loadChallengeUser(challengeToken, 'mfa-challenge');
        if (!user.mfaEnabled || !user.mfaTotpSecret) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        await this.checkMfaGate(user.id);
        const secret = mfa.decryptSecret(user.mfaTotpSecret);
        const matchedStep = mfa.verifyTotpStep(secret, code);
        if (matchedStep === null) {
            await this.recordMfaFailure(user.id);
            await this.writeAdminAudit(user, 'ADMIN_LOGIN_FAILED', { stage: 'mfa-totp' });
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        // #642: single-use TOTP. The ±1 window stays for clock drift,
        // but a code whose step is at or below the last accepted step
        // is a replay and fails with the same generic 401. The claim is
        // one conditional update, so two concurrent verifications of
        // the same code cannot both win.
        const claimed = await this.db.user.updateMany({
            where: {
                id: user.id,
                OR: [
                    { mfaTotpLastAcceptedStep: null },
                    { mfaTotpLastAcceptedStep: { lt: matchedStep } },
                ],
            },
            data: { mfaTotpLastAcceptedStep: matchedStep },
        });
        if (claimed.count === 0) {
            await this.recordMfaFailure(user.id);
            await this.writeAdminAudit(user, 'ADMIN_LOGIN_FAILED', { stage: 'mfa-totp-replay' });
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        await this.burnChallenge(jti);
        await this.clearMfaFailures(user.id);
        await this.writeAdminAudit(user, 'ADMIN_LOGIN_SUCCEEDED', { via: 'totp' });
        return this.login(user);
    }

    /** POST /auth/mfa/recovery — exchange a challenge + one-time recovery code for tokens. The code burns on use. */
    async verifyMfaRecovery(challengeToken: string, recoveryCode: string) {
        const mfa = this.requireMfaService();
        const { user, jti } = await this.loadChallengeUser(challengeToken, 'mfa-challenge');
        if (!user.mfaEnabled) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        await this.checkMfaGate(user.id);
        // #660: claim the challenge atomically BEFORE matching. The old
        // flow checked the burn flag inside loadChallengeUser and only
        // set it after success (check-then-set), so two concurrent
        // submits carrying the same challenge both passed the check.
        // SET NX is the atomic claim: exactly one submit proceeds past
        // this point, and the challenge is spent even if the code does
        // not match — re-login for a fresh challenge is the safe cost.
        if (!(await this.claimChallenge(jti))) {
            await this.writeAdminAudit(user, 'ADMIN_LOGIN_FAILED', { stage: 'mfa-recovery-challenge' });
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        // #660: claim the matched code atomically, the break-glass way.
        // The conditional updateMany is keyed on the exact hashes array
        // the match was computed against, so a concurrent burn of ANY
        // code on this account makes the claim fail instead of silently
        // overwriting the other write — the old unconditional update
        // could resurrect a spent code via lost update, or let one code
        // mint two sessions. A lost claim re-reads and re-matches: the
        // same code is then simply gone (generic 401 below), while a
        // different code can still claim, so parallel submits of two
        // distinct codes both burn exactly once.
        let remaining: string[] | null = null;
        for (let attempt = 0; attempt < MFA_RECOVERY_CLAIM_ATTEMPTS && remaining === null; attempt++) {
            const current = attempt === 0
                ? user
                : await this.db.user.findUnique({ where: { id: user.id } });
            if (!current) break;
            const hashes = Array.isArray(current.mfaRecoveryCodeHashes)
                ? (current.mfaRecoveryCodeHashes as string[])
                : [];
            const matchIndex = await mfa.findMatchingCodeIndex(recoveryCode, hashes);
            if (matchIndex < 0) {
                await this.recordMfaFailure(user.id);
                await this.writeAdminAudit(user, 'ADMIN_LOGIN_FAILED', { stage: 'mfa-recovery' });
                throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
            }
            const candidate = hashes.filter((_, i) => i !== matchIndex);
            const claimed = await this.db.user.updateMany({
                where: {
                    id: user.id,
                    mfaRecoveryCodeHashes: { equals: hashes },
                },
                data: { mfaRecoveryCodeHashes: candidate },
            });
            if (claimed.count === 1) {
                remaining = candidate;
            }
        }
        if (remaining === null) {
            // Every claim lost to concurrent writers — the code's fate
            // was decided by a racing submit. Same generic 401.
            await this.recordMfaFailure(user.id);
            await this.writeAdminAudit(user, 'ADMIN_LOGIN_FAILED', { stage: 'mfa-recovery' });
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        await this.clearMfaFailures(user.id);
        await this.writeAdminAudit(user, 'ADMIN_MFA_RECOVERY_USED', {
            recoveryCodesRemaining: remaining.length,
        });
        await this.writeAdminAudit(user, 'ADMIN_LOGIN_SUCCEEDED', { via: 'recovery-code' });
        await this.sendAdminSecurityAlert(
            'Ouiboo security alert: admin recovery code used',
            [
                `A one-time MFA recovery code was just used to sign in to the admin account ${user.email}.`,
                `${remaining.length} recovery code(s) remain. If this was not you, revoke all break-glass credentials and re-enrol MFA immediately.`,
            ],
        );
        return this.login(user);
    }

    // ---- MFA enrolment ----

    /**
     * POST /auth/mfa/enrollment/start. The pending secret is held encrypted
     * in Redis for 10 minutes and only replaces the live secret on a
     * successful confirm — abandoning enrolment never breaks an existing
     * factor. Fails closed when Redis is unavailable.
     */
    async startMfaEnrollment(actorId: string, viaChallenge: boolean, password?: string) {
        const mfa = this.requireMfaService();
        const user = await this.db.user.findUnique({ where: { id: actorId } });
        if (!user || user.role !== UserRole.Admin) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        if (!viaChallenge) {
            // Password re-entry: enrolment changes the account's second
            // factor, so a hijacked access token alone must not suffice.
            if (!password || !(await bcrypt.compare(password, user.password))) {
                throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
            }
        }
        const redis = this.redisService.getClient();
        if (!redis) {
            throw new HttpException(
                'MFA enrolment is unavailable (session store offline).',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
        const secret = mfa.generateTotpSecret();
        await redis.set(
            `${MFA_PENDING_SECRET_PREFIX}:${user.id}`,
            mfa.encryptSecret(secret),
            'EX',
            MFA_PENDING_SECRET_TTL_SECONDS,
        );
        return {
            otpauthUrl: mfa.buildOtpAuthUrl(user.email, secret),
            // Shown once for manual authenticator entry; the same secret is
            // never retrievable again after confirm.
            secret,
            expiresInSeconds: MFA_PENDING_SECRET_TTL_SECONDS,
        };
    }

    /**
     * POST /auth/mfa/enrollment/confirm. On success: MFA is enabled, 10
     * one-time recovery codes are generated and returned ONCE (only bcrypt
     * hashes are stored). When enrolment happened via the login challenge,
     * full login tokens are included so the sign-in completes.
     */
    async confirmMfaEnrollment(actorId: string, viaChallenge: boolean, code: string) {
        const mfa = this.requireMfaService();
        const user = await this.db.user.findUnique({ where: { id: actorId } });
        if (!user || user.role !== UserRole.Admin) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        const redis = this.redisService.getClient();
        if (!redis) {
            throw new HttpException(
                'MFA enrolment is unavailable (session store offline).',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }
        const pendingKey = `${MFA_PENDING_SECRET_PREFIX}:${user.id}`;
        const pendingEncrypted = await redis.get(pendingKey);
        if (!pendingEncrypted) {
            throw new BadRequestException('ENROLLMENT_NOT_STARTED_OR_EXPIRED');
        }
        await this.checkMfaGate(user.id);
        const pendingSecret = mfa.decryptSecret(pendingEncrypted);
        const matchedStep = mfa.verifyTotpStep(pendingSecret, code);
        if (matchedStep === null) {
            await this.recordMfaFailure(user.id);
            throw new BadRequestException('INVALID_MFA_CODE');
        }
        const recoveryCodes = mfa.generateRecoveryCodes();
        const recoveryCodeHashes = await mfa.hashCodes(recoveryCodes);
        const updated = await this.db.user.update({
            where: { id: user.id },
            data: {
                mfaEnabled: true,
                mfaTotpSecret: pendingEncrypted,
                mfaRecoveryCodeHashes: recoveryCodeHashes,
                mfaEnrolledAt: new Date(),
                // #642: the enrolment code is consumed too — it cannot
                // be replayed as the first sign-in code in its window.
                mfaTotpLastAcceptedStep: matchedStep,
            },
        });
        await redis.del(pendingKey);
        await this.clearMfaFailures(user.id);
        await this.writeAdminAudit(user, 'ADMIN_MFA_ENROLLED', {
            viaChallenge,
            recoveryCodesIssued: recoveryCodes.length,
        });
        const result: Record<string, any> = {
            mfaEnabled: true,
            mfaEnrolledAt: updated.mfaEnrolledAt,
            recoveryCodes,
        };
        if (viaChallenge) {
            await this.writeAdminAudit(user, 'ADMIN_LOGIN_SUCCEEDED', { via: 'totp-enrollment' });
            Object.assign(result, await this.login(updated));
        }
        return result;
    }

    /** GET /auth/mfa/status — what the Security tab renders. */
    async getMfaStatus(actorId: string) {
        const user = await this.db.user.findUnique({ where: { id: actorId } });
        if (!user || user.role !== UserRole.Admin) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        const hashes = Array.isArray(user.mfaRecoveryCodeHashes)
            ? (user.mfaRecoveryCodeHashes as string[])
            : [];
        return {
            mfaEnabled: user.mfaEnabled,
            mfaEnrolledAt: user.mfaEnrolledAt,
            recoveryCodesRemaining: hashes.length,
            adminMfaRequired: process.env.ADMIN_MFA_REQUIRED === 'true',
        };
    }

    // ---- Break-glass credentials (the SEPARATE recovery path) ----

    /**
     * POST /auth/break-glass/credentials — create a one-time break-glass
     * secret. Requires password re-entry. The plaintext is returned once
     * and stored ONLY as a bcrypt hash; the founder keeps it offline
     * (sealed envelope / password safe) per the runbook.
     */
    async createBreakGlassCredential(
        actorId: string,
        dto: { label: string; password: string; expiresInDays?: number },
    ) {
        const mfa = this.requireMfaService();
        const user = await this.db.user.findUnique({ where: { id: actorId } });
        if (!user || user.role !== UserRole.Admin) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        if (!(await bcrypt.compare(dto.password, user.password))) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        const ttlDays = Math.min(
            dto.expiresInDays ?? BREAK_GLASS_DEFAULT_TTL_DAYS,
            BREAK_GLASS_MAX_TTL_DAYS,
        );
        const secret = mfa.generateBreakGlassSecret();
        const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
        const credential = await this.db.breakGlassCredential.create({
            data: {
                label: dto.label.trim(),
                secretHash: await mfa.hashCode(secret),
                createdById: user.id,
                expiresAt,
            },
        });
        await this.writeAdminAudit(user, 'ADMIN_BREAK_GLASS_CREATED', {
            credentialId: credential.id,
            label: credential.label,
            expiresAt: expiresAt.toISOString(),
        });
        return {
            id: credential.id,
            label: credential.label,
            expiresAt,
            // Returned exactly once — it cannot be read back later.
            secret,
        };
    }

    /** GET /auth/break-glass/credentials — metadata only, never secrets. */
    async listBreakGlassCredentials(actorId: string) {
        const user = await this.db.user.findUnique({ where: { id: actorId } });
        if (!user || user.role !== UserRole.Admin) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        const rows = await this.db.breakGlassCredential.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const now = new Date();
        return rows.map((row) => ({
            id: row.id,
            label: row.label,
            createdById: row.createdById,
            createdAt: row.createdAt,
            expiresAt: row.expiresAt,
            usedAt: row.usedAt,
            usedByEmail: row.usedByEmail,
            revokedAt: row.revokedAt,
            status: row.revokedAt
                ? 'REVOKED'
                : row.usedAt
                    ? 'USED'
                    : row.expiresAt <= now
                        ? 'EXPIRED'
                        : 'ACTIVE',
        }));
    }

    /** DELETE /auth/break-glass/credentials/:id */
    async revokeBreakGlassCredential(actorId: string, credentialId: string) {
        const user = await this.db.user.findUnique({ where: { id: actorId } });
        if (!user || user.role !== UserRole.Admin) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        const credential = await this.db.breakGlassCredential.findUnique({
            where: { id: credentialId },
        });
        if (!credential || credential.revokedAt || credential.usedAt) {
            throw new BadRequestException('CREDENTIAL_NOT_REVOCABLE');
        }
        await this.db.breakGlassCredential.update({
            where: { id: credentialId },
            data: { revokedAt: new Date() },
        });
        await this.writeAdminAudit(user, 'ADMIN_BREAK_GLASS_REVOKED', {
            credentialId,
            label: credential.label,
        });
        return { id: credentialId, revoked: true };
    }

    /**
     * POST /auth/break-glass — the separate recovery path. Email +
     * password + a valid break-glass secret signs the admin in WITHOUT
     * the TOTP factor (the lost-device scenario). Safe failure behaviour:
     *  - every failure is the same generic 401 and feeds the login gate;
     *  - the credential is claimed atomically (updateMany on unused) so
     *    it can never be spent twice, even concurrently;
     *  - tokens are issued only AFTER the ADMIN_BREAK_GLASS_USED audit
     *    row is durably written — if the audit write fails, the sign-in
     *    fails closed (the credential stays burned; create a new one).
     */
    async useBreakGlass(email: string, password: string, code: string) {
        const mfa = this.requireMfaService();
        await this.checkLoginGate(email);
        const fail = async (user: any | null) => {
            await this.recordLoginFailure(email);
            await this.writeAdminAudit(
                user ?? { email },
                'ADMIN_BREAK_GLASS_FAILED',
                { email },
            );
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        };

        const user = await this.db.user.findUnique({ where: { email } });
        if (!user || user.role !== UserRole.Admin || !user.isEmailVerified) {
            return fail(null);
        }
        if (!(await bcrypt.compare(password, user.password))) {
            return fail(user);
        }

        const candidates = await this.db.breakGlassCredential.findMany({
            where: { usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        let matched: (typeof candidates)[number] | null = null;
        for (const candidate of candidates) {
            if ((await mfa.findMatchingCodeIndex(code, [candidate.secretHash])) === 0) {
                matched = candidate;
                break;
            }
        }
        if (!matched) {
            return fail(user);
        }

        const claimed = await this.db.breakGlassCredential.updateMany({
            where: { id: matched.id, usedAt: null, revokedAt: null },
            data: { usedAt: new Date(), usedByEmail: email },
        });
        if (claimed.count !== 1) {
            return fail(user);
        }

        const audited = await this.writeAdminAudit(user, 'ADMIN_BREAK_GLASS_USED', {
            credentialId: matched.id,
            label: matched.label,
        });
        if (!audited) {
            // Fail closed: no audit trail, no session. The credential is
            // already burned — that is the safe direction.
            throw new HttpException('BREAK_GLASS_AUDIT_FAILED', HttpStatus.INTERNAL_SERVER_ERROR);
        }
        await this.clearLoginFailures(email);
        await this.writeAdminAudit(user, 'ADMIN_LOGIN_SUCCEEDED', { via: 'break-glass' });
        await this.sendAdminSecurityAlert(
            'Ouiboo security alert: break-glass sign-in used',
            [
                `A break-glass credential ("${matched.label}") was just used to sign in to the admin account ${user.email} without the TOTP factor.`,
                'The credential has been burned and cannot be reused. If this was not an authorised recovery, treat the admin account as compromised: revoke remaining break-glass credentials and re-enrol MFA.',
            ],
        );
        const tokens = await this.login(user);
        return { ...tokens, usedBreakGlass: true };
    }

    async register(dto: RegisterDto) {
        // #321: refuse under-age accounts before any hashing or DB write.
        const dateOfBirth = new Date(dto.dateOfBirth);
        if (
            Number.isNaN(dateOfBirth.getTime()) ||
            ageInYears(dateOfBirth, new Date()) < MINIMUM_ACCOUNT_AGE
        ) {
            throw new HttpException('AGE_RESTRICTED', HttpStatus.BAD_REQUEST);
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);
        // Generate 6-digit OTP (100000 to 999999)
        const otp = this.generateOtp();
        const otpHash = await this.hashOtp(otp);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const otpLastSentAt = new Date();

        let user;
        try {
            user = await this.db.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        name: dto.name,
                        email: dto.email,
                        password: hashedPassword,
                        role: dto.role as any,
                        dateOfBirth,
                        ageAttestedAt: new Date(),
                        termsVersion: CURRENT_TERMS_VERSION,
                        otp: otpHash,
                        otpExpiresAt,
                        otpLastSentAt,
                    },
                });

                if (dto.role === 'AGENCY') {
                    // #368: agencies no longer get a wallet. Traveller payments
                    // are recorded as ExternalPayment facts when they happen;
                    // there is no OuiBoo-held balance to open at signup.
                    await tx.agencyProfile.create({
                        data: {
                            userId: newUser.id,
                            companyName: dto.name, // Use name as initial company name
                            ice: 'PENDING_' + newUser.id.substring(0, 7), // Temporary unique value
                            patente: 'PENDING',
                            rib: 'PENDING',
                            subscriptionStatus: 'TRIAL',
                            subscriptionTermsVersion: CURRENT_SUBSCRIPTION_TERMS_VERSION,
                            subscriptionTermsAcceptedAt: new Date(),
                            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
                        }
                    });
                }

                return newUser;
            });
        } catch (error: any) {
            // Handle unique constraint violations (e.g. email already in use)
            if (error?.code === 'P2002') {
                throw new HttpException('EMAIL_ALREADY_IN_USE', HttpStatus.BAD_REQUEST);
            }
            throw error;
        }

        // Await the OTP send: on serverless an un-awaited promise races the
        // instance freeze after the response returns, which made the first
        // verification email arrive minutes late (or not at all) while the
        // awaited resend worked instantly (#409). The helper swallows SMTP
        // errors, so signup still never fails because of email.
        await this.sendRegistrationOtp(dto.email, otp);

        return {
            email: user.email,
            requiresEmailVerification: true,
            message: 'Verification code sent',
        };
    }

    private async sendRegistrationOtp(email: string, otp: string) {
        try {
            const html = this.emailService.getOTPTemplate(otp);
            await this.emailService.sendMail(email, 'Verify your Ouiboo account', html);
        } catch (error) {
            console.error(`Failed to send OTP email during registration for ${email}:`, error);
        }
    }

    async verifyEmail(email: string, otp: string) {
        const user = await this.db.user.findUnique({ where: { email } });

        if (!user) {
            throw new UnauthorizedException('EMAIL_NOT_FOUND');
        }

        // Check if OTP exists
        if (!user.otp) {
            throw new UnauthorizedException('OTP_NOT_FOUND');
        }

        // Check if OTP is expired first
        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            throw new UnauthorizedException('OTP_EXPIRED');
        }

        const isOtpValid = await this.verifyOtp(otp.trim(), user.otp);
        if (!isOtpValid) {
            throw new UnauthorizedException('INVALID_OTP');
        }

        const verifiedUser = await this.db.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                otp: null, // Clear OTP after success
                otpExpiresAt: null,
            }
        });
        // Send welcome email now that they are verified
        try {
            const welcomeHtml = this.emailService.getWelcomeTemplate(user.name);
            await this.emailService.sendMail(user.email, 'Welcome to Ouiboo!', welcomeHtml);
        } catch (error) {
            // Log error but don't fail verification - email verification is already complete
            console.error(`Failed to send welcome email to ${user.email}:`, error);
        }

        const tokens = await this.login(verifiedUser);
        return {
            ...tokens,
            message: 'Email verified successfully',
        };
    }

    async resendOTP(email: string) {
        const user = await this.db.user.findUnique({ where: { email } });
        if (!user) throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);

        if (user.otpLastSentAt) {
            const cooldownMs = 60 * 1000;
            const nextAllowed = new Date(user.otpLastSentAt.getTime() + cooldownMs);
            if (nextAllowed > new Date()) {
                throw new HttpException('OTP_RESEND_COOLDOWN', HttpStatus.TOO_MANY_REQUESTS);
            }
        }

        // Generate 6-digit OTP (100000 to 999999)
        const otp = this.generateOtp();
        const otpHash = await this.hashOtp(otp);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.db.user.update({
            where: { id: user.id },
            data: { otp: otpHash, otpExpiresAt, otpLastSentAt: new Date() }
        });

        try {
            const html = this.emailService.getOTPTemplate(otp);
            await this.emailService.sendMail(user.email, 'Your new verification code', html);
        } catch (error) {
            // Log error and throw so frontend knows email failed
            console.error(`Failed to send OTP email for ${user.email}:`, error);
            throw new HttpException(
                'Failed to send verification email. Please check your email configuration or try again later.',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }

        return { message: 'OTP resent successfully' };
    }

    async requestPasswordReset(email: string) {
        const user = await this.db.user.findUnique({ where: { email } });
        if (!user) {
            return { message: 'If an account exists, a reset link has been sent.' };
        }

        if (user.passwordResetSentAt) {
            const cooldownMs = 60 * 1000;
            const nextAllowed = new Date(user.passwordResetSentAt.getTime() + cooldownMs);
            if (nextAllowed > new Date()) {
                return { message: 'If an account exists, a reset link has been sent.' };
            }
        }

        const token = randomUUID();
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

        await this.db.user.update({
            where: { id: user.id },
            data: {
                passwordResetTokenHash: this.hashToken(token),
                passwordResetExpiresAt: expiresAt,
                passwordResetSentAt: new Date(),
            },
        });

        const resetUrl = this.buildPasswordResetUrl(user.role, user.email, token);
        await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

        return { message: 'If an account exists, a reset link has been sent.' };
    }

    async resetPassword(email: string, token: string, newPassword: string) {
        const user = await this.db.user.findUnique({ where: { email } });
        if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }

        const isExpired = user.passwordResetExpiresAt < new Date();
        const expectedHash = Buffer.from(user.passwordResetTokenHash, 'hex');
        const actualHash = Buffer.from(this.hashToken(token), 'hex');
        const tokenMatches =
          expectedHash.length === actualHash.length &&
          timingSafeEqual(expectedHash, actualHash);
        if (isExpired || !tokenMatches) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await this.db.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    passwordResetTokenHash: null,
                    passwordResetExpiresAt: null,
                    passwordResetSentAt: null,
                },
            });
            await tx.refreshToken.updateMany({
                where: { userId: user.id, revokedAt: null },
                data: { revokedAt: new Date() },
            });
        });

        return { message: 'Password reset successfully' };
    }

    async refreshToken(token: string) {
        try {
            const refreshSecret = process.env.JWT_REFRESH_SECRET;
            const accessSecret = process.env.JWT_SECRET;
            if (!refreshSecret || !accessSecret) {
                throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
            }
            const payload = this.jwtService.verify(token, {
                secret: refreshSecret,
            });
            const tokenHash = this.hashToken(token);
            const rotation = await this.db.$transaction(async (tx) => {
                const tokenRecord = await tx.refreshToken.findFirst({
                    where: {
                        tokenHash,
                        userId: payload.sub,
                        revokedAt: null,
                        expiresAt: { gt: new Date() },
                    },
                });
                if (!tokenRecord) throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);

                const claimed = await tx.refreshToken.updateMany({
                    where: { id: tokenRecord.id, revokedAt: null },
                    data: { revokedAt: new Date() },
                });
                if (claimed.count !== 1) throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);

                const user = await tx.user.findUnique({ where: { id: payload.sub } });
                if (!user?.isEmailVerified) throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);

                const tokenId = randomUUID();
                const rotatedRefreshToken = this.jwtService.sign(
                    { email: user.email, sub: user.id, role: user.role, jti: tokenId },
                    { secret: refreshSecret, expiresIn: '7d' },
                );
                const newToken = await tx.refreshToken.create({
                    data: {
                        tokenHash: this.hashToken(rotatedRefreshToken),
                        userId: user.id,
                        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
                    },
                });
                await tx.refreshToken.update({
                    where: { id: tokenRecord.id },
                    data: { replacedByTokenId: newToken.id },
                });

                return { user, rotatedRefreshToken };
            });

            const { user, rotatedRefreshToken } = rotation;

            const accessToken = this.jwtService.sign(
                { email: user.email, sub: user.id, role: user.role },
                {
                    secret: accessSecret,
                    expiresIn: '15m',
                },
            );
            return {
                accessToken,
                refreshToken: rotatedRefreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            };
        } catch {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
    }

    /**
     * Validates a refresh token WITHOUT rotating it.
     * Used by BFF session checks (GET /auth/session).
     * Returns the user and token expiry, or throws Unauthorized.
     */
    async validateSession(token: string) {
        try {
            const refreshSecret = process.env.JWT_REFRESH_SECRET;
            if (!refreshSecret) {
                throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
            }
            const payload = this.jwtService.verify(token, {
                secret: refreshSecret,
            }) as { sub: string; exp?: number };
            const tokenHash = this.hashToken(token);
            const tokenRecord = await this.db.refreshToken.findFirst({
                where: {
                    tokenHash,
                    userId: payload.sub,
                    revokedAt: null,
                    expiresAt: { gt: new Date() },
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            role: true,
                            isEmailVerified: true,
                        },
                    },
                },
            });
            if (!tokenRecord?.user?.isEmailVerified) {
                throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
            }
            return {
                user: {
                    id: tokenRecord.user.id,
                    email: tokenRecord.user.email,
                    name: tokenRecord.user.name,
                    role: tokenRecord.user.role,
                },
                expiresAt: tokenRecord.expiresAt.toISOString(),
            };
        } catch {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
    }

    async logout(token?: string) {        if (!token) {
            return { message: 'Logged out' };
        }
        const tokenHash = this.hashToken(token);
        const existing = await this.db.refreshToken.findFirst({
            where: {
                tokenHash,
                revokedAt: null,
            },
        });

        if (!existing) {
            return { message: 'Logged out' };
        }

        await this.db.refreshToken.update({
            where: { id: existing.id },
            data: { revokedAt: new Date() },
        });

        return { message: 'Logged out' };
    }

    private hashToken(token: string) {
        return createHash('sha256').update(token).digest('hex');
    }

    private async hashOtp(otp: string) {
        return bcrypt.hash(otp, 10);
    }

    private async verifyOtp(candidate: string, storedOtp: string) {
        if (storedOtp.startsWith('$2')) {
            return bcrypt.compare(candidate, storedOtp);
        }

        // Deployment compatibility for OTPs issued before hashing was enabled.
        // Successful verification clears this value; resending replaces it with
        // a bcrypt hash, so plaintext OTPs naturally age out within their TTL.
        const candidateBuffer = Buffer.from(candidate);
        const storedBuffer = Buffer.from(storedOtp.trim());
        return candidateBuffer.length === storedBuffer.length
            && timingSafeEqual(candidateBuffer, storedBuffer);
    }

    private generateOtp() {
        return randomInt(100000, 1000000).toString();
    }

    private async issueRefreshToken(
        payload: { email: string; sub: string; role: string },
        refreshSecret: string,
    ) {
        const tokenId = randomUUID();
        const refreshToken = this.jwtService.sign(
            { ...payload, jti: tokenId },
            {
                secret: refreshSecret,
                expiresIn: '7d',
            },
        );
        const tokenRecord = await this.db.refreshToken.create({
            data: {
                tokenHash: this.hashToken(refreshToken),
                userId: payload.sub,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            },
        });

        return { token: refreshToken, id: tokenRecord.id };
    }

    private buildPasswordResetUrl(role: string, email: string, token: string) {
        const fallbackUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        const travelerUrl = process.env.TRAVELER_APP_URL || fallbackUrl;
        const agencyUrl = process.env.AGENCY_APP_URL || fallbackUrl;
        const adminUrl = process.env.ADMIN_APP_URL || fallbackUrl;

        let baseUrl = travelerUrl;
        if (role === UserRole.Agency) {
            baseUrl = agencyUrl;
        } else if (role === UserRole.Admin) {
            baseUrl = adminUrl;
        }

        const normalizedBase = baseUrl.replace(/\/$/, '');
        return `${normalizedBase}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    }
}
