import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AgencyController } from './agency.controller';

/**
 * #421 (Council P0-19): PATCH /agency/profile bank-details handling.
 * A submission is stored as a pending destination for admin review —
 * it never overwrites the live, traveller-visible bankDetails, and it
 * no longer resets the whole-agency verificationStatus.
 */
describe('AgencyController.updateProfile bank destination (#421)', () => {
    const req: any = { tenantId: 'agency-1' };

    const verifiedAgency = {
        bankDetails: null,
        pendingBankDetails: null,
        bankDetailsStatus: 'UNVERIFIED',
        bankDetailsVerifiedAt: null,
        verificationStatus: 'VERIFIED',
        travelLicenceStatus: 'VERIFIED',
        licenceExpiry: new Date('2027-06-01T00:00:00Z'),
        insuranceStatus: 'VERIFIED',
        insuranceExpiry: new Date('2027-06-01T00:00:00Z'),
    };

    function makeController(existing: any) {
        const db: any = {
            agencyProfile: {
                findUnique: jest.fn(async () => existing),
                update: jest.fn(async ({ data }: any) => ({ id: 'agency-1', ...data })),
            },
        };
        const controller = new AgencyController(db, {} as any);
        return { controller, db };
    }

    it('stores a first submission as pending review, not live', async () => {
        const { controller, db } = makeController(verifiedAgency);

        await controller.updateProfile(req, {
            bankDetails: 'CIH Bank — RIB 230 780 0000000000000001 67',
            bankAccountHolderName: 'Atlas Adventures SARL',
            bankAttestationUrl: 'https://media.example/attestation.pdf',
        } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.pendingBankDetails).toBe('CIH Bank — RIB 230 780 0000000000000001 67');
        expect(data.bankDetailsStatus).toBe('PENDING_REVIEW');
        expect(data.bankDetailsRejectionReason).toBeNull();
        expect(data.bankAccountHolderName).toBe('Atlas Adventures SARL');
        expect(data.bankAttestationUrl).toBe('https://media.example/attestation.pdf');
        // The live field and the agency-level verification are untouched.
        expect(data.bankDetails).toBeUndefined();
        expect(data.verificationStatus).toBeUndefined();
    });

    it('keeps the #371 activation gate on the first submission', async () => {
        const { controller, db } = makeController({
            ...verifiedAgency,
            verificationStatus: 'PENDING',
        });

        await expect(
            controller.updateProfile(req, { bankDetails: 'RIB 123' } as any),
        ).rejects.toThrow(ForbiddenException);
        expect(db.agencyProfile.update).not.toHaveBeenCalled();
    });

    it('blocks the first submission when RC insurance is not verified (#415)', async () => {
        const { controller, db } = makeController({
            ...verifiedAgency,
            insuranceStatus: 'NOT_SUBMITTED',
            insuranceExpiry: null,
        });

        await expect(
            controller.updateProfile(req, { bankDetails: 'RIB 123' } as any),
        ).rejects.toThrow(/insurance must be submitted and verified/i);
        expect(db.agencyProfile.update).not.toHaveBeenCalled();
    });

    it('blocks the first submission when RC insurance has expired (#415)', async () => {
        const { controller, db } = makeController({
            ...verifiedAgency,
            insuranceExpiry: new Date('2026-01-01T00:00:00Z'),
        });

        await expect(
            controller.updateProfile(req, { bankDetails: 'RIB 123' } as any),
        ).rejects.toThrow(/insurance has expired/i);
        expect(db.agencyProfile.update).not.toHaveBeenCalled();
    });

    it('lets a verified destination be replaced without re-gating the agency', async () => {
        // Licence has lapsed since the destination was verified: the
        // agency-level gate would block, but destination review is the
        // gate for a replacement, and the old instructions stay live.
        const { controller, db } = makeController({
            ...verifiedAgency,
            bankDetails: 'CIH Bank — RIB 111 (verified)',
            bankDetailsStatus: 'VERIFIED',
            bankDetailsVerifiedAt: new Date('2026-10-01T00:00:00Z'),
            licenceExpiry: new Date('2026-01-01T00:00:00Z'),
        });

        await controller.updateProfile(req, { bankDetails: 'CIH Bank — RIB 222 (new)' } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.pendingBankDetails).toBe('CIH Bank — RIB 222 (new)');
        expect(data.bankDetailsStatus).toBe('PENDING_REVIEW');
        expect(data.bankDetails).toBeUndefined();
    });

    it('clearing the field deactivates the destination', async () => {
        const { controller, db } = makeController({
            ...verifiedAgency,
            bankDetails: 'CIH Bank — RIB 111 (verified)',
            bankDetailsStatus: 'VERIFIED',
            bankDetailsVerifiedAt: new Date('2026-10-01T00:00:00Z'),
        });

        await controller.updateProfile(req, { bankDetails: '' } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.bankDetails).toBeNull();
        expect(data.pendingBankDetails).toBeNull();
        expect(data.bankDetailsStatus).toBe('UNVERIFIED');
        expect(data.bankDetailsVerifiedAt).toBeNull();
    });

    it('ignores a resubmission identical to the live verified details', async () => {
        const { controller, db } = makeController({
            ...verifiedAgency,
            bankDetails: 'CIH Bank — RIB 111 (verified)',
            bankDetailsStatus: 'VERIFIED',
            bankDetailsVerifiedAt: new Date('2026-10-01T00:00:00Z'),
        });

        await controller.updateProfile(req, { bankDetails: 'CIH Bank — RIB 111 (verified)' } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.pendingBankDetails).toBeUndefined();
        expect(data.bankDetailsStatus).toBeUndefined();
    });

    it('updates holder/attestation alone without touching the destination state', async () => {
        const { controller, db } = makeController(verifiedAgency);

        await controller.updateProfile(req, { bankAccountHolderName: 'Atlas Adventures SARL' } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.bankAccountHolderName).toBe('Atlas Adventures SARL');
        expect(data.bankDetailsStatus).toBeUndefined();
        expect(data.pendingBankDetails).toBeUndefined();
    });

    it('throws when the profile does not exist', async () => {
        const { controller } = makeController(null);
        await expect(
            controller.updateProfile(req, { bankDetails: 'RIB 123' } as any),
        ).rejects.toThrow(NotFoundException);
    });
});

