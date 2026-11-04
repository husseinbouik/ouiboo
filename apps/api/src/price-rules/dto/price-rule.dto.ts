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
import { PromoDiscountType } from '@ouiboo/database';

/** #755: agency campaign/session price-rule write DTOs. */
export class CreateSessionPriceRuleDto {
    @ApiProperty({ example: 'Low-season weekdays', description: 'Campaign name shown to the agency and snapshotted onto bookings' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name!: string;

    @ApiProperty({ required: false, description: 'Trip template the rule applies to (template scope); omit when sessionId is given' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    templateId?: string;

    @ApiProperty({ required: false, description: 'Single session the rule applies to (session scope wins over template scope)' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    sessionId?: string;

    @ApiProperty({ enum: PromoDiscountType, example: PromoDiscountType.PERCENT })
    @IsEnum(PromoDiscountType)
    discountType!: PromoDiscountType;

    @ApiProperty({ example: 15, description: 'PERCENT: 0 < value <= 100. FIXED_MAD: MAD amount > 0' })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(100000)
    discountValue!: number;

    @ApiProperty({ required: false, description: 'Eligibility window start (optional)' })
    @IsOptional()
    @IsDateString()
    startsAt?: string;

    @ApiProperty({ required: false, description: 'Eligibility window end (optional)' })
    @IsOptional()
    @IsDateString()
    endsAt?: string;

    @ApiProperty({ required: false, example: 50, description: 'Maximum applications (optional; absent = unlimited)' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(1000000)
    maxUses?: number;

    @ApiProperty({ required: false, example: 5000, description: 'Total discount budget in MAD (optional; absent = no budget cap)' })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    @Max(100000000)
    budgetCap?: number;

    @ApiProperty({ required: false, example: false, description: 'Whether the rule combines with a promo code on the same booking (default false: a used code wins, the rule is skipped)' })
    @IsOptional()
    @IsBoolean()
    stacksWithPromoCode?: boolean;
}

export class SetSessionPriceRuleActiveDto {
    @ApiProperty({ example: false, description: 'false deactivates the rule (existing bookings keep their snapshot)' })
    @IsBoolean()
    isActive!: boolean;
}
