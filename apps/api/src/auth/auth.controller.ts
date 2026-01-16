import { Controller, Post, Body, UnauthorizedException, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, VerifyEmailDto, ResendOtpDto } from './dto/auth.dto';
import { Request as ExpressRequest, Response } from 'express';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const UNAUTHORIZED_MESSAGE = 'Unauthorized';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
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
    @ApiOperation({ summary: 'Register a new user' })
    async register(@Body() registerDto: RegisterDto, @Res({ passthrough: true }) res: Response) {
        const tokens = await this.authService.register(registerDto);
        if (tokens?.refreshToken) {
            this.setRefreshCookie(res, tokens.refreshToken);
        }
        return tokens;
    }

    @Post('refresh')
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
            path: '/api/auth',
        });
        return result;
    }

    @Post('verify-email')
    @ApiOperation({ summary: 'Verify email with OTP' })
    async verifyEmail(@Body() dto: VerifyEmailDto) {
        return this.authService.verifyEmail(dto.email, dto.otp);
    }

    @Post('resend-otp')
    @ApiOperation({ summary: 'Resend verification OTP' })
    async resendOtp(@Body() dto: ResendOtpDto) {
        return this.authService.resendOTP(dto.email);
    }

    private setRefreshCookie(res: Response, token: string) {
        res.cookie(REFRESH_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: REFRESH_COOKIE_MAX_AGE_MS,
            path: '/api/auth',
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
