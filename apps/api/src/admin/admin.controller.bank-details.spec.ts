import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';

/**
 * #421 (Council P0-19): POST /admin/agencies/:id/bank-details/verify —
 * the admin review that promotes a submitted bank destination to the
 * live, traveller-visible one. The holder-name rule is the heart of the
 * council item: a third-party RIB must fail verification.
 */
describe('AdminController.verifyAgencyBankDetails (#421)', () => {
    const req: any = { user: { userId: 'admin-1', email: 'admin@example.com' } };

    const pendingAgency = {
        id: 'agency-1',
        bankDetails: null,
        pendingBankDetails: 'CIH Bank — RIB 230 780 0000000000000001 67',
        bankAccountHolderName: 'Atlas Adventures SARL',
        bankAttestationUrl: 'https://media.example/attestation.pdf',
        legalName: 'Atlas Adventures SARL',
        companyName: 'Atlas Adventures',
        bankDetailsVerifiedAt: null,
    };

    function makeController(agency: any) {
        const db: any = {
            agencyProfile: {
                findUnique: jest.fn(async () => agency),
                update: jest.fn(async ({ data }: any) => ({ id: 'agency-1', ...data })),
            },
        };
        const auditLogService: any = { log: jest.fn().mockResolvedValue(undefined) };
        const controller = new AdminController(
            db,
            {} as any,
            {} as any,
            {} as any,
            auditLogService,
            {} as any,
        );
        return { controller, db, auditLogService };
    }

    it('rejects an invalid status', async () => {
        const { controller } = makeController(pendingAgency);
        await expect(
            controller.verifyAgencyBankDetails(req, 'agency-1', { status: 'MAYBE' as any }),
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects when the agency does not exist', async () => {
        const { controller } = makeController(null);
        await expect(
            controller.verifyAgencyBankDetails(req, 'nope', { status: 'VERIFIED' }),
        ).rejects.toThrow('Agency not found');
    });

    it('rejects when nothing is pending review', async () => {
        const { controller } = makeController({ ...pendingAgency, pendingBankDetails: null });
        await expect(
            controller.verifyAgencyBankDetails(req, 'agency-1', { status: 'VERIFIED' }),
        ).rejects.toThrow('no bank details pending review');
    });

    it('promotes the pending submission when the holder matches the legal name', async () => {
        const { controller, db, auditLogService } = makeController(pendingAgency);

        const updated: any = await controller.verifyAgencyBankDetails(req, 'agency-1', { status: 'VERIFIED' });

        expect(db.agencyProfile.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    bankDetails: pendingAgency.pendingBankDetails,
                    pendingBankDetails: null,
                    bankDetailsStatus: 'VERIFIED',
                    bankDetailsVerifiedBy: 'admin-1',
                    bankDetailsRejectionReason: null,
                }),
            }),
        );
        expect(updated.bankDetailsStatus).toBe('VERIFIED');
        expect(auditLogService.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'AGENCY_BANK_DETAILS_VERIFIED', targetId: 'agency-1' }),
        );
    });

    it('blocks verification when the holder name is missing', async () => {
        const { controller, db } = makeController({ ...pendingAgency, bankAccountHolderName: null });
        await expect(
            controller.verifyAgencyBankDetails(req, 'agency-1', { status: 'VERIFIED' }),
        ).rejects.toThrow('holder name');
        expect(db.agencyProfile.update).not.toHaveBeenCalled();
    });

    it('blocks a third-party holder unless an override reason is recorded', async () => {
        const thirdParty = { ...pendingAgency, bankAccountHolderName: 'Someone Else' };
        const { controller, db } = makeController(thirdParty);

        await expect(
            controller.verifyAgencyBankDetails(req, 'agency-1', { status: 'VERIFIED' }),
        ).rejects.toThrow(/does not match the agency legal name/);
        expect(db.agencyProfile.update).not.toHaveBeenCalled();

        const { controller: controller2, auditLogService } = makeController(thirdParty);
        const updated: any = await controller2.verifyAgencyBankDetails(req, 'agency-1', {
            status: 'VERIFIED',
            overrideReason: 'Account held under the registered trade name',
        });
        expect(updated.bankDetailsStatus).toBe('VERIFIED');
        expect(auditLogService.log).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'AGENCY_BANK_DETAILS_VERIFIED',
                metadata: expect.objectContaining({ holderMatches: false, overrideReason: 'Account held under the registered trade name' }),
            }),
        );
    });

    it('requires a reason to reject', async () => {
        const { controller, db } = makeController(pendingAgency);
        await expect(
            controller.verifyAgencyBankDetails(req, 'agency-1', { status: 'REJECTED' }),
        ).rejects.toThrow('reason is required');
        expect(db.agencyProfile.update).not.toHaveBeenCalled();
    });

    it('rejects a first submission into REJECTED and clears the pending text', async () => {
        const { controller, auditLogService } = makeController(pendingAgency);

        const updated: any = await controller.verifyAgencyBankDetails(req, 'agency-1', {
            status: 'REJECTED',
            reason: 'Attestation is illegible',
        });

        expect(updated.bankDetailsStatus).toBe('REJECTED');
        expect(updated.pendingBankDetails).toBeNull();
        expect(updated.bankDetailsRejectionReason).toBe('Attestation is illegible');
        expect(auditLogService.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'AGENCY_BANK_DETAILS_REJECTED' }),
        );
    });

    it('keeps a verified destination live when a replacement is rejected', async () => {
        const replacement = {
            ...pendingAgency,
            bankDetails: 'CIH Bank — RIB 111 (verified)',
            bankDetailsVerifiedAt: new Date('2026-10-01T00:00:00Z'),
        };
        const { controller, db } = makeController(replacement);

        const updated: any = await controller.verifyAgencyBankDetails(req, 'agency-1', {
            status: 'REJECTED',
            reason: 'New attestation does not match',
        });

        expect(updated.bankDetailsStatus).toBe('VERIFIED');
        // The live instructions are not part of the update at all —
        // the verified destination stays exactly as it was.
        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.bankDetails).toBeUndefined();
        expect(data.bankDetailsStatus).toBe('VERIFIED');
    });
});
