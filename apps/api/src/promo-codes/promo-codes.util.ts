import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { toMoneyDecimal } from '../common/money.util';

/**
 * #778 (Council S6 Phase 3): agency-funded promo codes.
 *
 * The agency funds 100% of the discount; Ouiboo never funds promotions
 * and never holds traveller money. All amounts are computed SERVER-side
 * from the agency's stored code — the client only sends the code text.
 *
 * The discount applies to the booking's FINAL total (the #695 pricing
 * selection total when a variant/add-on selection repriced the booking,
 * otherwise session price x guests, or the per-group private price):
 *
 *   PERCENT    -> discount = total x value / 100 (2dp)
 *   FIXED_MAD  -> discount = min(value, total)
 *   discounted = total - discount (floor 0)
 *
 * The result reconciles exactly: undiscountedTotal = discountAmount +
 * totalAmount. The staged-payment plan, the deposit cap, refunds and
 * the #698 service-fee base all derive from the resulting totalAmount,
 * so the discount is carried end-to-end from the single computation
 * point in BookingsService.create.
 */

export type PromoDiscountTypeValue = 'PERCENT' | 'FIXED_MAD';

export interface PromoCodeForBooking {
    id: string;
    agencyId: string;
    code: string;
    discountType: PromoDiscountTypeValue;
    discountValue: Prisma.Decimal | string | number;
    startsAt?: Date | string | null;
    endsAt?: Date | string | null;
    maxUses?: number | null;
    usedCount: number;
    isActive: boolean;
}

export interface PromoResolution {
    promoCodeId: string;
    /** Redemption cap captured at resolution time (null = unlimited);
     * the booking transaction re-checks it atomically on increment. */
    maxUses: number | null;
    code: string;
    discountType: PromoDiscountTypeValue;
    discountValue: string;
    undiscountedTotal: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
    snapshot: {
        code: string;
        discountType: PromoDiscountTypeValue;
        discountValue: string;
        undiscountedTotal: string;
        discountAmount: string;
        totalAmount: string;
        currency: string;
    };
}

/** Codes are matched case-insensitively; storage is trimmed upper-case. */
export function normalizePromoCode(raw: unknown): string {
    return typeof raw === 'string' ? raw.trim().toUpperCase() : '';
}

const INVALID_PROMO_MESSAGE = 'This promo code is not valid for this booking';

/**
 * Validate a stored code for a booking with the given agency at `now`.
 * Traveller-facing failures are deliberately generic (they do not leak
 * whether a code exists for another agency, is exhausted, or expired).
 */
export function assertPromoUsable(
    promo: PromoCodeForBooking,
    args: { agencyId: string; now?: Date },
): void {
    const now = args.now ?? new Date();
    if (promo.agencyId !== args.agencyId || !promo.isActive) {
        throw new BadRequestException(INVALID_PROMO_MESSAGE);
    }
    if (promo.startsAt && new Date(promo.startsAt).getTime() > now.getTime()) {
        throw new BadRequestException(INVALID_PROMO_MESSAGE);
    }
    if (promo.endsAt && new Date(promo.endsAt).getTime() < now.getTime()) {
        throw new BadRequestException(INVALID_PROMO_MESSAGE);
    }
    if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
        throw new BadRequestException(INVALID_PROMO_MESSAGE);
    }
    const value = toMoneyDecimal(promo.discountValue, 'discountValue');
    if (promo.discountType === 'PERCENT') {
        if (value.lessThanOrEqualTo(0) || value.greaterThan(100)) {
            throw new BadRequestException(INVALID_PROMO_MESSAGE);
        }
    } else if (value.lessThanOrEqualTo(0)) {
        throw new BadRequestException(INVALID_PROMO_MESSAGE);
    }
}

/** Pure discount math on an authoritative (server-computed) total. */
export function computePromoDiscount(
    undiscountedTotal: Prisma.Decimal,
    promo: Pick<PromoCodeForBooking, 'discountType' | 'discountValue'>,
): { discountAmount: Prisma.Decimal; totalAmount: Prisma.Decimal } {
    const total = toMoneyDecimal(undiscountedTotal, 'totalAmount');
    const value = toMoneyDecimal(promo.discountValue, 'discountValue');
    let discountAmount: Prisma.Decimal;
    if (promo.discountType === 'PERCENT') {
        discountAmount = total.mul(value).div(100).toDecimalPlaces(2);
    } else {
        discountAmount = Prisma.Decimal.min(value, total);
    }
    if (discountAmount.greaterThan(total)) {
        discountAmount = total;
    }
    if (discountAmount.lessThan(0)) {
        discountAmount = new Prisma.Decimal(0);
    }
    const totalAmount = total.sub(discountAmount).toDecimalPlaces(2);
    return { discountAmount: discountAmount.toDecimalPlaces(2), totalAmount };
}

/** Validate + price a promo against an authoritative total in one step. */
export function resolvePromoDiscount(args: {
    promo: PromoCodeForBooking;
    agencyId: string;
    undiscountedTotal: Prisma.Decimal;
    currency: string;
    now?: Date;
}): PromoResolution {
    assertPromoUsable(args.promo, { agencyId: args.agencyId, now: args.now });
    const undiscountedTotal = toMoneyDecimal(args.undiscountedTotal, 'totalAmount');
    const { discountAmount, totalAmount } = computePromoDiscount(undiscountedTotal, args.promo);
    const discountValue = toMoneyDecimal(args.promo.discountValue, 'discountValue').toFixed(2);
    return {
        promoCodeId: args.promo.id,
        maxUses: args.promo.maxUses ?? null,
        code: args.promo.code,
        discountType: args.promo.discountType,
        discountValue,
        undiscountedTotal,
        discountAmount,
        totalAmount,
        snapshot: {
            code: args.promo.code,
            discountType: args.promo.discountType,
            discountValue,
            undiscountedTotal: undiscountedTotal.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            currency: args.currency,
        },
    };
}

/** API serializer: money/dates leave as strings, like the rest of the API. */
export function serializePromoCode(row: {
    id: string;
    agencyId: string;
    code: string;
    discountType: string;
    discountValue: unknown;
    startsAt?: Date | string | null;
    endsAt?: Date | string | null;
    maxUses?: number | null;
    usedCount: number;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}) {
    return {
        id: row.id,
        agencyId: row.agencyId,
        code: row.code,
        discountType: row.discountType,
        discountValue: toMoneyDecimal(row.discountValue as never, 'discountValue').toFixed(2),
        startsAt: row.startsAt ? new Date(row.startsAt).toISOString() : null,
        endsAt: row.endsAt ? new Date(row.endsAt).toISOString() : null,
        maxUses: row.maxUses ?? null,
        usedCount: row.usedCount,
        isActive: row.isActive,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
    };
}
