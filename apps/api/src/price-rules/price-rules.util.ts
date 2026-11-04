import { Prisma } from '@ouiboo/database';
import { toMoneyDecimal } from '../common/money.util';
import { computePromoDiscount, type PromoDiscountTypeValue } from '../promo-codes/promo-codes.util';

/**
 * #755: campaign/session pricing — the delta over #778 promo codes.
 *
 * A SessionPriceRule is an agency-owned price rule applied to bookings
 * AUTOMATICALLY (no code for the traveller to enter), scoped to one
 * trip template or to one specific session. The agency funds 100% of
 * the discount; Ouiboo never funds it and never holds traveller money.
 * All math is server-side Decimal on the booking's authoritative total,
 * reusing the #778 discount math so a rule and a code price identically.
 *
 * Semantics that differ from promo codes — deliberately:
 * - A rule that is out of window, exhausted, over budget, or scoped to
 *   another trip/session is simply NOT APPLIED. A booking never fails
 *   because a campaign ended; it just prices without it.
 * - Stackability: a rule applies alongside a promo code ONLY when the
 *   rule says so (`stacksWithPromoCode`). Otherwise a booking that uses
 *   a code prices from the code alone.
 * - Selection: a session-scoped rule beats a template-scoped one; ties
 *   break by earliest creation, so the outcome is deterministic.
 * - Budget: the granted discount is capped at the remaining budget
 *   (partial grant at the boundary), and `discountGranted` tracks the
 *   total granted so the cap is auditable on the rule itself.
 */

export interface SessionPriceRuleForBooking {
    id: string;
    agencyId: string;
    templateId?: string | null;
    sessionId?: string | null;
    name: string;
    discountType: PromoDiscountTypeValue;
    discountValue: Prisma.Decimal | string | number;
    startsAt?: Date | string | null;
    endsAt?: Date | string | null;
    maxUses?: number | null;
    usedCount: number;
    budgetCap?: Prisma.Decimal | string | number | null;
    discountGranted?: Prisma.Decimal | string | number | null;
    stacksWithPromoCode: boolean;
    isActive: boolean;
    createdAt?: Date | string | null;
}

export interface PriceRuleResolution {
    ruleId: string;
    maxUses: number | null;
    /** Remaining-budget ceiling for the atomic claim (null = no cap). */
    budgetClaimCeiling: Prisma.Decimal | null;
    name: string;
    scope: 'SESSION' | 'TEMPLATE';
    discountType: PromoDiscountTypeValue;
    discountValue: string;
    stacksWithPromoCode: boolean;
    baseTotal: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    snapshot: {
        ruleId: string;
        name: string;
        scope: 'SESSION' | 'TEMPLATE';
        discountType: PromoDiscountTypeValue;
        discountValue: string;
        stacksWithPromoCode: boolean;
        baseTotal: string;
        discountAmount: string;
        totalAmount: string;
        currency: string;
    };
}

function ruleScope(rule: SessionPriceRuleForBooking): 'SESSION' | 'TEMPLATE' {
    return rule.sessionId ? 'SESSION' : 'TEMPLATE';
}

function scopeMatches(
    rule: SessionPriceRuleForBooking,
    args: { templateId: string; sessionId: string },
): boolean {
    if (rule.sessionId) return rule.sessionId === args.sessionId;
    if (rule.templateId) return rule.templateId === args.templateId;
    return false;
}

/**
 * Pick the winning rule for a booking, or null when none applies.
 * Pure + deterministic; never throws — an unusable campaign is skipped,
 * never an error (see the header note).
 */
export function selectPriceRule(
    rules: SessionPriceRuleForBooking[],
    args: { agencyId: string; templateId: string; sessionId: string; now?: Date },
): SessionPriceRuleForBooking | null {
    const now = args.now ?? new Date();
    const usable = rules.filter((rule) => {
        if (rule.agencyId !== args.agencyId || !rule.isActive) return false;
        if (!scopeMatches(rule, args)) return false;
        if (rule.startsAt && new Date(rule.startsAt).getTime() > now.getTime()) return false;
        if (rule.endsAt && new Date(rule.endsAt).getTime() < now.getTime()) return false;
        if (rule.maxUses != null && rule.usedCount >= rule.maxUses) return false;
        const value = toMoneyDecimal(rule.discountValue, 'discountValue');
        if (rule.discountType === 'PERCENT') {
            if (value.lessThanOrEqualTo(0) || value.greaterThan(100)) return false;
        } else if (value.lessThanOrEqualTo(0)) {
            return false;
        }
        return true;
    });
    usable.sort((a, b) => {
        const scopeOrder = (r: SessionPriceRuleForBooking) => (r.sessionId ? 0 : 1);
        if (scopeOrder(a) !== scopeOrder(b)) return scopeOrder(a) - scopeOrder(b);
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (at !== bt) return at - bt;
        return a.id.localeCompare(b.id);
    });
    return usable[0] ?? null;
}

