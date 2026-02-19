import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { createHash, randomUUID } from 'crypto';
import { UserRole } from '@ouiboo/types';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const UNAUTHORIZED_MESSAGE = 'Unauthorized';

@Injectable()
export class AuthService {
    constructor(
        private db: DatabaseService,
        private jwtService: JwtService,
        private emailService: EmailService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.db.user.findUnique({ where: { email } });
        if (user && await bcrypt.compare(pass, user.password)) {
            if (!user.isEmailVerified) {
                // Explicit code so frontends can show a friendly message
                throw new UnauthorizedException('EMAIL_NOT_VERIFIED');
            }
            const { password, ...result } = user;
            return result;
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

    async register(dto: RegisterDto) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        // Generate 6-digit OTP (100000 to 999999)
        const otp = Math.floor(100000 + Math.random() * 900000).toString().padStart(6, '0');
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
                        otp, // Store OTP
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

        // Send OTP email
        try {
            const html = this.emailService.getOTPTemplate(otp);
            await this.emailService.sendMail(dto.email, 'Verify your Ouiboo account', html);
        } catch (error) {
            // Log the error but don't fail registration - user can request OTP resend
            console.error(`Failed to send OTP email during registration for ${dto.email}:`, error);
            // Still allow registration to complete - user can resend OTP
        }

        return this.login(user); // Still return tokens so they can stay logged in during verification
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

        // Normalize and compare OTPs (trim whitespace and ensure string comparison)
        const normalizedOtp = otp.trim();
        const normalizedStoredOtp = user.otp.trim();

        if (normalizedStoredOtp !== normalizedOtp) {
            throw new UnauthorizedException('INVALID_OTP');
        }

        await this.db.user.update({
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

        return { message: 'Email verified successfully' };
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
        const otp = Math.floor(100000 + Math.random() * 900000).toString().padStart(6, '0');
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.db.user.update({
            where: { id: user.id },
            data: { otp, otpExpiresAt, otpLastSentAt: new Date() }
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
        const tokenMatches = user.passwordResetTokenHash === this.hashToken(token);
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
            if (!refreshSecret) {
                throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
            }
            const payload = this.jwtService.verify(token, {
                secret: refreshSecret,
            });
            const tokenRecord = await this.db.refreshToken.findFirst({
                where: {
                    tokenHash: this.hashToken(token),
                    userId: payload.sub,
                    revokedAt: null,
                    expiresAt: { gt: new Date() },
                },
            });
            if (!tokenRecord) {
                throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
            }

            const user = await this.db.user.findUnique({ where: { id: payload.sub } });
            if (!user) throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);

            const accessSecret = process.env.JWT_SECRET;
            if (!accessSecret) {
                throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
            }
            const { token: rotatedRefreshToken, id: newTokenId } = await this.issueRefreshToken(
                { email: user.email, sub: user.id, role: user.role },
                refreshSecret,
            );
            await this.db.refreshToken.update({
                where: { id: tokenRecord.id },
                data: { revokedAt: new Date(), replacedByTokenId: newTokenId },
            });

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
        } catch (e) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
    }

    async logout(token?: string) {
        if (!token) {
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
