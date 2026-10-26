/**
 * Builds the absolute payment-proof download URL stored on the booking
 * (`paymentProofUrl`) and returned with an uploaded proof.
 *
 * `API_URL` is configured inconsistently across environments: staging sets
 * it to the bare API origin (no path suffix), while local development
 * includes the `/api/v1` prefix. Concatenating blindly therefore produced
 * either a platform-404 URL (`<origin>/bookings/...`, missing the version
 * prefix) or a doubled prefix. Normalize here so the result is always
 * `<api-base>/api/v1/bookings/<id>/payment-proof/download`.
 */
export function resolvePaymentProofDownloadUrl(
    bookingId: string,
    apiUrl?: string | null,
): string {
    const fallback = 'http://localhost:3000/api/v1';
    const trimmed = (apiUrl ?? '').trim().replace(/\/+$/, '');
    const base = trimmed || fallback;
    const versioned = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
    return `${versioned}/bookings/${bookingId}/payment-proof/download`;
}
