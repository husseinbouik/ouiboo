import { flattenAgencyNav, getAgencyNavGroups } from './agency-nav';

const t = ((key: string) => key) as never;

describe('agency nav groups (Design Council Phase 4 — Nav A)', () => {
  it('exposes all 17 destinations across 4 groups', () => {
    const groups = getAgencyNavGroups(t);
    expect(groups).toHaveLength(4);
    expect(flattenAgencyNav(groups)).toHaveLength(17);
  });

  it('keeps Compliance, Refunds and Reviews reachable (mobile regression)', () => {
    const hrefs = flattenAgencyNav(getAgencyNavGroups(t)).map((item) => item.href);
    expect(hrefs).toContain('/dashboard/onboarding');
    expect(hrefs).toContain('/dashboard/refunds');
    expect(hrefs).toContain('/dashboard/reviews');
  });

  it('uses a distinct icon per destination (duplicate-icon fix)', () => {
    const icons = flattenAgencyNav(getAgencyNavGroups(t)).map((item) => item.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it('marks bookings as the pending-proof badge carrier', () => {
    const bookings = flattenAgencyNav(getAgencyNavGroups(t)).find((item) => item.href === '/dashboard/bookings');
    expect(bookings?.badgeKey).toBe('proofs');
  });
});
