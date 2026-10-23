/**
 * #371: shared Law 11-16 travel-licence logic for AgencyProfile.
 *
 * The licence lifecycle is stored in `travelLicenceStatus`, but expiry is
 * derived on read: a VERIFIED licence whose `licenceExpiry` has passed is
 * effectively EXPIRED even if the stored value still says VERIFIED. This
 * keeps expiry correct without a cron job; an admin action or a future
 * monitoring job may also persist EXPIRED explicitly.
 *
 * Activation gate: an agency may publish trips or activate payments only
 * when BOTH its identity (`verificationStatus`) and its travel licence
 * are verified and the licence has not expired. Existing ACTIVE trips of
 * already-verified agencies are never retroactively blocked — the gate
 * applies to transitions (publish / restore / payment activation).
 */

export type LicenceProfileLike = {
    travelLicenceStatus?: string | null;
    licenceExpiry?: Date | string | null;
};

export type AgencyActivationProfile = LicenceProfileLike & {
    verificationStatus?: string | null;
};

export type EffectiveLicenceStatus =
    | 'NOT_SUBMITTED'
    | 'PENDING_REVIEW'
    | 'VERIFIED'
    | 'REJECTED'
    | 'EXPIRED';

export function effectiveLicenceStatus(
    profile: LicenceProfileLike,
    now: Date = new Date(),
): EffectiveLicenceStatus {
    const stored = (profile.travelLicenceStatus ?? 'NOT_SUBMITTED') as EffectiveLicenceStatus;
    if (stored === 'VERIFIED' && profile.licenceExpiry) {
        const expiry = profile.licenceExpiry instanceof Date
            ? profile.licenceExpiry
            : new Date(profile.licenceExpiry);
        if (!Number.isNaN(expiry.getTime()) && expiry.getTime() <= now.getTime()) {
            return 'EXPIRED';
        }
    }
    return stored;
}

export function isLicenceVerified(profile: LicenceProfileLike, now: Date = new Date()): boolean {
    return effectiveLicenceStatus(profile, now) === 'VERIFIED';
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
