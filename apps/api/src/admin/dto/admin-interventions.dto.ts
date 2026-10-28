import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * #423 — every admin stuck-state intervention requires a written reason.
 * The reason is stored in the AuditLog metadata in the same transaction
 * as the state change, so an intervention without a reason cannot exist.
 */
export class InterventionReasonDto {
    @ApiProperty({
        example: 'Agency confirmed the group by phone; minimum waived by support decision',
        description: 'Mandatory reason recorded in the audit log.',
    })
    @IsString()
    @MinLength(3)
    @MaxLength(1000)
    reason!: string;
}

export class ExtendDeadlineDto extends InterventionReasonDto {
    @ApiProperty({
        example: '2027-03-05T09:00:00.000Z',
        description: 'New confirmation deadline. Must be in the future and before the session start date.',
    })
    @IsDateString()
    newDeadline!: string;
}

export const BOOKING_REPAIR_ACTIONS = [
    'resync-payment-state',
    'requeue-proof-review',
    'open-refund-case',
] as const;

export type BookingRepairAction = (typeof BOOKING_REPAIR_ACTIONS)[number];

export class RepairBookingDto extends InterventionReasonDto {
    @ApiProperty({
        enum: BOOKING_REPAIR_ACTIONS,
        description: 'Named repair only — there is deliberately no free-form status setter.',
    })
    @IsIn(BOOKING_REPAIR_ACTIONS)
    action!: BookingRepairAction;
}
