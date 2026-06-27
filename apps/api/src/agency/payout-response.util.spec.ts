import { PayoutStatus } from '@ouiboo/types';
import { mapPayoutDetails } from './payout-response.util';

describe('mapPayoutDetails', () => {
  it('returns the canonical payout shape with agency summary', () => {
    const mapped = mapPayoutDetails({
      id: 'payout-1',
      agencyId: 'agency-1',
      amount: '900.00',
      status: PayoutStatus.Pending,
      requestedAt: new Date('2026-03-01T00:00:00.000Z'),
      processedAt: null,
      bankDetails: 'RIB 123',
      agency: {
        id: 'agency-1',
        companyName: 'Atlas Adventures',
        user: {
          email: 'agency@example.com',
        },
      },
    });

    expect(mapped).toEqual({
      id: 'payout-1',
      agencyId: 'agency-1',
      amount: '900.00',
      status: PayoutStatus.Pending,
      requestedAt: '2026-03-01T00:00:00.000Z',
      processedAt: undefined,
      bankDetails: 'RIB 123',
      agency: {
        id: 'agency-1',
        companyName: 'Atlas Adventures',
        user: {
          email: 'agency@example.com',
        },
      },
    });
  });
});
