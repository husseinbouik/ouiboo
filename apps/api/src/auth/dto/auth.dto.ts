import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsString, MinLength, MaxLength, Matches, IsIn, IsOptional, IsInt, Min, Max } from 'class-validator';
import { UserRole } from '@ouiboo/types';

export class LoginDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'strong-password' })
    @IsString()
    @MinLength(1)
    @MaxLength(72)
    password!: string;
}

export class RegisterDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    password!: string;

    @ApiProperty({ example: 'Atlas Voyages' })
    @IsString()
    @MinLength(2)
    name!: string;

    @ApiProperty({ enum: [UserRole.Agency, UserRole.Traveler], example: UserRole.Agency })
    @IsIn([UserRole.Agency, UserRole.Traveler])
    role!: UserRole.Agency | UserRole.Traveler;

    // #321: age gate. Required for every new account; the service enforces
    // the 18+ rule server-side and records the attestation on the user row.
    @ApiProperty({ example: '1995-04-12' })
    @IsDateString()
    dateOfBirth!: string;
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
    email!: string;

    @ApiProperty({ example: '123456' })
    @IsString()
    @MinLength(6)
    @MaxLength(6)
    @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
    otp!: string;
}

export class ResendOtpDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email!: string;
}

export class ForgotPasswordDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email!: string;
}

// #418 (Council P0-13): admin MFA + break-glass DTOs.

export class MfaVerifyDto {
    @ApiProperty({ example: 'short-lived challenge token from login' })
    @IsString()
    @MinLength(10)
    challengeToken!: string;

    @ApiProperty({ example: '123456' })
    @IsString()
    @MinLength(6)
    @MaxLength(6)
    @Matches(/^\d{6}$/, { message: 'MFA code must be exactly 6 digits' })
    code!: string;
}

export class MfaRecoveryDto {
    @ApiProperty({ example: 'short-lived challenge token from login' })
    @IsString()
    @MinLength(10)
    challengeToken!: string;

    @ApiProperty({ example: 'ABCD-2345' })
    @IsString()
    @MinLength(4)
    @MaxLength(32)
    recoveryCode!: string;
}

export class MfaEnrollmentStartDto {
    // Required when enrolling with a full access token (password re-entry);
    // not required with an mfa-enrollment challenge token (password was
    // verified minutes earlier in the same login attempt).
    @ApiProperty({ example: 'current-password', required: false })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(72)
    password?: string;
}

export class MfaEnrollmentConfirmDto {
    @ApiProperty({ example: '123456' })
    @IsString()
    @MinLength(6)
    @MaxLength(6)
    @Matches(/^\d{6}$/, { message: 'MFA code must be exactly 6 digits' })
    code!: string;
}

export class BreakGlassLoginDto {
    @ApiProperty({ example: 'admin@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'strong-password' })
    @IsString()
    @MinLength(1)
    @MaxLength(72)
    password!: string;

    @ApiProperty({ example: 'ABCDE-FGHIJ-KLMNP-QRSTU' })
    @IsString()
    @MinLength(8)
    @MaxLength(64)
    code!: string;
}

export class CreateBreakGlassCredentialDto {
    @ApiProperty({ example: 'Sealed envelope — founder safe' })
    @IsString()
    @MinLength(3)
    @MaxLength(120)
    label!: string;

    @ApiProperty({ example: 'current-password' })
    @IsString()
    @MinLength(1)
    @MaxLength(72)
    password!: string;

    @ApiProperty({ example: 90, required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(365)
    expiresInDays?: number;
}

export class ResetPasswordDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'reset-token' })
    @IsString()
    @MinLength(10)
    token!: string;

    @ApiProperty({ example: 'newPassword123' })
    @IsString()
    @MinLength(8)
    @MaxLength(72)
    newPassword!: string;
}
