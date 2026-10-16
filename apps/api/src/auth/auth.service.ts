import { Injectable, UnauthorizedException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { UserRole } from '@ouiboo/types';
import { RedisService } from '../common/redis.service';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
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

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private db: DatabaseService,
        private jwtService: JwtService,
        private emailService: EmailService,
        private redisService: RedisService,
    ) { }

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
            const failures = raw ? parseInt(raw, 10) : 0;
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

    async register(dto: RegisterDto) {
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
                        otp: otpHash,
                        otpExpiresAt,
                        otpLastSentAt,
                    },
                });

                if (dto.role === 'AGENCY') {
                    const profile = await tx.agencyProfile.create({
                        data: {
                            userId: newUser.id,
                            companyName: dto.name, // Use name as initial company name
                            ice: 'PENDING_' + newUser.id.substring(0, 7), // Temporary unique value
                            patente: 'PENDING',
                            rib: 'PENDING',
                            subscriptionStatus: 'TRIAL',
                            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
                        }
                    });

                    await tx.wallet.create({
                        data: {
                            agencyId: profile.id,
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

        // Do not block signup on SMTP. If sending fails, users can request a resend.
        void this.sendRegistrationOtp(dto.email, otp);

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
