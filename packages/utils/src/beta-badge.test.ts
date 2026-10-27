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

  describe('default argument reads NEXT_PUBLIC_BETA_BADGE', () => {
    const original = process.env.NEXT_PUBLIC_BETA_BADGE;

    afterEach(() => {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_BETA_BADGE;
      } else {
        process.env.NEXT_PUBLIC_BETA_BADGE = original;
      }
    });

    it('defaults to enabled when the flag is unset', () => {
      delete process.env.NEXT_PUBLIC_BETA_BADGE;
      expect(isBetaBadgeEnabled()).toBe(true);
    });

    it("is disabled only when the flag is exactly 'false'", () => {
      process.env.NEXT_PUBLIC_BETA_BADGE = 'false';
      expect(isBetaBadgeEnabled()).toBe(false);
      process.env.NEXT_PUBLIC_BETA_BADGE = 'true';
      expect(isBetaBadgeEnabled()).toBe(true);
    });
  });
});
