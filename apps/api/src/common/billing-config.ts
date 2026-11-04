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
    /**
     * #426 (Council P0-10): TVA rate percent applied to the platform
     * service fee and the subscription. 20% is the council's working
     * assumption PENDING WRITTEN CONFIRMATION from the expert-comptable
     * (no source classifies a marketplace fee expressly) — configurable
     * via OUIBOO_VAT_RATE_PERCENT, never hard-coded at call sites.
     */
    vatRatePercent: number;
    /**
     * #426: monthly subscription price HT in MAD, or null when no price
     * has been decided/configured. Null = the subscription invoicing
     * path exists but charges nothing (the price is undecided, exactly
     * as the council recorded); set OUIBOO_SUBSCRIPTION_PRICE_HT_MAD
     * when the first paid month is priced.
     */
    subscriptionMonthlyPriceHt: number | null;
    /** #426: the fee trigger rule in force (Debate 5 terminal retained-value). */
    serviceFeeTrigger: 'TERMINAL_RETAINED_VALUE';
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
        vatRatePercent: (() => {
            const raw = Number(env.OUIBOO_VAT_RATE_PERCENT);
            return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : 20;
        })(),
        subscriptionMonthlyPriceHt: (() => {
            const raw = Number(env.OUIBOO_SUBSCRIPTION_PRICE_HT_MAD);
            return Number.isFinite(raw) && raw > 0 ? raw : null;
        })(),
        // #426 supersedes the #698 completed-only trigger with the
        // Debate 5 rule: fee on a terminal retained-value event
        // (completion / charge-retaining traveller cancellation /
        // traveller no-show), base = verified paid minus refunds
        // completed. serviceFeeOnCompletedOnly above stays readable for
        // the #698 witness surface; InvoicesService no longer reads it.
        serviceFeeTrigger: 'TERMINAL_RETAINED_VALUE',
    };
}

/** Statuses excluded from fee accrual under the current config (for tests/witness). */
export function isBillableBookingStatus(status: string, config: BillingConfig = getBillingConfig()): boolean {
    if (!config.serviceFeeOnCompletedOnly) return true;
    return config.serviceFeeBookingStatuses.includes(status);
}
