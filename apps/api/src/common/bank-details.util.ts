/**
 * #421 (Council P0-19): a traveller may only ever see an agency bank
 * destination that an admin has verified against a bank attestation.
 *
 * `bankDetails` (the live instructions) is written ONLY by the admin
 * verify endpoint when it promotes a reviewed submission, so a live
 * value under a VERIFIED status is the normal serve condition. While a
 * replacement submission is under review (PENDING_REVIEW) the
 * previously verified instructions stay live — detected via the
 * verification stamp — so editing bank details never takes a verified
 * destination offline mid-review.
 */
export interface BankDestinationFields {
    bankDetails?: string | null;
    bankDetailsStatus?: string | null;
    bankDetailsVerifiedAt?: Date | string | null;
}

export function isBankDestinationVerified(
    agency?: BankDestinationFields | null,
): boolean {
    if (!agency) return false;
    if (agency.bankDetailsStatus === 'VERIFIED') return true;
    return (
        agency.bankDetailsStatus === 'PENDING_REVIEW' &&
        !!agency.bankDetailsVerifiedAt
    );
}

/**
 * The live bank instructions when the destination is verified,
 * otherwise null. Every traveller-facing surface must go through this
 * so unverified free text can never leak into trip/checkout/payment
 * responses.
 */
export function visibleBankDetails(
    agency?: BankDestinationFields | null,
): string | null {
    if (!isBankDestinationVerified(agency)) return null;
    return agency?.bankDetails ?? null;
}
