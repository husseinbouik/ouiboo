import { getTripCompleteness } from './trip-completeness';

describe('getTripCompleteness (Design Council Phase 4)', () => {
  it('scores a complete listing at 100%', () => {
    const result = getTripCompleteness({
      images: ['a.jpg', 'b.jpg', 'c.jpg'],
      inclusions: ['Guide'],
      sessions: [{ price: 450 }],
    });
    expect(result.percent).toBe(100);
    expect(result).toMatchObject({ photos: true, inclusions: true, sessions: true, pricing: true });
  });

  it('scores an empty listing at 0%', () => {
    expect(getTripCompleteness({ images: [], inclusions: [], sessions: [] }).percent).toBe(0);
    expect(getTripCompleteness({}).percent).toBe(0);
  });

  it('gives partial photo credit and ignores blank entries', () => {
    const result = getTripCompleteness({ images: [' ', 'a.jpg'], inclusions: [' '], sessions: [{ price: 0 }] });
    expect(result.photoCount).toBe(1);
    expect(result.inclusions).toBe(false);
    expect(result.pricing).toBe(false);
    expect(result.sessions).toBe(true);
    expect(result.percent).toBe(Math.round(((1 / 3 + 0 + 1 + 0) / 4) * 100));
  });
});
