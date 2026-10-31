import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { TripCategory } from '@ouiboo/types';

/**
 * #684 (Council S6): custom-trip request DTOs. The traveller authors
 * the trip facts (never a price for the trip itself — budgetMaxMad is
 * an optional traveller ceiling transmitted as-is). The agency's
 * offer carries ONE firm total in MAD TTC, transmitted unchanged.
 */
export class CreateCustomTripRequestDto {
    @ApiProperty({ example: 'Three days around Chefchaouen with a local guide' })
    @IsString()
    @MaxLength(200)
    title!: string;

    @ApiProperty({ required: false, example: 'We want to visit the blue medina and Akchour.' })
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    description?: string;

    @ApiProperty({ enum: TripCategory, required: false })
    @IsOptional()
    @IsEnum(TripCategory)
    category?: TripCategory;

    @ApiProperty({ required: false, example: 'chefchaouen', description: 'Cluster destination slug (tangier / tetouan / chefchaouen)' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    destinationSlug?: string;

    @ApiProperty({ required: false, example: 'Chefchaouen' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    startLocation?: string;

    @ApiProperty({ example: '2027-01-14' })
    @IsDateString()
    startDate!: string;

    @ApiProperty({ example: '2027-01-16' })
    @IsDateString()
    endDate!: string;

    @ApiProperty({ example: 3 })
    @IsInt()
    @Min(1)
    @Max(50)
    guestsCount!: number;

    @ApiProperty({ required: false, example: '3000.00', description: 'Optional traveller budget ceiling in MAD' })
    @IsOptional()
    @IsString()
    @Matches(/^\d{1,9}(\.\d{1,2})?$/, { message: 'budgetMaxMad must be a positive MAD amount with at most 2 decimals' })
    budgetMaxMad?: string;

    @ApiProperty({ required: false, example: 'One traveller uses a wheelchair.' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    note?: string;
}

export class CreateCustomTripOfferDto {
    @ApiProperty({ example: '2700.00', description: 'Firm TOTAL price for the requested trip, in MAD TTC' })
    @IsString()
    @Matches(/^\d{1,9}(\.\d{1,2})?$/, { message: 'totalAmount must be a positive MAD amount with at most 2 decimals' })
    totalAmount!: string;

    @ApiProperty({ required: false, example: 'Includes private transport and guiding.' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    note?: string;

    @ApiProperty({
        required: false,
        description: 'The agency cancellation scale for this offer (bands). Omitted = platform default scale.',
        example: [{ minDaysBeforeStart: 7, refundPercent: 50 }, { minDaysBeforeStart: 0, refundPercent: 0 }],
    })
    @IsOptional()
    @IsArray()
    cancellationBands?: Array<{ minDaysBeforeStart: number; refundPercent: number }>;
}
