import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsEnum, IsPositive, IsInt, Min, Max, IsArray, ArrayMinSize, ArrayMaxSize, MinLength, IsOptional, IsObject, ValidateNested, IsDateString, Matches, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { TripCategory, TripStatus } from '@ouiboo/types';
import { IsDecimalMoney } from '../../common/validators/is-decimal-money.decorator';

export class ItineraryDayDto {
    @ApiProperty({ example: 1 })
    @IsInt()
    @IsPositive()
    dayNumber!: number;

    @ApiProperty({ example: 'Arrival in Marrakech' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ example: 'We will pick you up from the airport...' })
    @IsString()
    description!: string;

    @ApiProperty({ example: ['Airport transfer', 'Welcome dinner'] })
    @IsArray()
    @IsString({ each: true })
    activities!: string[];
}

/**
 * #417 (Council P0-11): one band of an agency's per-trip cancellation
 * scale for traveller-initiated cancellations. Semantic rules (coverage
 * down to 0 days, no duplicate thresholds) are enforced in
 * TripsService via cancellation.util; the platform floor (agency fault /
 * minimum group not reached = 100% refund) is not configurable here and
 * always overrides the bands.
 */
export class CancellationBandDto {
    @ApiProperty({ example: 30, description: 'Whole days before the trip starts at which this band begins.' })
    @IsInt()
    @Min(0)
    @Max(365)
    minDaysBeforeStart!: number;

    @ApiProperty({ example: 100, description: 'Percent of the amount actually paid that is refunded when cancelling in this band.' })
    @IsInt()
    @Min(0)
    @Max(100)
    refundPercent!: number;
}

export class CancellationPolicyDto {
    @ApiProperty({ type: [CancellationBandDto], description: 'Bands covering every cancellation timing; must include a band starting at 0 days.' })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(10)
    @ValidateNested({ each: true })
    @Type(() => CancellationBandDto)
    bands!: CancellationBandDto[];
}

/**
 * #546: one language's title + description inside the trip translations
 * map. Both fields are optional at the DTO level (drafts may be
 * incomplete in any language); completeness is a publish-time rule —
 * French must be complete before a trip can go ACTIVE (TripsService).
 */
/** #584 (phase 2): one itinerary day's text inside a language entry. */
export class TripTranslationDayDto {
    @ApiProperty({ required: false, example: 1 })
    @IsOptional()
    @IsInt()
    dayNumber?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    title?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(10000)
    description?: string;

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    activities?: string[];
}

