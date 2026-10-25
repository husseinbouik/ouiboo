/**
 * #371: shared Law 11-16 travel-licence logic for AgencyProfile.
 * #415 (Council P0-08): same derivation for the RC insurance artefact,
 * plus the null-expiry fix and the ODV/DV organise rule.
 *
 * The licence lifecycle is stored in `travelLicenceStatus`, but expiry is
 * derived on read: a VERIFIED licence whose `licenceExpiry` has passed is
 * effectively EXPIRED even if the stored value still says VERIFIED. This
 * keeps expiry correct without a cron job; an admin action or a future
 * monitoring job may also persist EXPIRED explicitly.
 *
 * #415 null-expiry fix: a VERIFIED licence with NO expiry on file must
 * not read as verified forever (the pre-#415 behaviour). Expiry is
 * mandatory at verification time in the admin endpoint, and on read a
 * null/invalid expiry downgrades VERIFIED to PENDING_REVIEW (submitted,
 * but not currently provable as valid). Stored rows are never rewritten
 * by this derivation — already-verified agencies are not retroactively
 * un-verified in the database; the derivation only stops treating a
 * missing expiry as proof of validity.
 *
 * Activation gate: an agency may publish trips or activate payments only
 * when BOTH its identity (`verificationStatus`) and its travel licence
 * are verified and the licence has not expired. Existing ACTIVE trips of
 * already-verified agencies are never retroactively blocked — the gate
 * applies to transitions (publish / restore / payment activation).
 * Insurance gating helpers are provided here for the later gate/sweep
 * PRs; they are not yet wired into the activation gate.
 */

export type LicenceProfileLike = {
    travelLicenceStatus?: string | null;
    licenceExpiry?: Date | string | null;
};

export type InsuranceProfileLike = {
    insuranceStatus?: string | null;
    insuranceExpiry?: Date | string | null;
};

export type AgencyActivationProfile = LicenceProfileLike & {
    verificationStatus?: string | null;
    travelLicenceType?: string | null;
};

export type EffectiveLicenceStatus =
    | 'NOT_SUBMITTED'
    | 'PENDING_REVIEW'
    | 'VERIFIED'
    | 'REJECTED'
    | 'EXPIRED';

export type EffectiveInsuranceStatus = EffectiveLicenceStatus;

function parseExpiry(expiry: Date | string | null | undefined): Date | null {
    if (!expiry) {
        return null;
    }
    const parsed = expiry instanceof Date ? expiry : new Date(expiry);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Shared stored-status + expiry derivation used by both the licence and
 * the insurance artefact: past expiry → EXPIRED; VERIFIED without a
 * usable expiry → PENDING_REVIEW (never verified-forever); anything else
 * passes through.
 */
function deriveEffectiveStatus(
    storedRaw: string | null | undefined,
    expiry: Date | string | null | undefined,
    now: Date,
): EffectiveLicenceStatus {
    const stored = (storedRaw ?? 'NOT_SUBMITTED') as EffectiveLicenceStatus;
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
    profile: LicenceProfileLike,
    now: Date = new Date(),
): EffectiveLicenceStatus {
    return deriveEffectiveStatus(profile.travelLicenceStatus, profile.licenceExpiry, now);
}

export function isLicenceVerified(profile: LicenceProfileLike, now: Date = new Date()): boolean {
    return effectiveLicenceStatus(profile, now) === 'VERIFIED';
}

export function effectiveInsuranceStatus(
    profile: InsuranceProfileLike,
    now: Date = new Date(),
): EffectiveInsuranceStatus {
    return deriveEffectiveStatus(profile.insuranceStatus, profile.insuranceExpiry, now);
}

export function isInsuranceVerified(profile: InsuranceProfileLike, now: Date = new Date()): boolean {
    return effectiveInsuranceStatus(profile, now) === 'VERIFIED';
}

/**
 * #415: Law 11-16 licence types — an ODV (organisateur de voyages) may
 * organise trips; a DV (distributeur de voyages) distributes other
 * organisers' trips and may NOT organise its own. Pure helper for the
 * later gate PRs (trip create/publish); not wired into any gate yet.
 */
export function canOrganise(profile: { travelLicenceType?: string | null }): boolean {
    return profile.travelLicenceType === 'ODV';
}

/**
 * Returns a human-readable reason when the agency's RC insurance blocks
 * it, or null when the insurance is verified and unexpired. Provided for
 * the later gate/sweep PRs; not yet called by any gate.
 */
export function getAgencyInsuranceBlock(
    profile: InsuranceProfileLike,
    now: Date = new Date(),
): string | null {
    const insurance = effectiveInsuranceStatus(profile, now);
    if (insurance === 'EXPIRED') {
        return 'Agency RC insurance has expired and must be renewed and re-verified';
    }
    if (insurance !== 'VERIFIED') {
        return 'Agency RC insurance must be submitted and verified';
    }
    return null;
}

/**
 * Returns a human-readable reason when the agency is blocked from
 * publishing trips or activating payments, or null when it may proceed.
 * Callers throw their idiomatic exception (Forbidden/BadRequest) with it.
 */
export function getAgencyActivationBlock(
    profile: AgencyActivationProfile,
    now: Date = new Date(),
): string | null {
    if (profile.verificationStatus !== 'VERIFIED') {
        return 'Agency identity must be verified before trips can be published or payments activated';
    }
    const licence = effectiveLicenceStatus(profile, now);
    if (licence === 'EXPIRED') {
        return 'Agency travel licence has expired and must be renewed and re-verified before trips can be published or payments activated';
    }
    if (licence !== 'VERIFIED') {
        return 'Agency travel licence must be submitted and verified before trips can be published or payments activated';
    }
    return null;
}
