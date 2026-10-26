/**
 * #415 (Council P0-08): client-side mirror of the API's shared derivation
 * in `apps/api/src/common/agency-licence.util.ts`.
 *
 * `GET /users/me` returns the raw stored statuses, so the agency app
 * derives the effective licence / RC-insurance status on read exactly
 * like the API gates do: a VERIFIED artefact whose expiry has passed is
 * effectively EXPIRED, and a VERIFIED artefact with no usable expiry
 * reads as PENDING_REVIEW (never verified-forever). Keep this in sync
 * with the API util — the gates and this UI must never disagree.
 */

export type ArtefactStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED';

export type LicenceProfileLike = {
  travelLicenceStatus?: string | null;
  licenceExpiry?: string | null;
};

export type InsuranceProfileLike = {
  insuranceStatus?: string | null;
  insuranceExpiry?: string | null;
};

function parseExpiry(expiry: string | null | undefined): Date | null {
  if (!expiry) {
    return null;
  }
  const parsed = new Date(expiry);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function effectiveArtefactStatus(
  storedRaw: string | null | undefined,
  expiry: string | null | undefined,
  now: Date = new Date(),
): ArtefactStatus {
  const stored = (storedRaw ?? 'NOT_SUBMITTED') as ArtefactStatus;
  if (stored !== 'VERIFIED') {
    return stored;
  }
  const parsedExpiry = parseExpiry(expiry);
  if (!parsedExpiry) {
    return 'PENDING_REVIEW';
  }
  if (parsedExpiry.getTime() <= now.getTime()) {
    return 'EXPIRED';
  }
  return 'VERIFIED';
}

export function effectiveLicenceStatus(
  profile: LicenceProfileLike | undefined,
  now: Date = new Date(),
): ArtefactStatus {
  return effectiveArtefactStatus(profile?.travelLicenceStatus, profile?.licenceExpiry, now);
}

export function effectiveInsuranceStatus(
  profile: InsuranceProfileLike | undefined,
  now: Date = new Date(),
): ArtefactStatus {
  return effectiveArtefactStatus(profile?.insuranceStatus, profile?.insuranceExpiry, now);
}

export type ActivationProfileLike = LicenceProfileLike &
  InsuranceProfileLike & {
    verificationStatus?: string | null;
  };

/**
 * The single artefact that blocks activation, in the API gate's check
 * order (identity → licence → insurance). `status` is the effective
 * artefact status for licence/insurance blocks; identity has no artefact
 * lifecycle, so it reports the raw mismatch as 'UNVERIFIED'.
 */
export type ActivationBlock =
  | { artefact: 'identity'; status: 'UNVERIFIED' }
  | { artefact: 'licence'; status: ArtefactStatus }
  | { artefact: 'insurance'; status: ArtefactStatus };

export type AgencyActivationState = {
  /** True only when the API gate (`getAgencyActivationBlock`) would pass. */
  fullyVerified: boolean;
  licenceStatus: ArtefactStatus;
  insuranceStatus: ArtefactStatus;
  /** The first blocking artefact, or null when fully verified. */
  block: ActivationBlock | null;
};

/**
 * #415: ONE client-side derivation of the agency's activation state,
 * mirroring the API's `getAgencyActivationBlock`. Every surface that
 * talks about verification (dashboard headline, onboarding header, trip
 * pages) must read this — never `verificationStatus` alone — so the UI
 * can never claim "verified" while the gate would still 403 a publish
 * or a payment activation. The gate applies to transitions only; it
 * never retroactively blocks trips that are already ACTIVE.
 */
export function getAgencyActivationState(
  profile: ActivationProfileLike | undefined,
  now: Date = new Date(),
): AgencyActivationState {
  const licenceStatus = effectiveLicenceStatus(profile, now);
  const insuranceStatus = effectiveInsuranceStatus(profile, now);
  let block: ActivationBlock | null = null;
  if (profile?.verificationStatus !== 'VERIFIED') {
    block = { artefact: 'identity', status: 'UNVERIFIED' };
  } else if (licenceStatus !== 'VERIFIED') {
    block = { artefact: 'licence', status: licenceStatus };
  } else if (insuranceStatus !== 'VERIFIED') {
    block = { artefact: 'insurance', status: insuranceStatus };
  }
  return { fullyVerified: block === null, licenceStatus, insuranceStatus, block };
}

/** i18n key for the short artefact label, e.g. "RC insurance". */
export function activationBlockArtefactKey(block: ActivationBlock): string {
  return `verification.artefact.${block.artefact}`;
}

/**
 * i18n key for the sentence naming the blocking artefact and its state.
 * Licence/insurance reuse the onboarding per-artefact status copy, which
 * already names the artefact and what to do about it in every locale.
 */
export function activationBlockMessageKey(block: ActivationBlock): string {
  if (block.artefact === 'identity') {
    return 'verification.block.identity';
  }
  return `onboarding.${block.artefact}.status.${block.status}`;
}

export type VerificationPause = {
  paused: boolean;
  licenceExpired: boolean;
  insuranceExpired: boolean;
};

/**
 * #415: the expiry sweep stamps `verificationPausedAt` when it persists
 * an EXPIRED artefact and pauses the agency's ACTIVE trips. Between the
 * expiry moment and the daily sweep the stamp may not exist yet, so the
 * derived EXPIRED statuses pause the agency here too.
 */
export function getVerificationPause(
  profile:
    | (LicenceProfileLike &
        InsuranceProfileLike & { verificationPausedAt?: string | null })
    | undefined,
  now: Date = new Date(),
): VerificationPause {
  const licenceExpired = effectiveLicenceStatus(profile, now) === 'EXPIRED';
  const insuranceExpired = effectiveInsuranceStatus(profile, now) === 'EXPIRED';
  return {
    paused: Boolean(profile?.verificationPausedAt) || licenceExpired || insuranceExpired,
    licenceExpired,
    insuranceExpired,
  };
}
