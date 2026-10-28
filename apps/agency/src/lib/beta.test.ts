import { isFreeBeta } from './beta';

describe('isFreeBeta (#566)', () => {
  it('is on by default — unset, empty and typos keep the honest beta state', () => {
    expect(isFreeBeta(undefined)).toBe(true);
    expect(isFreeBeta('')).toBe(true);
    expect(isFreeBeta('true')).toBe(true);
    expect(isFreeBeta('FALSE')).toBe(true);
    expect(isFreeBeta('0')).toBe(true);
  });

  it("is lifted only by the exact string 'false'", () => {
    expect(isFreeBeta('false')).toBe(false);
  });

  it('reads NEXT_PUBLIC_FREE_BETA when no value is passed', () => {
    const previous = process.env.NEXT_PUBLIC_FREE_BETA;
    try {
      delete process.env.NEXT_PUBLIC_FREE_BETA;
      expect(isFreeBeta()).toBe(true);
      process.env.NEXT_PUBLIC_FREE_BETA = 'false';
      expect(isFreeBeta()).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_FREE_BETA;
      else process.env.NEXT_PUBLIC_FREE_BETA = previous;
    }
  });
});
