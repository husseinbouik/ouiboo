import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentProfilesService } from './payment-profiles.service';

/**
 * #421 (Council P0-19): verify() must no longer be self-attestation for
 * the `manual` provider — activation requires an admin-verified bank
 * destination, because for manual profiles the merchant identity IS
 * the bank destination.
 */
describe('PaymentProfilesService.verify (#421)', () => {
    function makeService(profile: any, agency: any) {
        const db: any = {
            agencyPaymentProfile: {
                findUnique: jest.fn(async () => profile),
                update: jest.fn(async ({ data }: any) => ({ agencyId: 'agency-1', ...data })),
            },
            agencyProfile: {
                findUnique: jest.fn(async () => agency),
            },
        };
        const registry: any = { has: () => true, keys: () => ['manual', 'sandbox'] };
        return { service: new PaymentProfilesService(db, registry), db };
    }

    const manualProfile = {
        agencyId: 'agency-1',
        provider: 'manual',
        onboardingStatus: 'PENDING_VERIFICATION',
        paymentEnabled: false,
        refundEnabled: false,
    };

    it('throws when no profile is connected', async () => {
        const { service } = makeService(null, null);
        await expect(service.verify('agency-1')).rejects.toThrow(NotFoundException);
    });

    it('refuses manual activation while the bank destination is unverified', async () => {
        const { service, db } = makeService(manualProfile, {
            bankDetailsStatus: 'PENDING_REVIEW',
            bankDetailsVerifiedAt: null,
        });

        await expect(service.verify('agency-1')).rejects.toThrow(BadRequestException);
        await expect(service.verify('agency-1')).rejects.toThrow(/must be verified by an admin/);
        expect(db.agencyPaymentProfile.update).not.toHaveBeenCalled();
    });

    it('refuses manual activation when the agency record is missing', async () => {
        const { service, db } = makeService(manualProfile, null);
        await expect(service.verify('agency-1')).rejects.toThrow(BadRequestException);
        expect(db.agencyPaymentProfile.update).not.toHaveBeenCalled();
    });

    it('activates a manual profile once the destination is verified', async () => {
        const { service, db } = makeService(manualProfile, {
            bankDetailsStatus: 'VERIFIED',
            bankDetailsVerifiedAt: new Date('2026-10-20T00:00:00Z'),
        });

        const updated: any = await service.verify('agency-1');

        expect(db.agencyProfile.findUnique).toHaveBeenCalled();
        expect(updated.onboardingStatus).toBe('CONNECTED');
        expect(updated.paymentEnabled).toBe(true);
        expect(updated.refundEnabled).toBe(true);
        expect(updated.lastVerifiedAt).toBeInstanceOf(Date);
    });

    it('does not gate non-manual providers on the bank destination', async () => {
        const { service, db } = makeService(
            { ...manualProfile, provider: 'sandbox' },
            null,
        );

        const updated: any = await service.verify('agency-1');

        expect(db.agencyProfile.findUnique).not.toHaveBeenCalled();
        expect(updated.onboardingStatus).toBe('CONNECTED');
    });
});