/**
 * Price the selected rule against the authoritative base total,
 * capping the grant at the remaining budget. Returns null when the
 * remaining budget is exhausted (the campaign silently ends).
 */
export function resolvePriceRuleDiscount(args: {
    rule: SessionPriceRuleForBooking;
    baseTotal: Prisma.Decimal;
    currency: string;
}): PriceRuleResolution | null {
    const baseTotal = toMoneyDecimal(args.baseTotal, 'totalAmount');
    const { discountAmount: computed } = computePromoDiscount(baseTotal, args.rule);
    let discountAmount = computed;
    let budgetClaimCeiling: Prisma.Decimal | null = null;
    if (args.rule.budgetCap != null) {
        const cap = toMoneyDecimal(args.rule.budgetCap, 'budgetCap');
        const granted = args.rule.discountGranted != null
            ? toMoneyDecimal(args.rule.discountGranted, 'discountGranted')
            : new Prisma.Decimal(0);
        const remaining = cap.sub(granted);
        if (remaining.lessThanOrEqualTo(0)) return null;
        if (discountAmount.greaterThan(remaining)) {
            discountAmount = remaining.toDecimalPlaces(2);
        }
        // The claim may proceed only while discountGranted stays at or
        // below (cap - this grant) — checked atomically in the booking
        // transaction, mirroring the #778 usage-cap claim.
        budgetClaimCeiling = cap.sub(discountAmount);
    }
    if (discountAmount.lessThanOrEqualTo(0)) return null;
    const totalAmount = baseTotal.sub(discountAmount).toDecimalPlaces(2);
    const discountValue = toMoneyDecimal(args.rule.discountValue, 'discountValue').toFixed(2);
    return {
        ruleId: args.rule.id,
        maxUses: args.rule.maxUses ?? null,
        budgetClaimCeiling,
        name: args.rule.name,
        scope: ruleScope(args.rule),
        discountType: args.rule.discountType,
        discountValue,
        stacksWithPromoCode: Boolean(args.rule.stacksWithPromoCode),
        baseTotal,
        discountAmount: discountAmount.toDecimalPlaces(2),
        totalAmount,
        snapshot: {
            ruleId: args.rule.id,
            name: args.rule.name,
            scope: ruleScope(args.rule),
            discountType: args.rule.discountType,
            discountValue,
            stacksWithPromoCode: Boolean(args.rule.stacksWithPromoCode),
            baseTotal: baseTotal.toFixed(2),
            discountAmount: discountAmount.toDecimalPlaces(2).toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            currency: args.currency,
        },
    };
}

/** API serializer for agency rule management. */
export function serializeSessionPriceRule(row: SessionPriceRuleForBooking & { createdAt: Date | string; updatedAt: Date | string }) {
    return {
        id: row.id,
        agencyId: row.agencyId,
        templateId: row.templateId ?? null,
        sessionId: row.sessionId ?? null,
        name: row.name,
        discountType: row.discountType,
        discountValue: toMoneyDecimal(row.discountValue as never, 'discountValue').toFixed(2),
        startsAt: row.startsAt ? new Date(row.startsAt).toISOString() : null,
        endsAt: row.endsAt ? new Date(row.endsAt).toISOString() : null,
        maxUses: row.maxUses ?? null,
        usedCount: row.usedCount,
        budgetCap: row.budgetCap != null ? toMoneyDecimal(row.budgetCap as never, 'budgetCap').toFixed(2) : null,
        discountGranted: row.discountGranted != null ? toMoneyDecimal(row.discountGranted as never, 'discountGranted').toFixed(2) : '0.00',
        stacksWithPromoCode: Boolean(row.stacksWithPromoCode),
        isActive: row.isActive,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
    };
}
