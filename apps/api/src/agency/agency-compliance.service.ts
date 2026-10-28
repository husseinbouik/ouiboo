import { Injectable, Logger } from '@nestjs/common';
import { LicenceStatus, TripStatus } from '@ouiboo/database';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import {
    effectiveInsuranceStatus,
    effectiveLicenceStatus,
} from '../common/agency-licence.util';

/**
 * #415 (Council P0-08) — licence / RC-insurance expiry sweep.
 *
 * The effective licence/insurance status is derived on read everywhere
 * (agency-licence.util), so an expired artefact already blocks publish,
 * payment activation, and new bookings the moment it lapses. This daily
 * sweep is the persistence + enforcement side of the same rule:
 *
 * 1. Agencies whose stored licence or insurance is still VERIFIED but
 *    whose expiry has passed are persisted as EXPIRED, with
 *    `verificationPausedAt` / `verificationPauseReason` recording why.
 * 2. The agency's ACTIVE trips are deactivated (ACTIVE -> INACTIVE) —
 *    the exact transition TripsService.deactivateTemplate performs:
 *    trips leave the marketplace, existing bookings and sessions are
 *    untouched and run their course. Trips can be re-activated by the
 *    agency only through the publish gate, which refuses until the
 *    lapsed artefact is renewed and re-verified.
 * 3. The agency is notified by email (best effort, never throws).
 *
 * Idempotent: rows already persisted as EXPIRED are never selected
 * again, the pause marker is written only by the guarded claim update,
 * and trip deactivation matches ACTIVE trips only. Bookings are never
 * read or written by this service.
 */
@Injectable()
export class AgencyComplianceService {
    private readonly logger = new Logger(AgencyComplianceService.name);

    constructor(
        private db: DatabaseService,
        private emailService: EmailService,
    ) {}

    async sweepExpiredLicencesAndInsurance(now: Date = new Date()) {
        // Candidates: an artefact still stored VERIFIED whose expiry has
        // passed. Null expiries never match `lte` — a VERIFIED artefact
        // without an expiry is a data problem for the admin flow (the
        // util already refuses to treat it as verified), not an expiry.
        const candidates = await this.db.agencyProfile.findMany({
            where: {
                OR: [
                    {
                        travelLicenceStatus: LicenceStatus.VERIFIED,
                        licenceExpiry: { lte: now },
                    },
                    {
                        insuranceStatus: LicenceStatus.VERIFIED,
                        insuranceExpiry: { lte: now },
                    },
                ],
            },
            select: {
                id: true,
                companyName: true,
                travelLicenceStatus: true,
                licenceExpiry: true,
                insuranceStatus: true,
                insuranceExpiry: true,
                user: { select: { email: true } },
            },
            take: 500,
        });

        let expired = 0;
        let tripsPaused = 0;
        let notified = 0;

        for (const profile of candidates) {
            try {
                const outcome = await this.expireAgency(profile, now);
                if (!outcome) {
                    continue;
                }
                expired += 1;
                tripsPaused += outcome.tripsPaused;
                if (
                    await this.notifyAgencyVerificationPaused(
                        profile,
                        outcome.reason,
                        outcome.tripsPaused,
                    )
                ) {
                    notified += 1;
                }
            } catch (error) {
                // Isolate per-agency failures: one bad row must not block
                // the rest of the sweep (same rule as the cron wrapper).
                this.logger.error(
                    `Licence/insurance expiry sweep failed for agency ${profile.id}`,
                    error,
                );
            }
        }

        this.logger.log(
            `Licence/insurance expiry sweep: ${candidates.length} agencies scanned, ` +
                `${expired} newly expired, ${tripsPaused} active trips paused, ${notified} agencies notified`,
        );
        return { scanned: candidates.length, expired, tripsPaused, notified };
    }

