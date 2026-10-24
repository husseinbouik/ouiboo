import { BadRequestException } from '@nestjs/common';
import { Prisma, SessionGroupStatus } from '@ouiboo/database';

/**
 * #369 — staged payments shared rules (plan §§9–11, 53).
 *
 * A session is STAGED when it requires a minimum group size
 * (minBookings > 1) and collects a deposit first: travellers pay only the
 * deposit until the minimum is confirmed, and the balance is never
 * collected for a trip whose minimum is not reached.
 */

/**
 * Platform deposit cap for minimum-group (unconfirmed) trips: the deposit
 * per seat may not exceed 30% of the session price. Without a cap an
 * agency could set a ~90% "deposit" and defeat the traveller-protection
 * model while keeping the staged-payment label.
 */
export const MAX_GROUP_DEPOSIT_PERCENT = 30;

export const PAYMENT_POLICY_VERSION = 'phase1-v1';
export const REFUND_POLICY_VERSION = 'phase1-v1';

export const GROUP_MINIMUM_NOT_REACHED_REASON = 'GROUP_MINIMUM_NOT_REACHED';

export interface StagedSessionConfigInput {
    price: Prisma.Decimal;
    deposit: Prisma.Decimal;
    minBookings: number;
    confirmationDeadline?: Date | null;
    startDate: Date;
}

export interface ResolvedStagedSessionConfig {
    staged: boolean;
    groupStatus: SessionGroupStatus;
    confirmationDeadline: Date | null;
}

/** True when a session configuration uses staged payments. */
export function isStagedSessionConfig(minBookings: number, deposit: Prisma.Decimal): boolean {
    return minBookings > 1 && deposit.greaterThan(0);
}

/**
 * Validate a session configuration and resolve its staged-payment fields.
 * Throws BadRequestException on any rule violation; returns the
 * groupStatus / confirmationDeadline to persist when valid.
 */
export function resolveStagedSessionConfig(
    input: StagedSessionConfigInput,
    now: Date = new Date(),
): ResolvedStagedSessionConfig {
    const { price, deposit, minBookings, startDate } = input;

    if (!Number.isInteger(minBookings) || minBookings < 1) {
        throw new BadRequestException('minBookings must be a positive integer');
    }

    if (!isStagedSessionConfig(minBookings, deposit)) {
        return {
            staged: false,
            groupStatus: SessionGroupStatus.NOT_REQUIRED,
            confirmationDeadline: null,
        };
    }

    const maxDeposit = price.mul(MAX_GROUP_DEPOSIT_PERCENT).div(100);
    if (deposit.greaterThan(maxDeposit)) {
        throw new BadRequestException(
            `Deposit for a minimum-group trip cannot exceed ${MAX_GROUP_DEPOSIT_PERCENT}% of the session price`,
        );
    }

    const deadline = input.confirmationDeadline ?? null;
    if (!deadline) {
        throw new BadRequestException(
            'A confirmation deadline is required when a trip requires a minimum group size and a deposit',
        );
    }
    if (deadline <= now) {
        throw new BadRequestException('Confirmation deadline must be in the future');
    }
    if (deadline >= startDate) {
        throw new BadRequestException('Confirmation deadline must be before the session start date');
    }

    return {
        staged: true,
        groupStatus: SessionGroupStatus.PENDING_MINIMUM,
        confirmationDeadline: deadline,
    };
}
