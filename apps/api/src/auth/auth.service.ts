import { Injectable, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { createHash, randomUUID } from 'crypto';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
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
                // We can either throw an error or handle it in the frontend
                // Throwing an error for now
                throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
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
            throw new Error('JWT secrets are not configured');
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
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit OTP
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const otpLastSentAt = new Date();

        const user = await this.db.$transaction(async (tx) => {
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

        // Send OTP email
        const html = this.emailService.getOTPTemplate(otp);
        await this.emailService.sendMail(dto.email, 'Verify your Ouiboo account', html);

        return this.login(user); // Still return tokens so they can stay logged in during verification
    }

    async verifyEmail(email: string, otp: string) {
        const user = await this.db.user.findUnique({ where: { email } });

        if (!user) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }

        if (user.otp !== otp) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }

        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
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
        const welcomeHtml = this.emailService.getWelcomeTemplate(user.name);
        await this.emailService.sendMail(user.email, 'Welcome to Ouiboo!', welcomeHtml);

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

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await this.db.user.update({
            where: { id: user.id },
            data: { otp, otpExpiresAt, otpLastSentAt: new Date() }
        });

        const html = this.emailService.getOTPTemplate(otp);
        await this.emailService.sendMail(user.email, 'Your new verification code', html);

        return { message: 'OTP resent successfully' };
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
        console.log('DB keys:', Object.keys(this.db).filter(k => !k.startsWith('$')));
        const tokenRecord = await this.db.refreshToken.create({
            data: {
                tokenHash: this.hashToken(refreshToken),
                userId: payload.sub,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            },
        });

        return { token: refreshToken, id: tokenRecord.id };
    }
}
