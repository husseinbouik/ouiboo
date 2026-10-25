import { AgencyComplianceService } from './agency-compliance.service';

/**
 * #415 (Council P0-08) — expiry sweep specs.
 *
 * The fake db mirrors the three query shapes the service uses:
 * agencyProfile.findMany (candidates), and inside a transaction the
 * guarded agencyProfile.updateMany claim + tripTemplate.updateMany
 * pause. Booking models exist on the fake only to prove the sweep
 * never touches them.
 */

const NOW = new Date('2026-10-25T02:00:00.000Z');
const PAST = new Date('2026-10-01T00:00:00.000Z');
const FUTURE = new Date('2027-10-01T00:00:00.000Z');

function makeProfile(overrides: Record<string, unknown> = {}): any {
    return {
        id: 'agency-1',
        companyName: 'Atlas Tours',
        travelLicenceStatus: 'VERIFIED',
        licenceExpiry: PAST,
        insuranceStatus: 'VERIFIED',
        insuranceExpiry: FUTURE,
        user: { email: 'agency@example.com' },
        ...overrides,
    };
}

function makeDb(options: {
    candidates?: any[];
    claimCount?: number;
    pausedTrips?: number;
    onClaim?: (args: any) => void;
    onPause?: (args: any) => void;
}) {
    const tx = {
        agencyProfile: {
            updateMany: jest.fn(async (args: any) => {
                options.onClaim?.(args);
                return { count: options.claimCount ?? 1 };
            }),
        },
        tripTemplate: {
            updateMany: jest.fn(async (args: any) => {
                options.onPause?.(args);
                return { count: options.pausedTrips ?? 0 };
            }),
        },
    };
    const db: any = {
        agencyProfile: {
            findMany: jest.fn(async () => options.candidates ?? []),
        },
        tripTemplate: { updateMany: jest.fn(async () => ({ count: 0 })) },
        booking: {
            update: jest.fn(async () => ({})),
            updateMany: jest.fn(async () => ({ count: 0 })),
        },
        tripSession: {
            update: jest.fn(async () => ({})),
            updateMany: jest.fn(async () => ({ count: 0 })),
        },
        $transaction: jest.fn(async (cb: any) => cb(tx)),
    };
    return { db, tx };
}

function makeEmail(fail = false) {
    return {
        sendEmail: jest.fn(
            async (_to: string, _subject: string, _html: string) => {
                if (fail) {
                    throw new Error('SMTP down');
                }
                return {};
            },
        ),
    };
}

function makeService(db: any, email: any) {
    return new AgencyComplianceService(db, email);
}

