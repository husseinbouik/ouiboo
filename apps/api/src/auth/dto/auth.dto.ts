import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches, IsIn, IsOptional } from 'class-validator';
import { UserRole } from '@ouiboo/types';

export class LoginDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'strong-password' })
    @IsString()
    @MinLength(1)
    @MaxLength(72)
    password: string;
}

export class RegisterDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password: string;

    @ApiProperty({ example: 'Atlas Voyages' })
    @IsString()
    @MinLength(2)
    name: string;

    @ApiProperty({ enum: [UserRole.Agency, UserRole.Traveler], example: UserRole.Agency })
    @IsIn([UserRole.Agency, UserRole.Traveler])
    role: UserRole.Agency | UserRole.Traveler;
}

export class RefreshTokenDto {
    @ApiProperty({ example: 'your-refresh-token-here' })
    @IsOptional()
    @IsString()
    refresh_token?: string;
}

export class VerifyEmailDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '123456' })
    @IsString()
    @MinLength(6)
    @MaxLength(6)
    @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
    otp: string;
}

export class ResendOtpDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email: string;
}

export class ForgotPasswordDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email: string;
}

export class ResetPasswordDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'reset-token' })
    @IsString()
    @MinLength(10)
    token: string;

    @ApiProperty({ example: 'newPassword123' })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    newPassword: string;
}
