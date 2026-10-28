import { RebookingService } from './rebooking.service';

/**
 * #444 (Council P2-05): rebooking suggestions — the value half of the
 * leakage defences. Suggestions exist only for agencies the traveller
 * has a CONFIRMED/COMPLETED booking with, only for bookable future
 * sessions, never for a session the traveller already holds, and at
 * most 2 per agency.
 */
const NOW = new Date('2026-10-27T12:00:00.000Z');
const future = (days: number) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);

function sessionRow(overrides: Record<string, any> = {}): any {
  return {
    id: 's1',
    startDate: future(14),
    endDate: future(16),
    price: '1500.00',
    currency: 'MAD',
    availableSeats: 8,
    template: {
      id: 'trip-1',
      title: 'Atlas Trek',
      description: '...',
      translations: null,
      images: ['https://cdn.ouiboo.test/trips/atlas.png'],
      agencyId: 'a1',
      agency: { id: 'a1', companyName: 'Atlas Adventures' },
    },
    ...overrides,
  };
}

function buildMock({
  pastBookings = [] as any[],
  heldBookings = [] as any[],
  sessions = [] as any[],
} = {}) {
  return {
    booking: {
      findMany: jest.fn(async ({ where }: any) => {
        // relationship query filters on CONFIRMED/COMPLETED; held query on notIn
        if (where.status?.in) return pastBookings;
        return heldBookings;
      }),
    },
    tripSession: { findMany: jest.fn(async () => sessions) },
  };
}

const relationship = (agencyId: string) => ({
  session: { template: { agencyId } },
});

describe('RebookingService (#444)', () => {
  it('returns no suggestions when the traveller has no agency relationship', async () => {
    const mock = buildMock();
    const service = new RebookingService(mock as any);
    await expect(service.getSuggestions('t1', 'en', NOW)).resolves.toEqual([]);
    expect(mock.tripSession.findMany).not.toHaveBeenCalled();
  });

  it('suggests upcoming sessions from known agencies with the relationship count', async () => {
    const mock = buildMock({
      pastBookings: [relationship('a1'), relationship('a1')],
      sessions: [sessionRow()],
    });
    const service = new RebookingService(mock as any);
    const suggestions = await service.getSuggestions('t1', 'en', NOW);

    expect(suggestions).toEqual([
      expect.objectContaining({
        tripId: 'trip-1',
        title: 'Atlas Trek',
        agencyId: 'a1',
        companyName: 'Atlas Adventures',
        previousBookingsWithAgency: 2,
        sessionId: 's1',
        price: '1500.00',
        currency: 'MAD',
        image: 'https://cdn.ouiboo.test/trips/atlas.png',
      }),
    ]);
  });

  it('never suggests a session the traveller already holds', async () => {
    const mock = buildMock({
      pastBookings: [relationship('a1')],
      heldBookings: [{ sessionId: 's1' }],
      sessions: [sessionRow(), sessionRow({ id: 's2' })],
    });
    const service = new RebookingService(mock as any);
    const suggestions = await service.getSuggestions('t1', 'en', NOW);
    expect(suggestions.map((s) => s.sessionId)).toEqual(['s2']);
  });

  it('caps suggestions at 2 per agency', async () => {
    const mock = buildMock({
      pastBookings: [relationship('a1')],
      sessions: [sessionRow({ id: 's1' }), sessionRow({ id: 's2' }), sessionRow({ id: 's3' })],
    });
    const service = new RebookingService(mock as any);
    const suggestions = await service.getSuggestions('t1', 'en', NOW);
    expect(suggestions.map((s) => s.sessionId)).toEqual(['s1', 's2']);
  });

  it('resolves the trip title in the requested locale with French fallback', async () => {
    const translated = sessionRow();
    translated.template = {
      ...translated.template,
      translations: {
        fr: { title: 'Trek Atlas', description: 'Description' },
        en: { title: 'Atlas Trek EN', description: 'Description EN' },
      },
    };
    const mock = buildMock({ pastBookings: [relationship('a1')], sessions: [translated] });
    const service = new RebookingService(mock as any);

    const en = await service.getSuggestions('t1', 'en', NOW);
    expect(en[0]).toMatchObject({ title: 'Atlas Trek EN', language: 'en' });

    const ar = await service.getSuggestions('t1', 'ar', NOW);
    expect(ar[0]).toMatchObject({ title: 'Trek Atlas', language: 'fr' });
  });
});
