/**
 * #566 (Council S3 P1-8): free-beta gate for agency money surfaces.
 *
 * The closed beta is completely free: no platform fee, no subscription,
 * no credits — and Ouiboo never holds traveller money (payments go
 * directly to the agency / its provider). Surfaces that present a
 * subscription, platform-fee invoices or a wallet balance contradict
 * that model, so in the beta build they render an honest "not in beta"
 * state instead.
 *
 * Polarity matches the beta badge (#552): the beta state is ON by
 * default and is lifted only by setting NEXT_PUBLIC_FREE_BETA to the
 * exact string 'false' — deliberately, per app, when monetisation
 * launches. Anything else (unset, a typo) keeps the honest beta state,
 * so a misconfigured launch build cannot show billing surfaces early.
 */
export function isFreeBeta(
  value: string | undefined = process.env.NEXT_PUBLIC_FREE_BETA,
): boolean {
  return value !== 'false';
}
