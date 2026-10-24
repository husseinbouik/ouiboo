import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class RequestRefundDto {
    @ApiProperty({ example: 'booking-id' })
    @IsString()
    @MinLength(1)
    bookingId!: string;

    @ApiProperty({ required: false, example: 'Trip plans changed', description: 'Optional traveller-supplied reason for the refund request.' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}

export class CreateRefundCaseDto {
    @ApiProperty({ example: 'booking-id' })
    @IsString()
    @MinLength(1)
    bookingId!: string;

    @ApiProperty({ required: false, description: 'Optional machine-readable reason override (defaults to AGENCY_CANCELLATION / ADMIN_INITIATED).' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}

export class ApproveRefundDto {
    @ApiProperty({ required: false, example: 200, description: 'Approved refund amount. Defaults to the requested amount; may not exceed it.' })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    approvedAmount?: number;
}

export class RejectRefundDto {
    @ApiProperty({ example: 'Outside the cancellation policy window' })
    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    reason!: string;
}

export class InitiateRefundDto {
    @ApiProperty({ required: false, description: 'Payment provider refund reference, when the refund was initiated with the provider.' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    providerRefundId?: string;
}

export class CompleteRefundDto {
    @ApiProperty({ required: false, description: 'Payment provider refund reference.' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    providerRefundId?: string;

    @ApiProperty({ required: false, description: 'Provider-reported refund status.' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    providerStatus?: string;
}

export class FailRefundDto {
    @ApiProperty({ example: 'Traveller bank details rejected by the bank' })
    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    failureReason!: string;
}
