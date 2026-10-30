/**
 * #698 (Council S6): post-beta pricing restructure — billing CONFIGURATION.
 *
 * The codebase previously had no billing-config surface at all: the
 * subscription was status-only (TRIAL/ACTIVE) and the monthly invoice
 * billed every PAID booking confirmed in the period. This module is the
 * minimal config surface the council decision specifies:
 *
 * 1. FREE_TIER_PUBLISHABLE (default true): the Free tier is genuinely
 *    publishable — an agency on the FREE tier may publish trips; there
 *    is no paywall on publishing. Read by the SubscriptionGuard.
 * 2. SERVICE_FEE_ON_COMPLETED_ONLY (default true): the per-booking
 *    service fee (charged TO THE AGENCY, invoiced monthly, never
 *    deducted from traveller payments) accrues only on bookings whose
 *    status is COMPLETED. Read by InvoicesService.
 * 3. BETA_COHORT_GRANDFATHER_MONTHS (default 12): the closed-beta cohort
 *    is grandfathered — Pro free for this many months (the horizon is
 *    stamped per agency in AgencyProfile.grandfatheredUntil; the
 *    agreement-draft clause says the same).
 *
 * Everything is env-overridable so the first paid month can be tuned
 * without a code change; the defaults ARE the council decision.
 */

export interface BillingConfig {
    freeTierPublishable: boolean;
    serviceFeeOnCompletedOnly: boolean;
    betaCohortGrandfatherMonths: number;
    /** Booking statuses the per-booking service fee accrues on. */
    serviceFeeBookingStatuses: string[];
}

function envBool(name: string, fallback: boolean, env: NodeJS.ProcessEnv = process.env): boolean {
    const raw = env[name]?.trim().toLowerCase();
    if (raw === undefined || raw === '') return fallback;
    if (raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    return fallback;
}

export function getBillingConfig(env: NodeJS.ProcessEnv = process.env): BillingConfig {
    const serviceFeeOnCompletedOnly = envBool('OUIBOO_SERVICE_FEE_ON_COMPLETED_ONLY', true, env);
    const monthsRaw = Number(env.OUIBOO_BETA_COHORT_GRANDFATHER_MONTHS);
    return {
        freeTierPublishable: envBool('OUIBOO_FREE_TIER_PUBLISHABLE', true, env),
        serviceFeeOnCompletedOnly,
        betaCohortGrandfatherMonths:
            Number.isFinite(monthsRaw) && monthsRaw > 0 ? Math.floor(monthsRaw) : 12,
        // With the flag on, ONLY completed bookings accrue the fee.
        // With it explicitly off, the legacy rule returns (any PAID
        // booking) — kept representable, never the default.
        serviceFeeBookingStatuses: serviceFeeOnCompletedOnly ? ['COMPLETED'] : [],
    };
}

/** Statuses excluded from fee accrual under the current config (for tests/witness). */
export function isBillableBookingStatus(status: string, config: BillingConfig = getBillingConfig()): boolean {
    if (!config.serviceFeeOnCompletedOnly) return true;
    return config.serviceFeeBookingStatuses.includes(status);
}
