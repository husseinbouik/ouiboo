import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@ouiboo/database';
import { toMoneyDecimal } from '../common/money.util';

/**
 * #695 (Council S6): agency-priced variants + paid add-ons.
 *
 * All amounts are computed SERVER-side from the agency's stored prices —
 * the client only selects ids and quantities. The result reconciles to
 * the booking total exactly:
 *
 *   total = variantBase + addOnsTotal
 *   variantBase = no variant  -> session price x guests
 *               | PER_PERSON  -> variant price x guests
 *               | PER_GROUP   -> variant price
 *               | PER_VEHICLE -> variant price x ceil(guests / unitSize)
 *   add-on line = PER_PERSON  -> price x guests x quantity
 *               | PER_BOOKING -> price x quantity
 *
 * The snapshot is persisted on the booking; the staged-payment plan,
 * the deposit cap and the cancellation snapshot all derive from the
 * resulting totalAmount, so the selection is carried end-to-end.
 */

export type PricingUnitValue = 'PER_PERSON' | 'PER_GROUP' | 'PER_VEHICLE';
export type AddOnPricingUnitValue = 'PER_PERSON' | 'PER_BOOKING';

export interface VariantForPricing {
    id: string;
    name: unknown;
    pricingUnit: PricingUnitValue;
    unitSize: number;
    price: Prisma.Decimal | string | number;
    currency: string;
    isActive: boolean;
}

export interface AddOnForPricing {
    id: string;
    name: unknown;
    pricingUnit: AddOnPricingUnitValue;
    price: Prisma.Decimal | string | number;
    currency: string;
    isActive: boolean;
}

export interface AddOnSelectionInput {
    addOnId: string;
    quantity?: number;
}

export interface PricingSelectionResult {
    snapshot: {
        variant: {
            id: string;
            name: unknown;
            pricingUnit: PricingUnitValue;
            unitSize: number;
            unitPrice: string;
            units: number;
            amount: string;
        } | null;
        addOns: Array<{
            id: string;
            name: unknown;
            pricingUnit: AddOnPricingUnitValue;
            unitPrice: string;
            quantity: number;
            amount: string;
        }>;
        baseAmount: string;
        addOnsTotal: string;
        totalAmount: string;
        currency: string;
        guestsCount: number;
    };
    totalAmount: Prisma.Decimal;
}

export function variantUnits(variant: VariantForPricing, guestsCount: number): number {
    switch (variant.pricingUnit) {
        case 'PER_GROUP':
            return 1;
        case 'PER_VEHICLE': {
            const size = Number.isInteger(variant.unitSize) && variant.unitSize > 0 ? variant.unitSize : 1;
            return Math.max(1, Math.ceil(guestsCount / size));
        }
        case 'PER_PERSON':
        default:
            return guestsCount;
    }
}

export function resolvePricingSelection(args: {
    sessionPrice: Prisma.Decimal | string | number;
    currency: string;
    guestsCount: number;
    variant?: VariantForPricing | null;
    addOns?: Array<{ addOn: AddOnForPricing; quantity: number }>;
}): PricingSelectionResult {
    const { guestsCount, currency } = args;
    if (!Number.isInteger(guestsCount) || guestsCount < 1) {
        throw new BadRequestException('guestsCount must be a positive integer');
    }

    let baseAmount: Prisma.Decimal;
    let variantSnapshot: PricingSelectionResult['snapshot']['variant'] = null;
    if (args.variant) {
        const variant = args.variant;
        if (!variant.isActive) {
            throw new BadRequestException('The selected pricing option is not available');
        }
        if (variant.currency && variant.currency !== currency) {
            throw new BadRequestException('The selected pricing option is not available in this currency');
        }
        const units = variantUnits(variant, guestsCount);
        const unitPrice = toMoneyDecimal(variant.price, 'variantPrice');
        baseAmount = unitPrice.mul(units).toDecimalPlaces(2);
        variantSnapshot = {
            id: variant.id,
            name: variant.name ?? null,
            pricingUnit: variant.pricingUnit,
            unitSize: variant.unitSize,
            unitPrice: unitPrice.toFixed(2),
            units,
            amount: baseAmount.toFixed(2),
        };
    } else {
        baseAmount = toMoneyDecimal(args.sessionPrice, 'sessionPrice')
            .mul(guestsCount)
            .toDecimalPlaces(2);
    }

    const addOnLines: PricingSelectionResult['snapshot']['addOns'] = [];
    let addOnsTotal = new Prisma.Decimal(0);
    for (const { addOn, quantity } of args.addOns ?? []) {
        if (!addOn.isActive) {
            throw new BadRequestException('A selected add-on is not available');
        }
        if (addOn.currency && addOn.currency !== currency) {
            throw new BadRequestException('A selected add-on is not available in this currency');
        }
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
            throw new BadRequestException('Add-on quantity must be between 1 and 50');
        }
        const unitPrice = toMoneyDecimal(addOn.price, 'addOnPrice');
        const factor = addOn.pricingUnit === 'PER_PERSON' ? guestsCount * quantity : quantity;
        const amount = unitPrice.mul(factor).toDecimalPlaces(2);
        addOnsTotal = addOnsTotal.add(amount);
        addOnLines.push({
            id: addOn.id,
            name: addOn.name ?? null,
            pricingUnit: addOn.pricingUnit,
            unitPrice: unitPrice.toFixed(2),
            quantity,
            amount: amount.toFixed(2),
        });
    }

    const totalAmount = baseAmount.add(addOnsTotal).toDecimalPlaces(2);
    return {
        totalAmount,
        snapshot: {
            variant: variantSnapshot,
            addOns: addOnLines,
            baseAmount: baseAmount.toFixed(2),
            addOnsTotal: addOnsTotal.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
            currency,
            guestsCount,
        },
    };
}

/** Serializers: Decimal prices leave the API as fixed-2 strings. */
export function serializePricingVariant(v: any) {
    if (!v) return v;
    return { ...v, price: toMoneyDecimal(v.price, 'variantPrice').toFixed(2) };
}
export function serializeAddOn(a: any) {
    if (!a) return a;
    return { ...a, price: toMoneyDecimal(a.price, 'addOnPrice').toFixed(2) };
}
