import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsInt, IsPositive, IsEnum, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';

export enum PaymentMethodEnum {
    BANK_TRANSFER = 'BANK_TRANSFER',
    CARD = 'CARD',
    WALLET = 'WALLET',
    MOBILE_MONEY = 'MOBILE_MONEY',
}

export class CreateBookingDto {
    @ApiProperty({ example: 'clxpcyz12000008l2h3j4k5l6' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    sessionId: string;

    @ApiProperty({ example: 2 })
    @IsInt()
    @IsPositive()
    guestsCount: number;

    @ApiProperty({ example: 'Abderrahmane El Amrani' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    fullName: string;

    @ApiProperty({ example: '+212612345678' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(32)
    phoneNumber: string;

    @ApiProperty({ example: 'CIN AE123456' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    documentNumber: string;

    @ApiProperty({ enum: PaymentMethodEnum, example: PaymentMethodEnum.BANK_TRANSFER, description: 'Preferred payment method' })
    @IsEnum(PaymentMethodEnum)
    @IsOptional()
    paymentMethod?: PaymentMethodEnum;
}

export class VerifyManualPaymentDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    approved: boolean;

    @ApiProperty({ example: 'The transfer details do not match', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    rejectionReason?: string;
}
