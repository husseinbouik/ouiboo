import { Controller, Post, Body, UnauthorizedException, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, VerifyEmailDto, ResendOtpDto } from './dto/auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    @ApiOperation({ summary: 'Login and get JWT token' })
    async login(@Body() loginDto: LoginDto) {
        const user = await this.authService.validateUser(loginDto.email, loginDto.password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return this.authService.login(user);
    }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user' })
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    async refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshToken(dto.refresh_token);
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
}
