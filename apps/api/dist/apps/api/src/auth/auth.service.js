"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const database_service_1 = require("../database/database.service");
const bcrypt = require("bcrypt");
const email_service_1 = require("../email/email.service");
const crypto_1 = require("crypto");
const types_1 = require("@ouiboo/types");
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const UNAUTHORIZED_MESSAGE = 'Unauthorized';
let AuthService = class AuthService {
    constructor(db, jwtService, emailService) {
        this.db = db;
        this.jwtService = jwtService;
        this.emailService = emailService;
    }
    async validateUser(email, pass) {
        const user = await this.db.user.findUnique({ where: { email } });
        if (user && await bcrypt.compare(pass, user.password)) {
            if (!user.isEmailVerified) {
                throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
            }
            const { password, ...result } = user;
            return result;
        }
        return null;
    }
    async login(user) {
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
    async register(dto) {
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const otpLastSentAt = new Date();
        const user = await this.db.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    password: hashedPassword,
                    role: dto.role,
                    otp,
                    otpExpiresAt,
                    otpLastSentAt,
                },
            });
            if (dto.role === 'AGENCY') {
                const profile = await tx.agencyProfile.create({
                    data: {
                        userId: newUser.id,
                        companyName: dto.name,
                        ice: 'PENDING_' + newUser.id.substring(0, 7),
                        patente: 'PENDING',
                        rib: 'PENDING',
                        subscriptionStatus: 'TRIAL',
                        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
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
        const html = this.emailService.getOTPTemplate(otp);
        await this.emailService.sendMail(dto.email, 'Verify your Ouiboo account', html);
        return this.login(user);
    }
    async verifyEmail(email, otp) {
        const user = await this.db.user.findUnique({ where: { email } });
        if (!user) {
            throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        if (user.otp !== otp) {
            throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
            throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        await this.db.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                otp: null,
                otpExpiresAt: null,
            }
        });
        const welcomeHtml = this.emailService.getWelcomeTemplate(user.name);
        await this.emailService.sendMail(user.email, 'Welcome to Ouiboo!', welcomeHtml);
        return { message: 'Email verified successfully' };
    }
    async resendOTP(email) {
        const user = await this.db.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
        if (user.otpLastSentAt) {
            const cooldownMs = 60 * 1000;
            const nextAllowed = new Date(user.otpLastSentAt.getTime() + cooldownMs);
            if (nextAllowed > new Date()) {
                throw new common_1.HttpException('OTP_RESEND_COOLDOWN', common_1.HttpStatus.TOO_MANY_REQUESTS);
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
    async requestPasswordReset(email) {
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
        const token = (0, crypto_1.randomUUID)();
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
    async resetPassword(email, token, newPassword) {
        const user = await this.db.user.findUnique({ where: { email } });
        if (!user || !user.passwordResetTokenHash || !user.passwordResetExpiresAt) {
            throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        const isExpired = user.passwordResetExpiresAt < new Date();
        const tokenMatches = user.passwordResetTokenHash === this.hashToken(token);
        if (isExpired || !tokenMatches) {
            throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
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
    async refreshToken(token) {
        try {
            const refreshSecret = process.env.JWT_REFRESH_SECRET;
            if (!refreshSecret) {
                throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
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
                throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
            }
            const user = await this.db.user.findUnique({ where: { id: payload.sub } });
            if (!user)
                throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
            const accessSecret = process.env.JWT_SECRET;
            if (!accessSecret) {
                throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
            }
            const { token: rotatedRefreshToken, id: newTokenId } = await this.issueRefreshToken({ email: user.email, sub: user.id, role: user.role }, refreshSecret);
            await this.db.refreshToken.update({
                where: { id: tokenRecord.id },
                data: { revokedAt: new Date(), replacedByTokenId: newTokenId },
            });
            const accessToken = this.jwtService.sign({ email: user.email, sub: user.id, role: user.role }, {
                secret: accessSecret,
                expiresIn: '15m',
            });
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
        }
        catch (e) {
            throw new common_1.UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
    }
    async logout(token) {
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
    hashToken(token) {
        return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
    }
    async issueRefreshToken(payload, refreshSecret) {
        const tokenId = (0, crypto_1.randomUUID)();
        const refreshToken = this.jwtService.sign({ ...payload, jti: tokenId }, {
            secret: refreshSecret,
            expiresIn: '7d',
        });
        const tokenRecord = await this.db.refreshToken.create({
            data: {
                tokenHash: this.hashToken(refreshToken),
                userId: payload.sub,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
            },
        });
        return { token: refreshToken, id: tokenRecord.id };
    }
    buildPasswordResetUrl(role, email, token) {
        const fallbackUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
        const travelerUrl = process.env.TRAVELER_APP_URL || fallbackUrl;
        const agencyUrl = process.env.AGENCY_APP_URL || fallbackUrl;
        const adminUrl = process.env.ADMIN_APP_URL || fallbackUrl;
        let baseUrl = travelerUrl;
        if (role === types_1.UserRole.Agency) {
            baseUrl = agencyUrl;
        }
        else if (role === types_1.UserRole.Admin) {
            baseUrl = adminUrl;
        }
        const normalizedBase = baseUrl.replace(/\/$/, '');
        return `${normalizedBase}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService,
        jwt_1.JwtService,
        email_service_1.EmailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map