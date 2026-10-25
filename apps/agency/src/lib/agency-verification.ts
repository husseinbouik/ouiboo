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
