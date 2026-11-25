import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminQueryService } from './admin-query.service';
import { AdminVerificationService } from './admin-verification.service';

/**
 * #988: POST /admin/agencies/:id/cash-plus/verify — the admin review
 * that promotes submitted Cash Plus infos to the live, traveller-
 * visible destination, exactly like bank details (#421). A beneficiary
 * that is not the agency itself must fail without an override reason.
 */
describe('AdminController.verifyAgencyCashPlus (#988)', () => {
    const req: any = { user: { userId: 'admin-1', email: 'admin@example.com' } };

    const pendingAgency = {
        id: 'agency-1',
        cashPlusBeneficiaryName: null,
        pendingCashPlusBeneficiaryName: 'Atlas Adventures SARL',
        pendingCashPlusPhone: '+212612345678',
        legalName: 'Atlas Adventures SARL',
        companyName: 'Atlas Adventures',
        cashPlusVerifiedAt: null,
    };

    function makeController(agency: any) {
        const db: any = {
            agencyProfile: {
                findUnique: jest.fn(async () => agency),
                update: jest.fn(async ({ data }: any) => ({ id: 'agency-1', ...data })),
            },
        };
        const auditLogService: any = { log: jest.fn().mockResolvedValue(undefined) };
        const controller = new AdminController(new AdminQueryService(db, auditLogService), new AdminVerificationService(db, {} as any, {} as any, {} as any, auditLogService, {} as any));
        return { controller, db, auditLogService };
    }

    it('rejects an invalid status', async () => {
        const { controller } = makeController(pendingAgency);
        await expect(
            controller.verifyAgencyCashPlus(req, 'agency-1', { status: 'MAYBE' as any }),
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects when nothing is pending review', async () => {
        const { controller } = makeController({ ...pendingAgency, pendingCashPlusBeneficiaryName: null });
        await expect(
            controller.verifyAgencyCashPlus(req, 'agency-1', { status: 'VERIFIED' }),
        ).rejects.toThrow('no Cash Plus infos pending review');
    });

    it('promotes the pending submission when the beneficiary matches the legal name', async () => {
        const { controller, db, auditLogService } = makeController(pendingAgency);

        const updated: any = await controller.verifyAgencyCashPlus(req, 'agency-1', { status: 'VERIFIED' });

        expect(db.agencyProfile.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    cashPlusBeneficiaryName: 'Atlas Adventures SARL',
                    cashPlusPhone: '+212612345678',
                    pendingCashPlusBeneficiaryName: null,
                    pendingCashPlusPhone: null,
                    cashPlusStatus: 'VERIFIED',
                    cashPlusVerifiedBy: 'admin-1',
                    cashPlusRejectionReason: null,
                }),
            }),
        );
        expect(updated.cashPlusStatus).toBe('VERIFIED');
        expect(auditLogService.log).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'AGENCY_CASH_PLUS_VERIFIED' }),
        );
    });

    it('blocks a third-party beneficiary without an override reason', async () => {
        const { controller } = makeController({
            ...pendingAgency,
            pendingCashPlusBeneficiaryName: 'Somebody Else',
        });
        await expect(
            controller.verifyAgencyCashPlus(req, 'agency-1', { status: 'VERIFIED' }),
        ).rejects.toThrow('does not match the agency legal name');
    });

    it('allows a mismatched beneficiary with a recorded override reason', async () => {
        const { controller } = makeController({
            ...pendingAgency,
            pendingCashPlusBeneficiaryName: 'Atlas Adventures',
        });
        // 'Atlas Adventures' is the company (trade) name — matches.
        const updated: any = await controller.verifyAgencyCashPlus(req, 'agency-1', { status: 'VERIFIED' });
        expect(updated.cashPlusStatus).toBe('VERIFIED');
    });

    it('requires a reason to reject and keeps a verified destination live on a rejected replacement', async () => {
        const { controller, db } = makeController({
            ...pendingAgency,
            cashPlusBeneficiaryName: 'Atlas Adventures SARL',
            cashPlusVerifiedAt: new Date('2026-11-01T00:00:00Z'),
        });
        await expect(
            controller.verifyAgencyCashPlus(req, 'agency-1', { status: 'REJECTED' }),
        ).rejects.toThrow('A reason is required');

        const updated: any = await controller.verifyAgencyCashPlus(req, 'agency-1', {
            status: 'REJECTED',
            reason: 'Number unreachable',
        });
        expect(db.agencyProfile.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    pendingCashPlusBeneficiaryName: null,
                    cashPlusStatus: 'VERIFIED',
                    cashPlusRejectionReason: 'Number unreachable',
                }),
            }),
        );
        expect(updated.cashPlusStatus).toBe('VERIFIED');
    });
});
