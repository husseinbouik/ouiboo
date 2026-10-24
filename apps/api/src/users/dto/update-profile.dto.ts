import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsUrl, IsEnum, IsDateString, MaxLength } from 'class-validator';

// #371: mirrors the Prisma TravelLicenceType enum (Law 11-16 categories).
export enum TravelLicenceTypeDto {
    ODV = 'ODV',
    DV = 'DV',
}

export class UpdateAgencyProfileDto {
    @ApiProperty({ example: 'Atlas Voyages' })
    @IsString()
    @MinLength(2)
    companyName!: string;

    @ApiProperty({ example: '123456789012345' })
    @IsString()
    @MinLength(15)
    ice!: string;

    @ApiProperty({ example: 'P1234567' })
    @IsString()
    patente!: string;

    @ApiProperty({ example: 'MA6400010001000100010001' })
    @IsString()
    @MinLength(24)
    rib!: string;

    @ApiProperty({ example: 'Expert travel agency in Morocco...', required: false })
    @IsString()
    @IsOptional()
    bio?: string;

    @ApiProperty({ example: 'https://example.com/logo.png', required: false })
    @IsUrl()
    @IsOptional()
    logo?: string;

    // #371: legal identity (plan §6). Only genuinely necessary compliance
    // data is collected. Licence status/verified-at are server-managed and
    // are deliberately NOT part of this DTO.
    @ApiProperty({ example: 'Atlas Adventures SARL', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(160)
    legalName?: string;

    @ApiProperty({ example: '123456', required: false, description: 'Registre de commerce number' })
    @IsString()
    @IsOptional()
    @MaxLength(60)
    rc?: string;

    @ApiProperty({ example: '12345678', required: false, description: 'Tax identifier (identifiant fiscal)' })
    @IsString()
    @IsOptional()
    @MaxLength(60)
    taxId?: string;

    @ApiProperty({ example: 'Sara Bennani', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(120)
    legalRepresentative?: string;

    @ApiProperty({ example: '12 Avenue Mohammed V, Marrakech', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(300)
    businessAddress?: string;

    @ApiProperty({ enum: TravelLicenceTypeDto, required: false })
    @IsEnum(TravelLicenceTypeDto)
    @IsOptional()
    travelLicenceType?: TravelLicenceTypeDto;

    @ApiProperty({ example: 'AV-2024-0187', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(80)
    travelLicenceNumber?: string;

    @ApiProperty({ example: '2028-05-31', required: false, description: 'Licence expiry date (ISO 8601)' })
    @IsDateString()
    @IsOptional()
    licenceExpiry?: string;
}
