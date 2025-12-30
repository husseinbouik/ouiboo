import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsPositive, IsInt, Min, IsArray, IsUrl, MinLength } from 'class-validator';
import { TripCategory, TripStatus } from '@ouiboo/types';

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

    @ApiProperty({ example: ['https://example.com/image1.jpg'] })
    @IsArray()
    @IsUrl({}, { each: true })
    images: string[];

    @ApiProperty({ enum: TripStatus, example: TripStatus.Draft })
    @IsEnum(TripStatus)
    status: TripStatus;
}

export class CreateTripSessionDto {
    @ApiProperty({ example: '2025-01-01T00:00:00Z' })
    @IsString()
    startDate: string;

    @ApiProperty({ example: '2025-01-05T00:00:00Z' })
    @IsString()
    endDate: string;

    @ApiProperty({ example: 1200.00 })
    @IsNumber()
    @IsPositive()
    price: number;

    @ApiProperty({ example: 20 })
    @IsInt()
    @IsPositive()
    totalSeats: number;
}
