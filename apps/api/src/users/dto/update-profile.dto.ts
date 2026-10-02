import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsUrl } from 'class-validator';

export class UpdateAgencyProfileDto {
    @ApiProperty({ example: 'Atlas Voyages' })
    @IsString()
    @MinLength(2)
    companyName: string;

    @ApiProperty({ example: '123456789012345' })
    @IsString()
    @MinLength(15)
    ice: string;

    @ApiProperty({ example: 'P1234567' })
    @IsString()
    patente: string;

    @ApiProperty({ example: 'MA6400010001000100010001' })
    @IsString()
    @MinLength(24)
    rib: string;

    @ApiProperty({ example: 'Expert travel agency in Morocco...', required: false })
    @IsString()
    @IsOptional()
    bio?: string;

    @ApiProperty({ example: 'https://example.com/logo.png', required: false })
    @IsUrl()
    @IsOptional()
    logo?: string;
}