describe('AgencyComplianceService.sweepExpiredLicencesAndInsurance', () => {
    it('persists an expired licence as EXPIRED, sets the pause marker, pauses ACTIVE trips, and notifies', async () => {
        let claimArgs: any;
        let pauseArgs: any;
        const { db, tx } = makeDb({
            candidates: [makeProfile()],
            pausedTrips: 3,
            onClaim: (a) => (claimArgs = a),
            onPause: (a) => (pauseArgs = a),
        });
        const email = makeEmail();
        const result = await makeService(db, email).sweepExpiredLicencesAndInsurance(NOW);

        expect(result).toEqual({ scanned: 1, expired: 1, tripsPaused: 3, notified: 1 });
        expect(claimArgs.where).toEqual({
            id: 'agency-1',
            travelLicenceStatus: 'VERIFIED',
        });
        expect(claimArgs.data.travelLicenceStatus).toBe('EXPIRED');
        expect(claimArgs.data.insuranceStatus).toBeUndefined();
        expect(claimArgs.data.verificationPausedAt).toEqual(NOW);
        expect(claimArgs.data.verificationPauseReason).toContain(
            'Travel licence expired on 2026-10-01',
        );
        expect(pauseArgs).toEqual({
            where: { agencyId: 'agency-1', status: 'ACTIVE' },
            data: { status: 'INACTIVE' },
        });
        expect(email.sendEmail).toHaveBeenCalledTimes(1);
        expect(email.sendEmail.mock.calls[0][0]).toBe('agency@example.com');
        expect(tx.tripTemplate.updateMany).toHaveBeenCalledTimes(1);
    });

    it('persists an expired RC insurance only, leaving the licence VERIFIED', async () => {
        let claimArgs: any;
        const { db } = makeDb({
            candidates: [
                makeProfile({ licenceExpiry: FUTURE, insuranceExpiry: PAST }),
            ],
            onClaim: (a) => (claimArgs = a),
        });
        const result = await makeService(db, makeEmail()).sweepExpiredLicencesAndInsurance(NOW);

        expect(result.expired).toBe(1);
        expect(claimArgs.where).toEqual({ id: 'agency-1', insuranceStatus: 'VERIFIED' });
        expect(claimArgs.data.insuranceStatus).toBe('EXPIRED');
        expect(claimArgs.data.travelLicenceStatus).toBeUndefined();
        expect(claimArgs.data.verificationPauseReason).toContain(
            'RC insurance expired on 2026-10-01',
        );
    });

    it('persists both artefacts when both have expired, with a combined reason', async () => {
        let claimArgs: any;
        const { db } = makeDb({
            candidates: [makeProfile({ insuranceExpiry: PAST })],
            onClaim: (a) => (claimArgs = a),
        });
        const result = await makeService(db, makeEmail()).sweepExpiredLicencesAndInsurance(NOW);

        expect(result.expired).toBe(1);
        expect(claimArgs.data.travelLicenceStatus).toBe('EXPIRED');
        expect(claimArgs.data.insuranceStatus).toBe('EXPIRED');
        expect(claimArgs.data.verificationPauseReason).toContain('Travel licence expired');
        expect(claimArgs.data.verificationPauseReason).toContain('RC insurance expired');
    });

    it('is a no-op for agencies whose documents have not yet expired', async () => {
        // A VERIFIED agency with future expiries can appear in the
        // candidate list only through a race; the util re-check must
        // refuse to expire it.
        const { db, tx } = makeDb({
            candidates: [makeProfile({ licenceExpiry: FUTURE, insuranceExpiry: FUTURE })],
        });
        const email = makeEmail();
        const result = await makeService(db, email).sweepExpiredLicencesAndInsurance(NOW);

        expect(result).toEqual({ scanned: 1, expired: 0, tripsPaused: 0, notified: 0 });
        expect(tx.agencyProfile.updateMany).not.toHaveBeenCalled();
        expect(tx.tripTemplate.updateMany).not.toHaveBeenCalled();
        expect(email.sendEmail).not.toHaveBeenCalled();
    });

    it('is a no-op for agencies already persisted as EXPIRED (idempotent re-run)', async () => {
        const { db, tx } = makeDb({
            candidates: [
                makeProfile({ travelLicenceStatus: 'EXPIRED', insuranceStatus: 'EXPIRED', insuranceExpiry: PAST }),
            ],
        });
        const email = makeEmail();
        const result = await makeService(db, email).sweepExpiredLicencesAndInsurance(NOW);

        expect(result.expired).toBe(0);
        expect(tx.agencyProfile.updateMany).not.toHaveBeenCalled();
        expect(tx.tripTemplate.updateMany).not.toHaveBeenCalled();
        expect(email.sendEmail).not.toHaveBeenCalled();
    });

    it('treats a lost claim race (updateMany count 0) as a no-op: no pause, no email', async () => {
        const { db, tx } = makeDb({
            candidates: [makeProfile()],
            claimCount: 0,
        });
        const email = makeEmail();
        const result = await makeService(db, email).sweepExpiredLicencesAndInsurance(NOW);

        expect(result).toEqual({ scanned: 1, expired: 0, tripsPaused: 0, notified: 0 });
        expect(tx.tripTemplate.updateMany).not.toHaveBeenCalled();
        expect(email.sendEmail).not.toHaveBeenCalled();
    });

    it('still expires and notifies an agency with no ACTIVE trips', async () => {
        const { db } = makeDb({ candidates: [makeProfile()], pausedTrips: 0 });
        const email = makeEmail();
        const result = await makeService(db, email).sweepExpiredLicencesAndInsurance(NOW);

        expect(result).toEqual({ scanned: 1, expired: 1, tripsPaused: 0, notified: 1 });
        expect(email.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('never touches bookings or sessions while pausing trips', async () => {
        const { db } = makeDb({ candidates: [makeProfile()], pausedTrips: 2 });
        await makeService(db, makeEmail()).sweepExpiredLicencesAndInsurance(NOW);

        expect(db.booking.update).not.toHaveBeenCalled();
        expect(db.booking.updateMany).not.toHaveBeenCalled();
        expect(db.tripSession.update).not.toHaveBeenCalled();
        expect(db.tripSession.updateMany).not.toHaveBeenCalled();
    });

    it('swallows an email failure: the lapse stays persisted and the sweep reports notified 0', async () => {
        const { db, tx } = makeDb({ candidates: [makeProfile()], pausedTrips: 1 });
        const result = await makeService(db, makeEmail(true)).sweepExpiredLicencesAndInsurance(NOW);

        expect(result.expired).toBe(1);
        expect(result.notified).toBe(0);
        expect(tx.agencyProfile.updateMany).toHaveBeenCalledTimes(1);
    });

    it('does not notify when the agency user has no email on file', async () => {
        const { db } = makeDb({
            candidates: [makeProfile({ user: { email: null } })],
        });
        const email = makeEmail();
        const result = await makeService(db, email).sweepExpiredLicencesAndInsurance(NOW);

        expect(result.expired).toBe(1);
        expect(result.notified).toBe(0);
        expect(email.sendEmail).not.toHaveBeenCalled();
    });

    it('isolates a failing agency and still processes the rest', async () => {
        const { db, tx } = makeDb({
            candidates: [makeProfile({ id: 'agency-bad' }), makeProfile({ id: 'agency-good' })],
            pausedTrips: 1,
        });
        tx.agencyProfile.updateMany
            .mockRejectedValueOnce(new Error('db hiccup'))
            .mockResolvedValue({ count: 1 });
        const email = makeEmail();
        const result = await makeService(db, email).sweepExpiredLicencesAndInsurance(NOW);

        expect(result.scanned).toBe(2);
        expect(result.expired).toBe(1);
        expect(email.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('queries only stored-VERIFIED artefacts with a past expiry', async () => {
        const { db } = makeDb({ candidates: [] });
        await makeService(db, makeEmail()).sweepExpiredLicencesAndInsurance(NOW);

        const where = db.agencyProfile.findMany.mock.calls[0][0].where;
        expect(where).toEqual({
            OR: [
                { travelLicenceStatus: 'VERIFIED', licenceExpiry: { lte: NOW } },
                { insuranceStatus: 'VERIFIED', insuranceExpiry: { lte: NOW } },
            ],
        });
    });
});
