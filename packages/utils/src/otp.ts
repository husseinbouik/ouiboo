/**
 * #492: shared logic for the segmented one-time-code inputs (traveller
 * and agency email verification). Kept in @ouiboo/utils so both apps
 * behave identically — and so the behaviour is unit-tested in one
 * place instead of duplicated per page.
 */

export interface OtpDistribution {
    /** The next code state (same length as the input array). */
    code: string[];
    /** Box that should receive focus after the change. */
    nextFocusIndex: number;
}

/**
 * Apply a raw input value to the segmented code.
 *
 * A single typed digit writes into the target box (overwriting any
 * digit already there) and advances focus. A multi-digit value — an
 * OS one-time-code autofill or a paste — is distributed across the
 * boxes starting at the target box; digits that would run past the
 * last box are dropped. Non-digit characters are stripped first.
 *
 * Returns null when the value carries no digit (nothing to apply).
 */
export function distributeOtpInput(
    current: readonly string[],
    startIndex: number,
    rawValue: string,
): OtpDistribution | null {
    const digits = rawValue.replace(/\D/g, '');
    if (!digits) return null;

    const next = [...current];
    const writable = digits.slice(0, next.length - startIndex);
    writable.split('').forEach((digit, offset) => {
        next[startIndex + offset] = digit;
    });

    return {
        code: next,
        nextFocusIndex: Math.min(startIndex + writable.length, next.length - 1),
    };
}
