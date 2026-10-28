import { AdminController } from './admin.controller';

/**
 * #447: the admin agency lists (pending + all) serve the agency logo and
 * the owner avatar — stored file references that must be re-derived
 * against the current public media base at read time.
 */
describe('AdminController agency lists public media derivation (#447)', () => {
    const ORIGINAL_S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;
    const future = new Date(Date.now() + 365 * 24 * 3600 * 1000);

    beforeEach(() => {
        process.env.S3_PUBLIC_URL = 'https://cdn.ouiboo.test';
    });

    afterEach(() => {
        if (ORIGINAL_S3_PUBLIC_URL === undefined) {
            delete process.env.S3_PUBLIC_URL;
        } else {
            process.env.S3_PUBLIC_URL = ORIGINAL_S3_PUBLIC_URL;
        }
    });

    const agencyRow = {
        id: 'agency-1',
        companyName: 'Atlas Adventures',
        logo: 'https://old-bucket.s3.eu-west-1.amazonaws.com/trips/agency-1/logo.png',
        verificationStatus: 'VERIFIED',
        travelLicenceStatus: 'VERIFIED',
        licenceExpiry: future,
        licenceIssuedAt: new Date('2024-03-15T00:00:00.000Z'),
        licenceIssuingAuthority: 'Ministère du Tourisme',
        insuranceStatus: 'VERIFIED',
        insuranceExpiry: future,
        user: {
            id: 'user-1',
            name: 'Agency Owner',
            email: 'owner@example.com',
            role: 'AGENCY',
            avatar: 'trips/user-1/avatar.png',
            isEmailVerified: true,
        },
    };

    const makeController = () => {
        const db = {
            agencyProfile: {
                findMany: jest.fn().mockResolvedValue([agencyRow]),
                count: jest.fn().mockResolvedValue(1),
            },
        };
        return new AdminController(
            db as any,
            {} as any,
            {} as any,
            {} as any,
            { log: jest.fn().mockResolvedValue(undefined) } as any,
            {} as any,
        );
    };

    it('getAgencies re-derives the logo and the owner avatar', async () => {
        const result: any = await makeController().getAgencies();
        expect(result.data).toHaveLength(1);
        expect(result.data[0].logo).toBe('https://cdn.ouiboo.test/trips/agency-1/logo.png');
        expect(result.data[0].user.avatar).toBe('https://cdn.ouiboo.test/trips/user-1/avatar.png');
    });

    it('getPendingAgencies re-derives the logo and the owner avatar', async () => {
        const result: any = await makeController().getPendingAgencies();
        expect(result.data).toHaveLength(1);
        expect(result.data[0].logo).toBe('https://cdn.ouiboo.test/trips/agency-1/logo.png');
        expect(result.data[0].user.avatar).toBe('https://cdn.ouiboo.test/trips/user-1/avatar.png');
    });
});
