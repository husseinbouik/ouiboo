import { AgencyController } from './agency.controller';
import { AgencyProfileService } from './agency-profile.service';
import { AgencyDashboardService } from './agency-dashboard.service';

/**
 * #988: PATCH /agency/profile Cash Plus handling — a submission pends
 * for admin review (never live on save), the toggle applies at once,
 * and resubmitting the stored values is a no-op.
 */
describe('AgencyController.updateProfile Cash Plus (#988)', () => {
    const req: any = { tenantId: 'agency-1' };

    const baseAgency = {
        bankDetails: null,
        pendingBankDetails: null,
        bankDetailsStatus: 'UNVERIFIED',
        bankDetailsVerifiedAt: null,
        bankAccountHolderName: null,
        bankAttestationUrl: null,
        cashPlusBeneficiaryName: null,
        cashPlusPhone: null,
        pendingCashPlusBeneficiaryName: null,
        pendingCashPlusPhone: null,
        cashPlusEnabled: false,
        cashPlusStatus: 'UNVERIFIED',
        cashPlusVerifiedAt: null,
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
        const controller = new AgencyController(new AgencyProfileService(db), new AgencyDashboardService(db, {} as any));
        return { controller, db };
    }

    it('stores a first submission as pending review, not live, and applies the toggle', async () => {
        const { controller, db } = makeController(baseAgency);

        await controller.updateProfile(req, {
            cashPlusEnabled: true,
            cashPlusBeneficiaryName: 'Atlas Adventures SARL',
            cashPlusPhone: '+212612345678',
        } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.cashPlusEnabled).toBe(true);
        expect(data.pendingCashPlusBeneficiaryName).toBe('Atlas Adventures SARL');
        expect(data.pendingCashPlusPhone).toBe('+212612345678');
        expect(data.cashPlusStatus).toBe('PENDING_REVIEW');
        // Live fields untouched by a submission.
        expect(data.cashPlusBeneficiaryName).toBeUndefined();
        expect(data.cashPlusPhone).toBeUndefined();
    });

    it('requires both name and phone for a new submission', async () => {
        const { controller } = makeController(baseAgency);
        await expect(
            controller.updateProfile(req, { cashPlusBeneficiaryName: 'Atlas Adventures SARL' } as any),
        ).rejects.toThrow('beneficiary name and phone number are both required');
    });

    it('does not re-pend when the stored live values are resubmitted unchanged', async () => {
        const { controller, db } = makeController({
            ...baseAgency,
            cashPlusBeneficiaryName: 'Atlas Adventures SARL',
            cashPlusPhone: '+212612345678',
            cashPlusEnabled: true,
            cashPlusStatus: 'VERIFIED',
            cashPlusVerifiedAt: new Date('2026-11-01T00:00:00Z'),
        });

        await controller.updateProfile(req, {
            cashPlusBeneficiaryName: 'Atlas Adventures SARL',
            cashPlusPhone: '+212612345678',
        } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.cashPlusStatus).toBeUndefined();
        expect(data.pendingCashPlusBeneficiaryName).toBeUndefined();
    });

    it('pends a changed phone against a verified destination without taking it offline', async () => {
        const { controller, db } = makeController({
            ...baseAgency,
            cashPlusBeneficiaryName: 'Atlas Adventures SARL',
            cashPlusPhone: '+212612345678',
            cashPlusEnabled: true,
            cashPlusStatus: 'VERIFIED',
            cashPlusVerifiedAt: new Date('2026-11-01T00:00:00Z'),
        });

        await controller.updateProfile(req, { cashPlusPhone: '+212698765432' } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.pendingCashPlusPhone).toBe('+212698765432');
        expect(data.pendingCashPlusBeneficiaryName).toBe('Atlas Adventures SARL');
        expect(data.cashPlusStatus).toBe('PENDING_REVIEW');
        expect(data.cashPlusPhone).toBeUndefined();
    });
});
