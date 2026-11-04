import {
  agencyInitials,
  isShowcaseQuality,
  selectShowcaseTrips,
  type PublicShowcaseTrip,
} from './showcase';

/**
 * #771: showcase selection — one trip per distinct agency, quality
 * gates first (a junk trip must never claim its agency's slot), and
 * nothing unverified or placeholder-grade may reach the rail.
 */
function trip(overrides: Partial<PublicShowcaseTrip>): PublicShowcaseTrip {
  return {
    id: 't1',
    agencyId: 'a1',
    status: 'ACTIVE',
    createdAt: '2026-10-01T00:00:00.000Z',
    startLocation: 'Fes',
    category: 'CULTURAL',
    durationDays: 1,
    durationNights: 0,
    images: ['https://images.unsplash.com/a', 'https://images.unsplash.com/b', 'https://images.unsplash.com/c'],
    translations: {
      fr: { title: 'Titre' },
      ar: { title: 'عنوان' },
      en: { title: 'Title' },
    },
    agency: { companyName: 'Agency One SARL', verificationStatus: 'VERIFIED' },
    ...overrides,
  };
}

describe('showcase selection (#771)', () => {
  it('accepts a complete verified trip and rejects every broken variant', () => {
    expect(isShowcaseQuality(trip({}))).toBe(true);
    expect(isShowcaseQuality(trip({ status: 'DRAFT' }))).toBe(false);
    expect(isShowcaseQuality(trip({ agency: { companyName: 'X', verificationStatus: 'PENDING' } }))).toBe(false);
    expect(isShowcaseQuality(trip({ translations: { fr: { title: 'Titre' }, en: { title: 'Title' } } }))).toBe(false);
    expect(isShowcaseQuality(trip({ images: ['https://example.com/witness.jpg', 'https://example.com/w2.jpg', 'https://example.com/w3.jpg'] }))).toBe(false);
    expect(isShowcaseQuality(trip({ images: ['https://images.unsplash.com/only-one'] }))).toBe(false);
  });

  it('picks at most one trip per agency, oldest quality trip first', () => {
    const trips = [
      trip({ id: 'atlas-newer', agencyId: 'atlas', createdAt: '2026-10-05T00:00:00.000Z' }),
      trip({ id: 'atlas-older', agencyId: 'atlas', createdAt: '2026-10-02T00:00:00.000Z' }),
      trip({ id: 'medina', agencyId: 'medina', createdAt: '2026-11-04T00:00:00.000Z' }),
      trip({ id: 'sahara', agencyId: 'sahara', createdAt: '2026-11-04T01:00:00.000Z' }),
      trip({ id: 'fourth', agencyId: 'fourth', createdAt: '2026-11-04T02:00:00.000Z' }),
    ];
    expect(selectShowcaseTrips(trips).map((t) => t.id)).toEqual(['atlas-older', 'medina', 'sahara']);
  });

  it('a junk trip does not claim its agency slot — the next good trip of that agency wins it', () => {
    const trips = [
      trip({ id: 'junk', agencyId: 'a9', createdAt: '2026-10-01T00:00:00.000Z', images: ['https://example.com/x.jpg'] }),
      trip({ id: 'good', agencyId: 'a9', createdAt: '2026-10-03T00:00:00.000Z' }),
    ];
    expect(selectShowcaseTrips(trips).map((t) => t.id)).toEqual(['good']);
  });

  it('derives initials from the company name', () => {
    expect(agencyInitials('Atlas Adventures SARL')).toBe('AA');
    expect(agencyInitials('Medina Heritage Tours SARL')).toBe('MH');
    expect(agencyInitials('Sahara Breeze Travel SARL')).toBe('SB');
  });
});
