import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsEnum, IsPositive, IsInt, Min, Max, IsArray, ArrayMinSize, ArrayMaxSize, MinLength, IsOptional, IsObject, ValidateNested, IsDateString, Matches, MaxLength, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { AccommodationTier, AccommodationType, ItineraryMeal, SessionKind, TripCategory, TripStatus } from '@ouiboo/types';
import { IsDecimalMoney } from '../../common/validators/is-decimal-money.decorator';

/** #701: one per-stop detail entry — language-keyed name/admission note. */
export class ItineraryStopDto {
    @ApiProperty({ example: { fr: 'Médina de Tanger' }, description: 'Stop name per language code' })
    @IsObject()
    name!: Record<string, string>;

    @ApiProperty({ example: 90, required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(1440)
    durationMinutes?: number;

    @ApiProperty({ example: { fr: 'Entrée incluse' }, required: false, description: 'Admission note per language code' })
    @IsOptional()
    @IsObject()
    admissionNote?: Record<string, string>;
}

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

    // #676 (Council S6): language-neutral slice — all optional, never
    // language maps (numbers / enums / a proper noun).
    @ApiProperty({ example: 42.5, required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(10000)
    distanceKm?: number;

    @ApiProperty({ example: 75, required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(10080)
    driveTimeMinutes?: number;

    @ApiProperty({ enum: ItineraryMeal, isArray: true, required: false })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(3)
    @IsEnum(ItineraryMeal, { each: true })
    mealsIncluded?: ItineraryMeal[];

    @ApiProperty({ example: 'Riad Goloboy', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    accommodationName?: string;

    @ApiProperty({ enum: AccommodationType, required: false })
    @IsOptional()
    @IsEnum(AccommodationType)
    accommodationType?: AccommodationType;

    // #701 (Council S6): itinerary phase 2 — all optional.
    @ApiProperty({ enum: AccommodationTier, required: false })
    @IsOptional()
    @IsEnum(AccommodationTier)
    accommodationTier?: AccommodationTier;

    @ApiProperty({ type: [ItineraryStopDto], required: false })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(12)
    @ValidateNested({ each: true })
    @Type(() => ItineraryStopDto)
    stops?: ItineraryStopDto[];

    @ApiProperty({ required: false, example: { fr: 'Nuit en bivouac.' }, description: 'Free-text day notes per language code' })
    @IsOptional()
    @IsObject()
    notes?: Record<string, string>;
}

/** #686: one agency-authored FAQ entry (question/answer per language). */
export class TripFaqDto {
    @ApiProperty({ example: { fr: 'Le déjeuner est-il inclus ?' } })
    @IsObject()
    question!: Record<string, string>;

    @ApiProperty({ example: { fr: 'Oui, le jour 2.' } })
    @IsObject()
    answer!: Record<string, string>;
}

/** #701: one agency-defined pickup point (proper nouns, not a map). */
export class PickupPointDto {
    @ApiProperty({ example: 'gare-tanger-ville', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    id?: string;

    @ApiProperty({ example: 'Gare Tanger Ville' })
    @IsString()
    @MaxLength(200)
    name!: string;

    @ApiProperty({ example: 'Avenue Mohammed V, Tanger', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    address?: string;

    @ApiProperty({ example: 'https://maps.google.com/?q=...', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    @Matches(/^https?:\/\//, { message: 'pickupPoint.mapsUrl must be an http(s) URL' })
    mapsUrl?: string;
}

/**
 * #676: the structured meeting point { address, mapsUrl,
 * pickupAvailable } stored alongside startLocation (the departure
 * city/area). The address is not localised; public payloads expose the
 * area only and booking responses carry the full structure.
 */
export class MeetingPointDto {
    @ApiProperty({ example: 'Place du 9 Avril 1947, Tanger', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    address?: string;

    @ApiProperty({ example: 'https://maps.google.com/?q=...', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    @Matches(/^https?:\/\//, { message: 'meetingPoint.mapsUrl must be an http(s) URL' })
    mapsUrl?: string;

    @ApiProperty({ example: true, required: false })
    @IsOptional()
    @IsBoolean()
    pickupAvailable?: boolean;
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

    // #675: normalised destination slug from the BETA_DESTINATIONS
    // configuration (tangier / tetouan / chefchaouen). Validated
    // against the config in TripsService; omitted = derived from
    // startLocation on write.
    @ApiProperty({ example: 'tangier', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    destinationSlug?: string;

    // #676: structured meeting point alongside startLocation.
    @ApiProperty({ type: MeetingPointDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => MeetingPointDto)
    meetingPoint?: MeetingPointDto;

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

    // #686 (Council S6): capped agency-authored FAQs (language-keyed).
    // Validated + scanned against the #674 guardrail in TripsService.
    @ApiProperty({ type: [TripFaqDto], required: false })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(5)
    @ValidateNested({ each: true })
    @Type(() => TripFaqDto)
    faqs?: TripFaqDto[];

    // #697: agency election — pay-on-arrival (low-value single-day only).
    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @IsBoolean()
    payOnArrivalEnabled?: boolean;

    // #694: the trip offers a private per-group variant.
    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @IsBoolean()
    privateTourEnabled?: boolean;

    // #701: agency-defined pickup points for booking-time selection.
    @ApiProperty({ type: [PickupPointDto], required: false })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @ValidateNested({ each: true })
    @Type(() => PickupPointDto)
    pickupPoints?: PickupPointDto[];
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

    // #694: SHARED (default) or PRIVATE (per-group exclusive lock).
    @ApiProperty({ enum: SessionKind, required: false })
    @IsOptional()
    @IsEnum(SessionKind)
    sessionKind?: SessionKind;

    // #696: reserve now, pay the agency before the hold deadline.
    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @IsBoolean()
    allowPayLater?: boolean;

    @ApiProperty({ example: 48, required: false, description: 'Pay-later hold length in hours (default 48, max 336)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(336)
    payLaterHoldHours?: number;
}

export class UpdateTripSessionDto extends PartialType(CreateTripSessionDto) { }
