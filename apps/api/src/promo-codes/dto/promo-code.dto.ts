import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { PromoDiscountType } from '@ouiboo/database';
import { BookingAddOnSelectionDto } from '../../bookings/dto/create-booking.dto';

/** #778 (Council S6 Phase 3): agency-funded promo code write DTOs. */
export class CreatePromoCodeDto {
    @ApiProperty({ example: 'SAVE10', description: 'Code travellers enter at booking (stored trimmed + upper-case)' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    code!: string;

    @ApiProperty({ enum: PromoDiscountType, example: PromoDiscountType.PERCENT })
    @IsEnum(PromoDiscountType)
    discountType!: PromoDiscountType;

    @ApiProperty({ example: 10, description: 'PERCENT: 0 < value <= 100. FIXED_MAD: MAD amount > 0' })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(100000)
    discountValue!: number;

    @ApiProperty({ required: false, example: '2026-11-01T00:00:00.000Z', description: 'Validity window start (optional)' })
    @IsOptional()
    @IsDateString()
    startsAt?: string;

    @ApiProperty({ required: false, example: '2026-12-31T23:59:59.000Z', description: 'Validity window end (optional)' })
    @IsOptional()
    @IsDateString()
    endsAt?: string;

    @ApiProperty({ required: false, example: 100, description: 'Maximum redemptions (optional; absent = unlimited)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100000)
    maxUses?: number;
}

export class SetPromoCodeActiveDto {
    @ApiProperty({ example: false, description: 'false deactivates the code (existing bookings keep their snapshot)' })
    @IsBoolean()
    isActive!: boolean;
}

/** #778: traveller promo preview at checkout (read-only; redeems nothing). */
export class PromoPreviewDto {
    @ApiProperty({ example: 'clxpcyz12000008l2h3j4k5l6' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    sessionId!: string;

    @ApiProperty({ example: 2 })
    @IsInt()
    @Min(1)
    @Max(1000)
    guestsCount!: number;

    @ApiProperty({ example: 'SAVE10', required: false, description: 'Optional — omit to preview campaign/session pricing (#755) alone' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    promoCode?: string;

    @ApiProperty({ required: false, description: 'Selected pricing variant id (#695), so the preview prices the same total the booking will' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    variantId?: string;

    @ApiProperty({ required: false, type: [BookingAddOnSelectionDto], description: 'Selected add-on ids + quantities (#695)' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @ValidateNested({ each: true })
    @Type(() => BookingAddOnSelectionDto)
    addOns?: BookingAddOnSelectionDto[];
}
