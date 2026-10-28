import { AgencyController } from './agency.controller';

/**
 * #447: the agency review list serves traveller avatars — stored file
 * references that must be re-derived against the current public media
 * base at read time (same adoption as the public review list).
 */
describe('AgencyController.getReviews traveller avatar derivation (#447)', () => {
    const ORIGINAL_S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;

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

    const makeController = () => {
        const db = {
            review: {
                findMany: jest.fn().mockResolvedValue([
                    {
                        id: 'rev-1',
                        rating: 5,
                        comment: 'Great trek',
                        response: null,
                        isVerifiedBooking: true,
                        createdAt: new Date('2026-10-20T00:00:00.000Z'),
                        traveler: {
                            id: 'traveler-1',
                            name: 'Sara',
                            avatar:
                                'https://old-bucket.s3.eu-west-1.amazonaws.com/trips/traveler-1/avatar.png',
                        },
                        booking: {
                            session: {
                                template: { id: 'trip-1', title: 'Atlas Trek' },
                            },
                        },
                    },
                ]),
                aggregate: jest
                    .fn()
                    .mockResolvedValue({ _avg: { rating: 5 }, _count: { _all: 1 } }),
                count: jest.fn().mockResolvedValue(0),
            },
        };
        return new AgencyController(db as any, {} as any);
    };

    it('re-derives the traveller avatar against the current media base', async () => {
        const controller = makeController();
        const result: any = await controller.getReviews({ tenantId: 'agency-1' } as any);
        expect(result.reviews).toHaveLength(1);
        expect(result.reviews[0].traveler.avatar).toBe(
            'https://cdn.ouiboo.test/trips/traveler-1/avatar.png',
        );
        expect(result.reviews[0].trip).toEqual({ id: 'trip-1', title: 'Atlas Trek' });
    });
});
