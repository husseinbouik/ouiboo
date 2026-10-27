import { NotFoundException } from '@nestjs/common';
import { AgencyPublicController } from './agency-public.controller';

describe('AgencyPublicController (#371, #413)', () => {
    const makeController = (agency: Record<string, unknown> | null) => {
        const prisma = {
            agencyProfile: {
                findUnique: jest.fn().mockResolvedValue(agency),
            },
        };
        return { controller: new AgencyPublicController(prisma as any), prisma };
    };

    const baseAgency = {
        id: 'agency-1',
        companyName: 'Atlas Adventures',
        bio: null,
        logo: null,
        verificationStatus: 'VERIFIED',
        legalName: 'Atlas Adventures SARL',
        travelLicenceType: 'ODV',
        travelLicenceNumber: 'AV-2024-0187',
        // B4: seller-block issue data on the record.
        licenceIssuedAt: new Date('2024-03-15T00:00:00.000Z'),
        licenceIssuingAuthority: 'Ministère du Tourisme',
        travelLicenceStatus: 'VERIFIED',
        // Effective-status derivation (#415): a VERIFIED check only counts
        // with a future expiry on record — no expiry degrades to
        // PENDING_REVIEW, so both fixtures carry future expiries.
        licenceExpiry: new Date('2027-10-24T00:00:00.000Z'),
        licenceVerifiedAt: new Date('2026-10-24T00:00:00.000Z'),
        insuranceStatus: 'VERIFIED',
        insuranceExpiry: new Date('2027-10-25T00:00:00.000Z'),
        insuranceVerifiedAt: new Date('2026-10-25T00:00:00.000Z'),
    };

    it('exposes the what+when stamps for a verified licence and insurance (#413)', async () => {
        const { controller, prisma } = makeController({ ...baseAgency });

        const result = await controller.getPublicProfile('agency-1');

        const select = (prisma.agencyProfile.findUnique.mock.calls[0][0] as any).select;
        expect(select.licenceVerifiedAt).toBe(true);
        expect(select.insuranceStatus).toBe(true);
        expect(select.insuranceVerifiedAt).toBe(true);

        expect(result.licenceVerified).toBe(true);
        expect(result.travelLicenceNumber).toBe('AV-2024-0187');
        expect(result.licenceVerifiedAt).toEqual(new Date('2026-10-24T00:00:00.000Z'));
        expect(result.insuranceStatus).toBe('VERIFIED');
        expect(result.insuranceVerifiedAt).toEqual(new Date('2026-10-25T00:00:00.000Z'));
    });

    it('exposes the licence type and issue data only while verified (B4)', async () => {
        const { controller } = makeController({ ...baseAgency });
        const result = await controller.getPublicProfile('agency-1');
        expect(result.travelLicenceType).toBe('ODV');
        expect(result.licenceIssuedAt).toEqual(new Date('2024-03-15T00:00:00.000Z'));
        expect(result.licenceIssuingAuthority).toBe('Ministère du Tourisme');

        const { controller: pending } = makeController({
            ...baseAgency,
            travelLicenceStatus: 'PENDING_REVIEW',
        });
        const pendingResult = await pending.getPublicProfile('agency-1');
        expect(pendingResult.travelLicenceType).toBeNull();
        expect(pendingResult.licenceIssuedAt).toBeNull();
        expect(pendingResult.licenceIssuingAuthority).toBeNull();
    });

    it('withholds the licence number and both stamps while the checks have not passed', async () => {
        const { controller } = makeController({
            ...baseAgency,
            travelLicenceStatus: 'PENDING_REVIEW',
            insuranceStatus: 'PENDING_REVIEW',
        });

        const result = await controller.getPublicProfile('agency-1');

        expect(result.licenceVerified).toBe(false);
        expect(result.travelLicenceNumber).toBeNull();
        expect(result.licenceVerifiedAt).toBeNull();
        expect(result.insuranceVerifiedAt).toBeNull();
    });

    it('does not publish an umbrella VERIFIED while licence+insurance are NOT_SUBMITTED (#569)', async () => {
        const { controller } = makeController({
            ...baseAgency,
            travelLicenceStatus: 'NOT_SUBMITTED',
            licenceExpiry: null,
            insuranceStatus: 'NOT_SUBMITTED',
            insuranceExpiry: null,
        });

        const result = await controller.getPublicProfile('agency-1');

        expect(result.verificationStatus).toBe('PENDING');
        expect(result.licenceVerified).toBe(false);
    });

    it('keeps the umbrella VERIFIED when every component is verified (#569)', async () => {
        const { controller } = makeController({ ...baseAgency });
        const result = await controller.getPublicProfile('agency-1');
        expect(result.verificationStatus).toBe('VERIFIED');
    });

    it('throws when the agency does not exist', async () => {
        const { controller } = makeController(null);
        await expect(controller.getPublicProfile('missing')).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });
});
