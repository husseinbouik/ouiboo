import { Injectable, UnauthorizedException, TooManyRequestsException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';

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
            throw new Error('JWT secrets are not configured');
        }
        let agencyId: string | undefined;
        if (user.role === 'AGENCY') {
            const agencyProfile = await this.db.agencyProfile.findUnique({
                where: { userId: user.id },
            });
            if (!agencyProfile) {
                throw new UnauthorizedException('Agency profile not found');
            }
            agencyId = agencyProfile.id;
        }

        const payload = { email: user.email, sub: user.id, role: user.role, agencyId };
        return {
            accessToken: this.jwtService.sign(payload, {
                secret: accessSecret,
                expiresIn: '15m',
            }),
            refreshToken: this.jwtService.sign(payload, {
                secret: refreshSecret,
                expiresIn: '7d',
            }),
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
            throw new UnauthorizedException('User not found');
        }

        if (user.otp !== otp) {
            throw new UnauthorizedException('Invalid OTP');
        }

        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            throw new UnauthorizedException('OTP_EXPIRED');
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
        if (!user) throw new UnauthorizedException('User not found');

        if (user.otpLastSentAt) {
            const cooldownMs = 60 * 1000;
            const nextAllowed = new Date(user.otpLastSentAt.getTime() + cooldownMs);
            if (nextAllowed > new Date()) {
                throw new TooManyRequestsException('OTP_RESEND_COOLDOWN');
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
                throw new UnauthorizedException('JWT refresh secret not configured');
            }
            const payload = this.jwtService.verify(token, {
                secret: refreshSecret,
            });
            const user = await this.db.user.findUnique({ where: { id: payload.sub } });
            if (!user) throw new UnauthorizedException();

            return this.login(user);
        } catch (e) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
}
