import { Controller, Post, Body, UnauthorizedException, Request, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, VerifyEmailDto, ResendOtpDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { Request as ExpressRequest, Response } from 'express';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';

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
    @ApiOperation({ summary: 'Login and get JWT token' })
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
        }
        const tokens = await this.authService.login(user);
        this.setRefreshCookie(res, tokens.refreshToken);
        return tokens;
    }

    @Post('register')
    @RateLimit({ points: 5, windowMs: 60_000, keyPrefix: 'auth:register' })
    @ApiOperation({ summary: 'Register a new user' })
    async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
        const tokens = await this.authService.register(registerDto);
        if (tokens?.refreshToken) {
            this.setRefreshCookie(res, tokens.refreshToken);
        }
        return tokens;
    }

    @Post('refresh')
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
        return tokens;
    }

    @Post('logout')
    @ApiOperation({ summary: 'Logout and revoke refresh token' })
    async logout(
        @Body() dto: RefreshTokenDto,
        @Request() req: ExpressRequest,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = this.getRefreshToken(req, dto);
        const result = await this.authService.logout(refreshToken);
        res.clearCookie(REFRESH_COOKIE_NAME, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/v1/auth',
        });
        return result;
    }

    @Post('verify-email')
    @RateLimit({ points: 10, windowMs: 60_000, keyPrefix: 'auth:verify-email' })
    @ApiOperation({ summary: 'Verify email with OTP' })
    async verifyEmail(@Body() dto: VerifyEmailDto) {
        return this.authService.verifyEmail(dto.email, dto.otp);
    }

    @Post('resend-otp')
    @RateLimit({ points: 3, windowMs: 60_000, keyPrefix: 'auth:resend-otp' })
    @ApiOperation({ summary: 'Resend verification OTP' })
    async resendOtp(@Body() dto: ResendOtpDto) {
        return this.authService.resendOTP(dto.email);
    }

    @Post('forgot-password')
    @RateLimit({ points: 3, windowMs: 60_000, keyPrefix: 'auth:forgot-password' })
    @ApiOperation({ summary: 'Request password reset email' })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.requestPasswordReset(dto.email);
    }

    @Post('reset-password')
    @RateLimit({ points: 5, windowMs: 60_000, keyPrefix: 'auth:reset-password' })
    @ApiOperation({ summary: 'Reset password using token' })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.email, dto.token, dto.newPassword);
    }

    private setRefreshCookie(res: Response, token: string) {
        res.cookie(REFRESH_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: REFRESH_COOKIE_MAX_AGE_MS,
            path: '/api/v1/auth',
        });
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
