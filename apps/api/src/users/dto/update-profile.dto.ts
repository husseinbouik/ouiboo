import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, IsUrl, IsEnum, IsDateString, IsNumber, Matches, MaxLength } from 'class-validator';
import { EMERGENCY_CONTACT_PHONE_PATTERN } from '../../agency/dto/update-profile.dto';

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

    // #419 (Council P0-16): trip emergency contact — the person booked
    // travellers reach first during an active trip (departure pack).
    @ApiProperty({ example: 'Yasmine El Fassi', required: false, description: 'Who answers during trips (guide/on-call manager)' })
    @IsString()
    @IsOptional()
    @MaxLength(120)
    emergencyContactName?: string;

    @ApiProperty({ example: '+212600000000', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(32)
    @Matches(EMERGENCY_CONTACT_PHONE_PATTERN, {
        message: 'emergencyContactPhone must be a reachable phone number',
    })
    emergencyContactPhone?: string;

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

    // B4 (Council Session #2): licence issue date + issuing authority —
    // the Law 31-08 Art. 29/32 seller block cannot be completed without
    // them, so a licence submission is only reviewable when both are
    // present (same completeness rule as number/type/expiry/document).
    @ApiProperty({ example: '2024-03-15', required: false, description: 'Licence date of issue (ISO 8601)' })
    @IsDateString()
    @IsOptional()
    licenceIssuedAt?: string;

    @ApiProperty({ example: 'Ministère du Tourisme', required: false, description: 'Authority that issued the licence' })
    @IsString()
    @IsOptional()
    @MaxLength(160)
    licenceIssuingAuthority?: string;

    // #415: licence document — a PRIVATE identity-document upload key
    // (private/{userId}/…), never a URL. The service validates ownership
    // of the key. A complete licence submission (number + type + expiry
    // + document) is required before it can enter PENDING_REVIEW.
    @ApiProperty({ example: 'private/user-id/licence.pdf', required: false, description: 'Private storage key of the uploaded licence document' })
    @IsString()
    @IsOptional()
    @MaxLength(300)
    licenceDocumentKey?: string;

    @ApiProperty({ example: 'licence.pdf', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(200)
    licenceDocumentName?: string;

    // #415: RC insurance artefact. Status/verified-at/rejection fields
    // are server-managed and deliberately NOT part of this DTO. Any
    // change resets the insurance to PENDING_REVIEW (when complete).
    @ApiProperty({ example: 'AXA Assurance Maroc', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(160)
    insuranceInsurer?: string;

    @ApiProperty({ example: 'RC-2026-00421', required: false })
    @IsString()
    @IsOptional()
    @MaxLength(80)
    insurancePolicyNumber?: string;

    @ApiProperty({ example: 'Atlas Adventures SARL', required: false, description: 'Insured legal name — must match the agency legal name' })
    @IsString()
    @IsOptional()
    @MaxLength(160)
    insuranceInsuredName?: string;

    @ApiProperty({ example: '2026-01-01', required: false, description: 'Insurance cover start date (ISO 8601)' })
    @IsDateString()
    @IsOptional()
    insuranceValidFrom?: string;

    @ApiProperty({ example: '2026-12-31', required: false, description: 'Insurance expiry date (ISO 8601)' })
    @IsDateString()
    @IsOptional()
    insuranceExpiry?: string;

    @ApiProperty({ example: 1000000, required: false, description: 'Coverage limit in MAD' })
    @IsNumber()
    @IsOptional()
    insuranceCoverageLimit?: number;

    @ApiProperty({ example: 'private/user-id/rc-certificate.pdf', required: false, description: 'Private storage key of the uploaded RC certificate' })
    @IsString()
    @IsOptional()
    @MaxLength(300)
    insuranceCertificateKey?: string;
}
