import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

/**
 * #682 (Council S6): firm-quote DTOs. The traveller's request carries
 * dates/party ONLY — no price field exists on it, so an indicative
 * price cannot enter the flow from the traveller side. The agency's
 * reply carries the ONE firm total (MAD TTC) plus, optionally, its
 * cancellation bands (validated against the structured-scale rules in
 * the service; omitted = the trip's stored structured scale).
 */
export class CreateQuoteRequestDto {
    @ApiProperty({ example: 'clxpcyz12000008l2h3j4k5l6' })
    @IsString()
    @MaxLength(64)
    templateId!: string;

    @ApiProperty({ example: '2026-12-18' })
    @IsDateString()
    startDate!: string;

    @ApiProperty({ example: '2026-12-20' })
    @IsDateString()
    endDate!: string;

    @ApiProperty({ example: 4 })
    @IsInt()
    @Min(1)
    @Max(50)
    guestsCount!: number;

    @ApiProperty({ required: false, example: 'Two children, one vegetarian meal if possible.' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    note?: string;
}

export class QuoteReplyDto {
    @ApiProperty({ example: '2400.00', description: 'Firm TOTAL price for the requested dates/party, in MAD TTC' })
    @IsString()
    @Matches(/^\d{1,9}(\.\d{1,2})?$/, { message: 'totalAmount must be a positive MAD amount with at most 2 decimals' })
    totalAmount!: string;

    @ApiProperty({ required: false, example: 'Includes transport from the meeting point and lunch.' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    note?: string;

    @ApiProperty({
        required: false,
        description: 'The agency cancellation scale for this quote (bands). Omitted = the trip\u2019s structured scale.',
        example: [{ minDaysBeforeStart: 7, refundPercent: 50 }, { minDaysBeforeStart: 0, refundPercent: 0 }],
    })
    @IsOptional()
    @IsArray()
    cancellationBands?: Array<{ minDaysBeforeStart: number; refundPercent: number }>;
}
