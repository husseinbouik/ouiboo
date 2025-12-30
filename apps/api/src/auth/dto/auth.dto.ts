import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '@ouiboo/types';

export class LoginDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @MinLength(6)
    password: string;
}

export class RegisterDto {
    @ApiProperty({ example: 'agency@ouiboo.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'Atlas Voyages' })
    @IsString()
    @MinLength(2)
    name: string;

    @ApiProperty({ enum: UserRole, example: UserRole.Agency })
    @IsEnum(UserRole)
    role: UserRole;
}

export class RefreshTokenDto {
    @ApiProperty({ example: 'your-refresh-token-here' })
    @IsString()
    refresh_token: string;
}
