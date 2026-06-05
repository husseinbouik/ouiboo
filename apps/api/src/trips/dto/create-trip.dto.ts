import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsPositive, IsInt, Min, IsArray, MinLength, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TripCategory, TripStatus } from '@ouiboo/types';
import { IsDecimalMoney } from '../../common/validators/is-decimal-money.decorator';

export class ItineraryDayDto {
    @ApiProperty({ example: 1 })
    @IsInt()
    @IsPositive()
    dayNumber: number;

    @ApiProperty({ example: 'Arrival in Marrakech' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({ example: 'We will pick you up from the airport...' })
    @IsString()
    description: string;

    @ApiProperty({ example: ['Airport transfer', 'Welcome dinner'] })
    @IsArray()
    @IsString({ each: true })
    activities: string[];
}

export class CreateTripTemplateDto {
    @ApiProperty({ example: 'Marrakech Desert Adventure' })
    @IsString()
    @MinLength(3)
    title: string;

    @ApiProperty({ example: 'Experience the magic of the Moroccan desert...' })
    @IsString()
    @MinLength(10)
    description: string;

    @ApiProperty({ enum: TripCategory, example: TripCategory.Adventure })
    @IsEnum(TripCategory)
    category: TripCategory;

    @ApiProperty({ example: 'Marrakech, Morocco' })
    @IsString()
    startLocation: string;

    @ApiProperty({ example: 5 })
    @IsInt()
    @IsPositive()
    durationDays: number;

    @ApiProperty({ example: 4 })
    @IsInt()
    @Min(0)
    durationNights: number;

    @ApiProperty({ example: ['Transport', 'Lunch', 'Guide'] })
    @IsArray()
    @IsString({ each: true })
    inclusions: string[];

    @ApiProperty({ example: ['Safari Nature', 'Kayak'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    exclusions: string[];

    @ApiProperty({ example: ['Hiking shoes', 'Backpack'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    checklist: string[];

    @ApiProperty({ example: ['https://example.com/image1.jpg'] })
    @IsArray()
    @IsString({ each: true })
    images: string[];

    @ApiProperty({ enum: TripStatus, example: TripStatus.Draft })
    @IsEnum(TripStatus)
    status: TripStatus;

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
    @IsString()
    startDate: string;

    @ApiProperty({ example: '2025-01-05T00:00:00Z' })
    @IsString()
    endDate: string;

    @ApiProperty({ example: 1200.00 })
    @IsDecimalMoney()
    price: string | number;

    @ApiProperty({ example: 500.00 })
    @IsOptional()
    @IsDecimalMoney({ allowZero: true })
    deposit: string | number;

    @ApiProperty({ example: 20 })
    @IsInt()
    @IsPositive()
    totalSeats: number;
}
