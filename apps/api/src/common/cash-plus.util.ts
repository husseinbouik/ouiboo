/**
 * #988: Cash Plus manual payment destination — the #421 bank-details
 * pattern applied to a second manual channel. A traveller may only ever
 * see Cash Plus infos that an admin has verified, and only while the
 * agency keeps the Cash Plus toggle on.
 *
 * `cashPlusBeneficiaryName` / `cashPlusPhone` (the live instructions)
 * are written ONLY by the admin verify endpoint when it promotes a
 * reviewed submission, so live values under a VERIFIED status are the
 * normal serve condition. While a replacement submission is under
 * review (PENDING_REVIEW) the previously verified infos stay live —
 * detected via the verification stamp — so editing Cash Plus infos
 * never takes a verified destination offline mid-review.
 */
export interface CashPlusDestinationFields {
    cashPlusBeneficiaryName?: string | null;
    cashPlusPhone?: string | null;
    cashPlusEnabled?: boolean | null;
    cashPlusStatus?: string | null;
    cashPlusVerifiedAt?: Date | string | null;
}

export function isCashPlusDestinationVerified(
    agency?: CashPlusDestinationFields | null,
): boolean {
    if (!agency) return false;
    if (agency.cashPlusStatus === 'VERIFIED') return true;
    return (
        agency.cashPlusStatus === 'PENDING_REVIEW' &&
        !!agency.cashPlusVerifiedAt
    );
}

/**
 * The live Cash Plus destination when it is verified AND enabled,
 * otherwise null. Every traveller-facing surface must go through this
 * so unverified (or disabled) Cash Plus infos can never leak into
 * trip/checkout/payment responses.
 */
export function visibleCashPlus(
    agency?: CashPlusDestinationFields | null,
): { beneficiaryName: string; phone: string } | null {
    if (!agency || agency.cashPlusEnabled !== true) return null;
    if (!isCashPlusDestinationVerified(agency)) return null;
    const beneficiaryName = agency.cashPlusBeneficiaryName?.trim();
    const phone = agency.cashPlusPhone?.trim();
    if (!beneficiaryName || !phone) return null;
    return { beneficiaryName, phone };
}
