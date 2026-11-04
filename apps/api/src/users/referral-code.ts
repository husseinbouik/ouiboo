import { randomInt } from 'crypto';

// #777: zero-value referral — a personal code is only an attribution
// label for tracked sharing + recognition. It carries no value of any
// kind: it is not a credential, not redeemable, and never converts to
// anything stored or spendable.
const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateReferralCode(): string {
    let suffix = '';
    for (let i = 0; i < 10; i += 1) {
        suffix += REFERRAL_CODE_ALPHABET[randomInt(REFERRAL_CODE_ALPHABET.length)];
    }
    return `OUI-${suffix}`;
}

export function normalizeReferralCode(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().toUpperCase();
    return trimmed.length > 0 && trimmed.length <= 64 ? trimmed : null;
}