    /**
     * Persist the lapse for one agency and pause its ACTIVE trips, in a
     * single transaction. Returns null when the agency is not actually
     * newly expired (already EXPIRED, not yet expired on re-check, or a
     * concurrent run claimed the row first) — the idempotent no-op path.
     */
    private async expireAgency(
        profile: {
            id: string;
            travelLicenceStatus: string;
            licenceExpiry: Date | null;
            insuranceStatus: string;
            insuranceExpiry: Date | null;
        },
        now: Date,
    ): Promise<{ tripsPaused: number; reason: string } | null> {
        // Re-derive with the shared util so the sweep can never disagree
        // with the read-time gates about what "expired" means.
        const licenceNewlyExpired =
            profile.travelLicenceStatus === LicenceStatus.VERIFIED &&
            effectiveLicenceStatus(profile, now) === 'EXPIRED';
        const insuranceNewlyExpired =
            profile.insuranceStatus === LicenceStatus.VERIFIED &&
            effectiveInsuranceStatus(profile, now) === 'EXPIRED';
        if (!licenceNewlyExpired && !insuranceNewlyExpired) {
            return null;
        }

        const reasons: string[] = [];
        if (licenceNewlyExpired) {
            reasons.push(
                `Travel licence expired on ${this.dateLabel(profile.licenceExpiry)}`,
            );
        }
        if (insuranceNewlyExpired) {
            reasons.push(
                `RC insurance expired on ${this.dateLabel(profile.insuranceExpiry)}`,
            );
        }
        const reason = reasons.join('; ');

        return this.db.$transaction(async (tx) => {
            // Guarded claim: only flip rows that are still stored
            // VERIFIED for the lapsing artefact(s). A concurrent run (or
            // an admin action) that already persisted EXPIRED makes the
            // count 0 and this agency a no-op.
            const claimed = await tx.agencyProfile.updateMany({
                where: {
                    id: profile.id,
                    ...(licenceNewlyExpired
                        ? { travelLicenceStatus: LicenceStatus.VERIFIED }
                        : {}),
                    ...(insuranceNewlyExpired
                        ? { insuranceStatus: LicenceStatus.VERIFIED }
                        : {}),
                },
                data: {
                    ...(licenceNewlyExpired
                        ? { travelLicenceStatus: LicenceStatus.EXPIRED }
                        : {}),
                    ...(insuranceNewlyExpired
                        ? { insuranceStatus: LicenceStatus.EXPIRED }
                        : {}),
                    verificationPausedAt: now,
                    verificationPauseReason: reason,
                },
            });
            if (claimed.count !== 1) {
                return null;
            }

            // Auto-pause: ACTIVE -> INACTIVE is the established trip
            // deactivation (TripsService.deactivateTemplate). Existing
            // bookings and sessions are deliberately not touched.
            const paused = await tx.tripTemplate.updateMany({
                where: { agencyId: profile.id, status: TripStatus.ACTIVE },
                data: { status: TripStatus.INACTIVE },
            });
            return { tripsPaused: paused.count, reason };
        });
    }

    private dateLabel(value: Date | string | null): string {
        if (!value) {
            return 'an unknown date';
        }
        const parsed = value instanceof Date ? value : new Date(value);
        return Number.isNaN(parsed.getTime())
            ? 'an unknown date'
            : parsed.toISOString().slice(0, 10);
    }

    /**
     * Best-effort agency notification, mirroring the refunds service's
     * agency email pattern. The system of record is the persisted
     * EXPIRED status + pause marker (agency dashboard), so a delivery
     * failure is logged and swallowed — it never fails the sweep.
     * (No in-app NotificationLog entry: NotificationType has no
     * verification value and adding one is a schema change, out of
     * scope for this PR.)
     */
    private async notifyAgencyVerificationPaused(
        profile: { id: string; companyName: string; user?: { email: string | null } | null },
        reason: string,
        tripsPaused: number,
    ): Promise<boolean> {
        const email = profile.user?.email;
        if (!email) {
            return false;
        }
        try {
            const appUrl =
                process.env.AGENCY_APP_URL || 'https://ouiboo-agency.vercel.app';
            // #424: copy lives in the email locale table (en/fr/ar); the
            // agency's locale is not recorded yet, so the default applies.
            const html = this.emailService.getAgencyVerificationPausedTemplate(
                reason,
                tripsPaused,
                `${appUrl}/dashboard/onboarding`,
            );
            await this.emailService.sendEmail(
                email,
                this.emailService.getAgencyVerificationPausedSubject(),
                html,
            );
            return true;
        } catch (error) {
            this.logger.error(
                `Failed to send verification-paused notice for agency ${profile.id}`,
                error,
            );
            return false;
        }
    }
}
