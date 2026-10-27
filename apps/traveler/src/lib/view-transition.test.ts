import { tripCoverViewTransitionName } from './view-transition';

describe('trip cover view-transition name (#488)', () => {
  it('pairs card and hero for the same trip id', () => {
    expect(tripCoverViewTransitionName('abc-123')).toBe('trip-cover-abc-123');
    expect(tripCoverViewTransitionName('abc-123')).toBe(
      tripCoverViewTransitionName('abc-123'),
    );
  });

  it('differs across trips and is a valid CSS identifier', () => {
    const a = tripCoverViewTransitionName('550e8400-e29b-41d4-a716-446655440000');
    const b = tripCoverViewTransitionName('550e8400-e29b-41d4-a716-446655440001');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
  });

  it('sanitizes characters that are illegal in a custom identifier', () => {
    expect(tripCoverViewTransitionName('a/b.c d')).toBe('trip-cover-a-b-c-d');
  });
});