/**
 * #419 fix: the activation gate is scoped to actual payment-destination
 * CHANGES. The Settings form submits every profile field bundled with
 * the bank fields, so an agency whose RC insurance is not yet verified
 * must still be able to save non-bank settings when the bank fields in
 * the payload are unchanged — while a genuine destination change keeps
 * hitting the #371/#415 gate.
 */
describe('AgencyController.updateProfile gate scoping (#419 fix)', () => {
    const req: any = { tenantId: 'agency-1' };

    // Identity + licence verified, RC insurance NOT submitted, and a
    // stored (not yet verified) destination: live details on file, no
    // pending submission — the state the Settings form echoes back.
    const insuranceBlockedAgency = {
        bankDetails: 'CIH Bank — RIB 230 780 0000000000000001 67',
        pendingBankDetails: null,
        bankDetailsStatus: 'UNVERIFIED',
        bankDetailsVerifiedAt: null,
        bankAccountHolderName: 'Atlas Adventures SARL',
        bankAttestationUrl: 'https://media.example/attestation.pdf',
        verificationStatus: 'VERIFIED',
        travelLicenceStatus: 'VERIFIED',
        licenceExpiry: new Date('2027-06-01T00:00:00Z'),
        insuranceStatus: 'NOT_SUBMITTED',
        insuranceExpiry: null,
    };

    function makeController(existing: any) {
        const db: any = {
            agencyProfile: {
                findUnique: jest.fn(async () => existing),
                update: jest.fn(async ({ data }: any) => ({ id: 'agency-1', ...data })),
            },
        };
        const controller = new AgencyController(db, {} as any);
        return { controller, db };
    }

    it('saves non-bank settings when the bundled bank fields are unchanged, despite the insurance block', async () => {
        const { controller, db } = makeController(insuranceBlockedAgency);

        await controller.updateProfile(req, {
            bankDetails: 'CIH Bank — RIB 230 780 0000000000000001 67',
            bankAccountHolderName: 'Atlas Adventures SARL',
            bankAttestationUrl: 'https://media.example/attestation.pdf',
            emergencyContactName: 'Yasmine El Fassi',
            emergencyContactPhone: '+212 6 12 34 56 78',
            bio: 'Updated bio',
        } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.emergencyContactName).toBe('Yasmine El Fassi');
        expect(data.emergencyContactPhone).toBe('+212 6 12 34 56 78');
        expect(data.bio).toBe('Updated bio');
        // The unchanged destination is not re-submitted for review.
        expect(data.pendingBankDetails).toBeUndefined();
        expect(data.bankDetailsStatus).toBeUndefined();
    });

    it('still gates a genuine bankDetails change while insurance is unverified', async () => {
        const { controller, db } = makeController(insuranceBlockedAgency);

        await expect(
            controller.updateProfile(req, {
                bankDetails: 'CIH Bank — RIB 230 780 9999999999999999 99',
                emergencyContactName: 'Yasmine El Fassi',
            } as any),
        ).rejects.toThrow(/insurance must be submitted and verified/i);
        expect(db.agencyProfile.update).not.toHaveBeenCalled();
    });

    it('still gates a holder-name-only change while insurance is unverified', async () => {
        const { controller, db } = makeController(insuranceBlockedAgency);

        await expect(
            controller.updateProfile(req, {
                bankAccountHolderName: 'Someone Else SARL',
            } as any),
        ).rejects.toThrow(ForbiddenException);
        expect(db.agencyProfile.update).not.toHaveBeenCalled();
    });

    it('lets a fully verified agency change its bank details (stored as pending review)', async () => {
        const { controller, db } = makeController({
            ...insuranceBlockedAgency,
            insuranceStatus: 'VERIFIED',
            insuranceExpiry: new Date('2027-06-01T00:00:00Z'),
        });

        await controller.updateProfile(req, {
            bankDetails: 'CIH Bank — RIB 230 780 9999999999999999 99',
        } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.pendingBankDetails).toBe('CIH Bank — RIB 230 780 9999999999999999 99');
        expect(data.bankDetailsStatus).toBe('PENDING_REVIEW');
    });
});
