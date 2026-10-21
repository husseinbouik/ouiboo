import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateCopyrightReportDto {
    @ApiProperty({ example: 'Jane Rightsowner' })
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    reporterName!: string;

    @ApiProperty({ example: 'jane@example.com' })
    @IsEmail()
    reporterEmail!: string;

    @ApiProperty({ example: 'https://ouiboo-traveler.vercel.app/trip/abc123' })
    @IsUrl({ require_protocol: true })
    @MaxLength(1000)
    contentUrl!: string;

    @ApiProperty({ example: 'This listing uses my copyrighted photographs without a license.' })
    @IsString()
    @MinLength(20)
    @MaxLength(4000)
    description!: string;

    @ApiProperty({ example: true })
    @IsBoolean()
    rightsAttestation!: boolean;
}

export class ResolveCopyrightReportDto {
    @ApiProperty({ enum: ['ACTIONED', 'DISMISSED', 'OPEN'] })
    @IsIn(['ACTIONED', 'DISMISSED', 'OPEN'])
    status!: 'ACTIONED' | 'DISMISSED' | 'OPEN';

    @ApiProperty({ required: false, example: 'trip-template-id' })
    @IsOptional()
    @IsString()
    tripId?: string;
}
