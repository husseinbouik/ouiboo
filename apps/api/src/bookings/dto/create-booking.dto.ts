import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsInt, IsPositive, IsEnum, IsIn, IsOptional, IsNotEmpty, MaxLength, IsArray, ValidateNested, Min, Max, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

/** #695 (Council S6): one selected paid add-on. Price is NEVER taken
 * from the client — the server resolves it from the trip's add-on row. */
export class BookingAddOnSelectionDto {
    @ApiProperty({ example: 'clxpcyz12000008l2h3j4k5l6' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    addOnId!: string;

    @ApiProperty({ example: 1, required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    quantity?: number;
}
import { CURRENT_BOOKING_TERMS_VERSION } from '@ouiboo/types';

/**
 * B9 (Council Session #2, #481): the server-side allowlist of booking
 * terms versions a NEW booking may be created under — the current
 * version only. When the binding terms text changes, bump
 * CURRENT_BOOKING_TERMS_VERSION in @ouiboo/types; the previous version
 * is rejected for new bookings from that moment (existing bookings
 * keep the version they were made under).
 */
export const ALLOWED_BOOKING_TERMS_VERSIONS: string[] = [
    CURRENT_BOOKING_TERMS_VERSION,
];

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

    // #424 (Council P0-22) + B9 (Council Session #2): the traveller's
    // active checkout UI locale. Persisted on the booking so every
    // booking-journey email renders in the language the traveller
    // booked in. REQUIRED since B9 — the locale is part of the
    // terms-acceptance record (version + locale + server timestamp);
    // a booking without it is rejected (400).
    @ApiProperty({ enum: ['en', 'fr', 'ar'], example: 'fr', description: 'Checkout UI locale for transactional emails' })
    @IsIn(['en', 'fr', 'ar'])
    locale!: string;

    // #481 + B9 (Council Session #2): explicit terms acceptance. The
    // checkout's unchecked-by-default checkbox sends termsAccepted:
    // true together with the version it displayed; the version alone
    // is NOT acceptance. Both are REQUIRED for a new booking — a
    // missing or false termsAccepted, a missing version, or a version
    // outside the server allowlist is rejected (400) and no booking is
    // created. This deliberately reverses #481's "never block a
    // booking" clause for new bookings. The accepted version is
    // persisted on the booking with a server acceptance timestamp as
    // the evidence of which terms the booking was made under.
    @ApiProperty({ example: true, description: 'Explicit acceptance of the booking terms (the checkout checkbox). Must be true.' })
    @IsBoolean()
    termsAccepted!: boolean;

    // #695 (Council S6): optional agency-priced variant (option tier)
    // for this trip. The server resolves its stored price and unit;
    // an id that does not belong to the booked trip is rejected.
    @ApiProperty({ required: false, description: 'Selected pricing variant (option tier) id for the trip (#695)' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    variantId?: string;

    @ApiProperty({ required: false, type: [BookingAddOnSelectionDto], description: 'Selected paid add-ons for the trip (#695)' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @ValidateNested({ each: true })
    @Type(() => BookingAddOnSelectionDto)
    addOns?: BookingAddOnSelectionDto[];

    @ApiProperty({ example: '1.0', enum: [...ALLOWED_BOOKING_TERMS_VERSIONS], description: 'Version of the booking terms accepted at checkout (server allowlist)' })
    @IsString()
    @IsIn(ALLOWED_BOOKING_TERMS_VERSIONS)
    @MaxLength(32)
    termsVersion!: string;
}

/**
 * #434 (Council P1-08): attendance recording by the owning agency.
 * `attended: true` marks the traveller ATTENDED (the booking completes
 * and becomes review-eligible); `attended: false` marks NO_SHOW (the
 * booking moves to the NO_SHOW status and is never review-eligible).
 */
export class MarkAttendanceDto {
    @ApiProperty({ example: true, description: 'Whether the traveller attended the trip' })
    @IsBoolean()
    attended!: boolean;
}

export class VerifyBookingPassDto {
    @ApiProperty({ description: 'The signed Booking Pass token from the traveller\'s QR code (#689)' })
    @IsString()
    @IsNotEmpty()
    token!: string;
}

export class DisputeAttendanceDto {
    @ApiProperty({ example: 'I attended the trip; the agency marked me absent by mistake.', description: 'Why the recorded attendance is wrong (#693)' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    reason!: string;
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