export class TripTranslationEntryDto {
    @ApiProperty({ example: 'Aventure dans le désert de Marrakech', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    title?: string;

    @ApiProperty({ example: 'Découvrez la magie du désert marocain...', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(10000)
    description?: string;

    // #584 (phase 2): section content in this language — itinerary days
    // (aligned to the canonical days by dayNumber; positional entries
    // are stamped at the write boundary) and whole-list translations.
    @ApiProperty({ required: false, type: [TripTranslationDayDto] })
    @IsOptional()
    @IsArray()
    itinerary?: TripTranslationDayDto[];

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    inclusions?: string[];

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    exclusions?: string[];

    @ApiProperty({ required: false, type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    checklist?: string[];
}

export class CreateTripTemplateDto {
    @ApiProperty({ example: 'Marrakech Desert Adventure' })
    @IsString()
    @MinLength(3)
    title!: string;

    @ApiProperty({ example: 'Experience the magic of the Moroccan desert...' })
    @IsString()
    @MinLength(10)
    description!: string;

    // #546: multilingual title + description, keyed by ISO language
    // code ({ fr: { title, description }, ar: { ... } }). The top-level
    // `title`/`description` above are the FRENCH text (canonical) and
    // mirror the map's `fr` entry on every write. The map is sanitized
    // server-side (trip-translations.util); a future language is added
    // by sending a new key — no API change needed.
    @ApiProperty({
        required: false,
        description: 'Title + description per language code: { [languageCode]: { title?, description? } }',
        example: { ar: { title: 'مغامرة في صحراء مراكش', description: '...' } },
    })
    @IsOptional()
    @IsObject()
    translations?: Record<string, TripTranslationEntryDto>;

    @ApiProperty({ enum: TripCategory, example: TripCategory.Adventure })
    @IsEnum(TripCategory)
    category!: TripCategory;

    @ApiProperty({ example: 'Marrakech, Morocco' })
    @IsString()
    startLocation!: string;

    @ApiProperty({ example: 'Merzouga, Morocco', required: false })
    @IsOptional()
    @IsString()
    endLocation?: string;

    @ApiProperty({ example: 'MAD', required: false })
    @IsOptional()
    @Matches(/^[A-Z]{3}$/)
    currency?: string;

    @ApiProperty({ example: 5 })
    @IsInt()
    @IsPositive()
    durationDays!: number;

    @ApiProperty({ example: 4 })
    @IsInt()
    @Min(0)
    durationNights!: number;

    @ApiProperty({ example: ['Transport', 'Lunch', 'Guide'] })
    @IsArray()
    @IsString({ each: true })
    inclusions!: string[];

    @ApiProperty({ example: ['Safari Nature', 'Kayak'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    exclusions!: string[];

    @ApiProperty({ example: ['Hiking shoes', 'Backpack'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    checklist!: string[];

    @ApiProperty({ example: ['https://example.com/image1.jpg'] })
    @IsArray()
    @IsString({ each: true })
    images!: string[];

    // #332: optional alt text per image, aligned by index with `images`.
    // Entries may be empty strings (no custom alt); renderers fall back to
    // the generated "title - startLocation" pattern.
    @ApiProperty({ example: ['Travelers hiking toward the Atlas summit at sunrise'], required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @MaxLength(300, { each: true })
    imageAlts?: string[];

    @ApiProperty({ enum: TripStatus, example: TripStatus.Draft })
    @IsEnum(TripStatus)
    status!: TripStatus;

    // #417 (Council P0-11): agency per-trip cancellation bands. Omit to
    // use the platform default scale. The platform floor (agency fault /
    // minimum group not reached = 100% refund) always applies on top.
    @ApiProperty({ type: CancellationPolicyDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => CancellationPolicyDto)
    cancellationPolicy?: CancellationPolicyDto;

    @ApiProperty({ type: [ItineraryDayDto], required: false })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ItineraryDayDto)
    itinerary?: ItineraryDayDto[];
}

export class UpdateTripTemplateDto extends PartialType(CreateTripTemplateDto) { }

export class CreateTripSessionDto {
    @ApiProperty({ example: '2025-01-01T00:00:00Z' })
    @IsDateString()
    startDate!: string;

    @ApiProperty({ example: '2025-01-05T00:00:00Z' })
    @IsDateString()
    endDate!: string;

    @ApiProperty({ example: 1200.00 })
    @IsDecimalMoney()
    price!: string | number;

    @ApiProperty({ example: 500.00 })
    @IsOptional()
    @IsDecimalMoney({ allowZero: true })
    deposit!: string | number;

    @ApiProperty({ example: 20 })
    @IsInt()
    @IsPositive()
    totalSeats!: number;

    @ApiProperty({ example: 'MAD', required: false })
    @IsOptional()
    @Matches(/^[A-Z]{3}$/)
    currency?: string;

    /**
     * #369: minimum participants for the trip to be confirmed. When > 1
     * and a deposit is set, the session uses staged payments (deposit
     * first, balance after confirmation).
     */
    @ApiProperty({ example: 6, required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    minBookings?: number;

    /**
     * #369: deadline by which the minimum group size must be reached.
     * Required for staged sessions (minBookings > 1 with a deposit).
     */
    @ApiProperty({ example: '2025-01-01T00:00:00Z', required: false })
    @IsOptional()
    @IsDateString()
    confirmationDeadline?: string;
}

export class UpdateTripSessionDto extends PartialType(CreateTripSessionDto) { }
