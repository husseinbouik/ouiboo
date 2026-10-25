import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

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

    @ApiProperty({ required: false, example: true, description: '#417: mark the request as a cancellation — the amount is then computed from the booking’s cancellation scale (snapshot taken at booking time) instead of the full amount paid.' })
    @IsOptional()
    @IsBoolean()
    cancellation?: boolean;
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
    @ApiProperty({ required: false, description: 'Payment provider refund reference. Recorded as reported only — since #416 a typed reference never creates gateway provenance; the ledger source derives from the case\'s qualifying completion evidence.' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    providerRefundId?: string;

    @ApiProperty({ required: false, description: 'Provider-reported refund status. Recorded as reported; never inferred or defaulted (since #416).' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    providerStatus?: string;
}

/**
 * #416 (Council P0-09): agency submission of refund completion evidence
 * (one shape per decision D9). The bank/provider reference is mandatory,
 * and so is the retained confirmation document: a private storage key
 * from the identity-document upload intent (private/{userId}/…). The
 * service records tier BANK_REFERENCE, upgraded to
 * BANK_PROVIDER_CONFIRMATION when the reference matches a provider
 * transaction id the system already holds for the booking.
 */
export class AddRefundEvidenceDto {
    @ApiProperty({ example: 'VIR-2026-1042', description: 'Bank transfer reference or provider transaction id for the refund payment (mandatory — it is the audit anchor).' })
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    reference!: string;

    @ApiProperty({ example: 'private/<userId>/bank-confirmation.pdf', description: 'Private storage key of the retained bank/provider confirmation document (mandatory). Must reference a document uploaded by this agency under private/{userId}/.' })
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    proofUrl!: string;

    @ApiProperty({ required: false, example: 200, description: 'Amount actually sent, as observed on the confirmation document. Defaults to the case amount when omitted.' })
    @IsOptional()
    @IsNumber()
    @Min(0.01)
    amount?: number;

    @ApiProperty({ required: false, description: 'Optional note about the confirmation (e.g. bank name, value date).' })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    note?: string;
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

/**
 * #416B (Council P0-09): traveller dispute of a completed refund ("the
 * money never arrived"). The reason is mandatory — it becomes the
 * case's dispute record and the trigger for the reopening audit row.
 * The dispute window itself is enforced in the service.
 */
export class DisputeRefundDto {
    @ApiProperty({ example: 'The money has not arrived in my account' })
    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    reason!: string;
}
