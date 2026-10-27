import { isBetaBadgeEnabled } from './beta-badge';

describe('isBetaBadgeEnabled (beta badge gate)', () => {
  it("is enabled for everything except the exact string 'false'", () => {
    expect(isBetaBadgeEnabled(undefined)).toBe(true);
    expect(isBetaBadgeEnabled('')).toBe(true);
    expect(isBetaBadgeEnabled('true')).toBe(true);
    expect(isBetaBadgeEnabled('FALSE')).toBe(true);
    expect(isBetaBadgeEnabled('0')).toBe(true);
    expect(isBetaBadgeEnabled('false')).toBe(false);
  });

  it('reads NEXT_PUBLIC_BETA_BADGE when no value is passed', () => {
    process.env.NEXT_PUBLIC_BETA_BADGE = 'false';
    expect(isBetaBadgeEnabled()).toBe(false);
    delete process.env.NEXT_PUBLIC_BETA_BADGE;
    expect(isBetaBadgeEnabled()).toBe(true);
  });
});
