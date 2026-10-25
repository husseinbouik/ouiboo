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
    sessionId!: string;

    @ApiProperty({ example: 2 })
    @IsInt()
    @IsPositive()
    guestsCount!: number;

    @ApiProperty({ example: 'Abderrahmane El Amrani' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    fullName!: string;

    @ApiProperty({ example: '+212612345678' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(32)
    phoneNumber!: string;

    // Traveller identity-document numbers (CIN / passport) are intentionally
    // NOT collected (founder decision 2026-10-25): CIN processing would
    // trigger CNDP prior authorisation, and the agency checks ID physically
    // at departure. The global ValidationPipe forbids non-whitelisted
    // properties, so payloads still sending a document number are rejected.

    @ApiProperty({ enum: PaymentMethodEnum, example: PaymentMethodEnum.BANK_TRANSFER, description: 'Preferred payment method' })
    @IsEnum(PaymentMethodEnum)
    @IsOptional()
    paymentMethod?: PaymentMethodEnum;
}

export class VerifyManualPaymentDto {
    @ApiProperty({ example: true })
    @IsBoolean()
    approved!: boolean;

    @ApiProperty({ example: 'The transfer details do not match', required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    rejectionReason?: string;
}

/**
 * #422 (Council P0-20): bank confirmation settles an accepted proof. The
 * amount is the credit the agency actually observed in its bank account
 * (number or decimal string; validated as money in the service) and the
 * bank reference is the audit anchor binding it to that credit — both
 * are required.
 */
export class ConfirmBankPaymentDto {
    @ApiProperty({ example: 780.0, description: 'Amount actually received in the agency bank account' })
    @IsNotEmpty()
    confirmedAmount!: string | number;

    @ApiProperty({ example: 'TRX-2026-000123', description: 'Bank transfer reference of the received credit' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    bankReference!: string;
}
