import { AgencyController } from './agency.controller';

/**
 * #419 (Council P0-16): PATCH /agency/profile emergency-contact
 * handling. The fields are plain profile data (no review gate): a
 * submitted value is trimmed and stored, an empty string clears the
 * contact, and an absent field leaves the stored value untouched.
 */
describe('AgencyController.updateProfile emergency contact (#419)', () => {
    const req: any = { tenantId: 'agency-1' };

    const existingAgency = {
        bankDetails: null,
        pendingBankDetails: null,
        bankDetailsStatus: 'UNVERIFIED',
        bankDetailsVerifiedAt: null,
        verificationStatus: 'VERIFIED',
        travelLicenceStatus: 'VERIFIED',
        licenceExpiry: new Date('2027-06-01T00:00:00Z'),
        insuranceStatus: 'VERIFIED',
        insuranceExpiry: new Date('2027-06-01T00:00:00Z'),
        emergencyContactName: null,
        emergencyContactPhone: null,
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

    it('stores the emergency contact, trimmed', async () => {
        const { controller, db } = makeController(existingAgency);

        await controller.updateProfile(req, {
            emergencyContactName: '  Yasmine El Fassi ',
            emergencyContactPhone: ' +212 6 12 34 56 78 ',
        } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.emergencyContactName).toBe('Yasmine El Fassi');
        expect(data.emergencyContactPhone).toBe('+212 6 12 34 56 78');
    });

    it('clears the emergency contact on empty strings', async () => {
        const { controller, db } = makeController({
            ...existingAgency,
            emergencyContactName: 'Yasmine',
            emergencyContactPhone: '+212612345678',
        });

        await controller.updateProfile(req, {
            emergencyContactName: ' ',
            emergencyContactPhone: '',
        } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.emergencyContactName).toBeNull();
        expect(data.emergencyContactPhone).toBeNull();
    });

    it('leaves the stored contact untouched when the fields are absent', async () => {
        const { controller, db } = makeController(existingAgency);

        await controller.updateProfile(req, { companyName: 'Atlas Adventures' } as any);

        const data = db.agencyProfile.update.mock.calls[0][0].data;
        expect(data.emergencyContactName).toBeUndefined();
        expect(data.emergencyContactPhone).toBeUndefined();
    });
});
