/**
 * Beta badge gate (founder request, 2026-10-27): while Ouiboo is a closed
 * testing version, every app shows a small "BETA" pill next to the logo so
 * users never mistake it for the final release.
 *
 * Opposite polarity to the sharing gate (#468): the badge is ON by default
 * and is removed per app by setting NEXT_PUBLIC_BETA_BADGE to the exact
 * string 'false'. Anything else — unset, 'true', a typo — keeps the badge
 * visible, so a misconfigured launch environment still labels itself beta.
 * Public launch flips the flag in each app deliberately.
 */
export function isBetaBadgeEnabled(
  value: string | undefined = process.env.NEXT_PUBLIC_BETA_BADGE,
): boolean {
  return value !== 'false';
}
