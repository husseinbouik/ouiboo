import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsObject, IsOptional, Min, Max } from 'class-validator';

/** #695 (Council S6): agency-priced variant / add-on write DTOs.
 * `name` is a language-keyed map (ISO code -> label); French is
 * required, mirroring the trip-content rule (#546). */
export class UpsertPricingVariantDto {
    @ApiProperty({ example: { fr: 'Confort', en: 'Comfort', ar: 'مريح' } })
    @IsOptional()
    @IsObject()
    name?: Record<string, string>;

    @ApiProperty({ enum: ['PER_PERSON', 'PER_GROUP', 'PER_VEHICLE'], required: false })
    @IsOptional()
    @IsEnum(['PER_PERSON', 'PER_GROUP', 'PER_VEHICLE'])
    pricingUnit?: 'PER_PERSON' | 'PER_GROUP' | 'PER_VEHICLE';

    @ApiProperty({ example: 4, required: false, description: 'Persons per unit (PER_VEHICLE)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    unitSize?: number;

    @ApiProperty({ example: 1200, required: false, description: 'Required on create; optional on update' })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    price?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}

export class UpsertAddOnDto {
    @ApiProperty({ example: { fr: 'Transfert hôtel', en: 'Hotel pickup', ar: 'الاستقبال من الفندق' } })
    @IsOptional()
    @IsObject()
    name?: Record<string, string>;

    @ApiProperty({ enum: ['PER_PERSON', 'PER_BOOKING'], required: false })
    @IsOptional()
    @IsEnum(['PER_PERSON', 'PER_BOOKING'])
    pricingUnit?: 'PER_PERSON' | 'PER_BOOKING';

    @ApiProperty({ example: 200, required: false, description: 'Required on create; optional on update' })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    price?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}
