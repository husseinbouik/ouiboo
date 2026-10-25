import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

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

export const REFUND_REPAIR_ACTIONS = ['reopen', 'correct-amount', 'relink-payment'] as const;

export type RefundRepairAction = (typeof REFUND_REPAIR_ACTIONS)[number];

/**
 * #423: admin-only repair of a stuck refund case. Every repair requires
 * a written reason, which is stored in the AuditLog metadata.
 */
export class RepairRefundCaseDto {
    @ApiProperty({
        enum: REFUND_REPAIR_ACTIONS,
        description: 'reopen: terminal case returns to eligibility review. correct-amount: fix approvedAmount (a completed case is reopened in the same action). relink-payment: fix the original payment link.',
    })
    @IsIn(REFUND_REPAIR_ACTIONS)
    action!: RefundRepairAction;

    @ApiProperty({ example: 'Case completed against the wrong payment', description: 'Mandatory reason recorded in the audit log.' })
    @IsString()
    @MinLength(3)
    @MaxLength(1000)
    reason!: string;

    @ApiProperty({ required: false, example: 150, description: 'Required for the correct-amount action.' })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    approvedAmount?: number;

    @ApiProperty({ required: false, nullable: true, description: 'ExternalPayment id for the relink-payment action. Send null to clear the link.' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    originalPaymentId?: string | null;

    @ApiProperty({ required: false, description: 'External payment reference for the relink-payment action. Defaults to the linked payment reference.' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    externalPaymentReference?: string;
}

export class FailRefundDto {
    @ApiProperty({ example: 'Traveller bank details rejected by the bank' })
    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    failureReason!: string;
}
