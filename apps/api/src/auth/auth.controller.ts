import { Controller, Post, Get, Delete, Param, Body, UnauthorizedException, Request, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
    LoginDto, RegisterDto, RefreshTokenDto, VerifyEmailDto, ResendOtpDto, ForgotPasswordDto, ResetPasswordDto,
    MfaVerifyDto, MfaRecoveryDto, MfaEnrollmentStartDto, MfaEnrollmentConfirmDto,
    BreakGlassLoginDto, CreateBreakGlassCredentialDto,
} from './dto/auth.dto';
import { Request as ExpressRequest, Response } from 'express';
import { RateLimit, RateLimitGuard, RateLimitSensitive } from '../common/rate-limit.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { MfaEnrollmentGuard } from './guards/mfa-enrollment.guard';
import { UserRole } from '@ouiboo/types';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const UNAUTHORIZED_MESSAGE = 'Unauthorized';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @RateLimit({ points: 8, windowMs: 60_000, keyPrefix: 'auth:login' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Login and get JWT token' })
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        // #418: admins with MFA get a challenge payload instead of tokens;
        // only a completed MFA step (or break-glass) issues tokens.
        const result: any = await this.authService.beginLogin(user);
        if (result?.accessToken && result?.refreshToken) {
            this.setRefreshCookie(res, result.refreshToken);
            return this.publicTokenResponse(result);
        }
        return result;
    }

    @Post('mfa/verify')
    @RateLimit({ points: 10, windowMs: 60_000, keyPrefix: 'auth:mfa-verify' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Complete an admin MFA challenge with a TOTP code (#418)' })
    async verifyMfa(@Body() dto: MfaVerifyDto, @Res({ passthrough: true }) res: Response) {
        const tokens = await this.authService.verifyMfa(dto.challengeToken, dto.code);
        this.setRefreshCookie(res, tokens.refreshToken);
        return this.publicTokenResponse(tokens);
    }

    @Post('mfa/recovery')
    @RateLimit({ points: 10, windowMs: 60_000, keyPrefix: 'auth:mfa-recovery' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Complete an admin MFA challenge with a one-time recovery code (#418)' })
    async verifyMfaRecovery(@Body() dto: MfaRecoveryDto, @Res({ passthrough: true }) res: Response) {
        const tokens = await this.authService.verifyMfaRecovery(dto.challengeToken, dto.recoveryCode);
        this.setRefreshCookie(res, tokens.refreshToken);
        return this.publicTokenResponse(tokens);
    }

    @Post('break-glass')
    @RateLimit({ points: 5, windowMs: 60_000, keyPrefix: 'auth:break-glass' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Break-glass admin sign-in: password + one-time break-glass secret, bypasses a lost TOTP factor (#418)' })
    async breakGlass(@Body() dto: BreakGlassLoginDto, @Res({ passthrough: true }) res: Response) {
        const tokens = await this.authService.useBreakGlass(dto.email, dto.password, dto.code);
        this.setRefreshCookie(res, tokens.refreshToken);
        return this.publicTokenResponse(tokens);
    }

    @Post('mfa/enrollment/start')
    @UseGuards(MfaEnrollmentGuard)
    @RateLimit({ points: 5, windowMs: 60_000, keyPrefix: 'auth:mfa-enroll-start' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Start admin TOTP enrolment (access token + password re-entry, or enrolment challenge token) (#418)' })
    async startMfaEnrollment(@Body() dto: MfaEnrollmentStartDto, @Request() req: ExpressRequest) {
        const viaChallenge = (req as any).mfaEnrollmentViaChallenge === true;
        return this.authService.startMfaEnrollment((req as any).user.id, viaChallenge, dto.password);
    }

    @Post('mfa/enrollment/confirm')
    @UseGuards(MfaEnrollmentGuard)
    @RateLimit({ points: 10, windowMs: 60_000, keyPrefix: 'auth:mfa-enroll-confirm' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Confirm admin TOTP enrolment; returns one-time recovery codes, plus login tokens when enrolling from the login challenge (#418)' })
    async confirmMfaEnrollment(
        @Body() dto: MfaEnrollmentConfirmDto,
        @Request() req: ExpressRequest,
        @Res({ passthrough: true }) res: Response,
    ) {
        const viaChallenge = (req as any).mfaEnrollmentViaChallenge === true;
        const result: any = await this.authService.confirmMfaEnrollment((req as any).user.id, viaChallenge, dto.code);
        if (result?.refreshToken) {
            this.setRefreshCookie(res, result.refreshToken);
            return this.publicTokenResponse(result);
        }
        return result;
    }

    @Get('mfa/status')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Admin MFA status for the Security tab (#418)' })
    async mfaStatus(@Request() req: ExpressRequest) {
        return this.authService.getMfaStatus((req as any).user.id);
    }

    @Post('break-glass/credentials')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @RateLimit({ points: 5, windowMs: 60_000, keyPrefix: 'auth:break-glass-create' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Create a one-time break-glass credential (secret returned once) (#418)' })
    async createBreakGlassCredential(@Body() dto: CreateBreakGlassCredentialDto, @Request() req: ExpressRequest) {
        return this.authService.createBreakGlassCredential((req as any).user.id, dto);
    }

    @Get('break-glass/credentials')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'List break-glass credentials (metadata only) (#418)' })
    async listBreakGlassCredentials(@Request() req: ExpressRequest) {
        return this.authService.listBreakGlassCredentials((req as any).user.id);
    }

    @Delete('break-glass/credentials/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.Admin)
    @ApiOperation({ summary: 'Revoke a break-glass credential (#418)' })
    async revokeBreakGlassCredential(@Param('id') id: string, @Request() req: ExpressRequest) {
        return this.authService.revokeBreakGlassCredential((req as any).user.id, id);
    }

    @Post('register')
    @RateLimit({ points: 5, windowMs: 60_000, keyPrefix: 'auth:register' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Register a new user' })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('refresh')
    @UseGuards(CsrfGuard)
    @RateLimit({ points: 30, windowMs: 60_000, keyPrefix: 'auth:refresh' })
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    async refresh(
        @Body() dto: RefreshTokenDto,
        @Request() req: ExpressRequest,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = this.getRefreshToken(req, dto);
        if (!refreshToken) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        const tokens = await this.authService.refreshToken(refreshToken);
        this.setRefreshCookie(res, tokens.refreshToken);
        return this.publicTokenResponse(tokens);
    }

    @Post('logout')
    @UseGuards(CsrfGuard)
    @ApiOperation({ summary: 'Logout and revoke refresh token' })    async logout(
        @Body() dto: RefreshTokenDto,
        @Request() req: ExpressRequest,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = this.getRefreshToken(req, dto);
        const result = await this.authService.logout(refreshToken);
        const isProduction = process.env.NODE_ENV === 'production';
        res.clearCookie(REFRESH_COOKIE_NAME, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            path: '/api/v1/auth',
        });
        return result;
    }

    @Get('session')
    @RateLimit({ points: 60, windowMs: 60_000, keyPrefix: 'auth:session' })
    @ApiOperation({ summary: 'Validate refresh token and return session info (BFF)' })
    async session(@Request() req: ExpressRequest) {
        const refreshToken = this.getRefreshToken(req);
        if (!refreshToken) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        return this.authService.validateSession(refreshToken);
    }

    @Post('verify-email')
    @RateLimit({ points: 10, windowMs: 60_000, keyPrefix: 'auth:verify-email' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Verify email with OTP' })
    async verifyEmail(@Body() dto: VerifyEmailDto, @Res({ passthrough: true }) res: Response) {
        const tokens = await this.authService.verifyEmail(dto.email, dto.otp);
        this.setRefreshCookie(res, tokens.refreshToken);
        return this.publicTokenResponse(tokens);
    }

    @Post('resend-otp')
    @RateLimit({ points: 3, windowMs: 60_000, keyPrefix: 'auth:resend-otp' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Resend verification OTP' })
    async resendOtp(@Body() dto: ResendOtpDto) {
        return this.authService.resendOTP(dto.email);
    }

    @Post('forgot-password')
    @RateLimit({ points: 3, windowMs: 60_000, keyPrefix: 'auth:forgot-password' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Request password reset email' })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.requestPasswordReset(dto.email);
    }

    @Post('reset-password')
    @RateLimit({ points: 5, windowMs: 60_000, keyPrefix: 'auth:reset-password' })
    @RateLimitSensitive()
    @ApiOperation({ summary: 'Reset password using token' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.email, dto.token, dto.newPassword);
    }

    private setRefreshCookie(res: Response, token: string) {
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie(REFRESH_COOKIE_NAME, token, {
            httpOnly: true,
            secure: isProduction,
            // Cross-site (traveler/agency/admin on separate Vercel domains) requires SameSite=None in production.
            // In development, use Lax since Secure cookies don't work on http://localhost.
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: REFRESH_COOKIE_MAX_AGE_MS,
            path: '/api/v1/auth',
        });
    }

    private publicTokenResponse<T extends { refreshToken: string }>(tokens: T) {
        const { refreshToken: _removed, ...response } = tokens;
        return response as Omit<T, 'refreshToken'>;
    }

    private getRefreshToken(req: ExpressRequest, dto?: RefreshTokenDto) {
        const tokenFromBody = dto?.refresh_token;
        const cookieHeader = req.headers.cookie;
        if (!cookieHeader) {
            return tokenFromBody;
        }
        const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, part) => {
            const [rawKey, ...rest] = part.trim().split('=');
            if (!rawKey) {
                return acc;
            }
            acc[rawKey] = decodeURIComponent(rest.join('='));
            return acc;
        }, {});

        return cookies[REFRESH_COOKIE_NAME] ?? tokenFromBody;
    }
}

