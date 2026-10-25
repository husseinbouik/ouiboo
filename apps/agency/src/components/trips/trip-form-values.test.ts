import { TripCategory, TripStatus } from '@ouiboo/types';
import { tripToFormValues, type TripEditorData } from './trip-form-values';

const IMAGE_A = 'https://cdn.example/a.jpg';
const IMAGE_B = 'https://cdn.example/b.jpg';

const baseTrip: TripEditorData = {
  title: 'Sunset Camel Trek in Merzouga',
  description: 'A sunset camel trek across the Erg Chebbi dunes.',
  category: TripCategory.Adventure,
  startLocation: 'Merzouga',
  endLocation: 'Merzouga',
  durationDays: 2,
  durationNights: 1,
  inclusions: ['Dinner'],
  exclusions: [],
  checklist: [],
  images: [],
  status: TripStatus.Draft,
  currency: 'MAD',
};

describe('tripToFormValues cancellation scale (#417)', () => {
  it('maps the stored bands into the form so the editor shows them', () => {
    const values = tripToFormValues({
      ...baseTrip,
      cancellationPolicy: {
        bands: [
          { minDaysBeforeStart: 14, refundPercent: 80 },
          { minDaysBeforeStart: 0, refundPercent: 10 },
        ],
      },
    });

    expect(values.cancellationPolicy).toEqual({
      bands: [
        { minDaysBeforeStart: 14, refundPercent: 80 },
        { minDaysBeforeStart: 0, refundPercent: 10 },
      ],
    });
  });

  it('leaves the policy undefined when the trip uses the platform defaults', () => {
    // The API returns null for a default-scale trip even though the
    // create-input type does not admit null; the mapper must cope.
    const apiTrip = { ...baseTrip, cancellationPolicy: null } as unknown as TripEditorData;
    expect(tripToFormValues(apiTrip).cancellationPolicy).toBeUndefined();
    expect(tripToFormValues(baseTrip).cancellationPolicy).toBeUndefined();
    expect(
      tripToFormValues({ ...baseTrip, cancellationPolicy: { bands: [] } })
        .cancellationPolicy,
    ).toBeUndefined();
  });
});

describe('tripToFormValues (#375)', () => {
  it('round-trips stored image alt texts, index-aligned with the images', () => {
    const values = tripToFormValues({
      ...baseTrip,
      images: [IMAGE_A, IMAGE_B],
      imageAlts: ['Sunset camel trek in Merzouga', 'Camp under the stars'],
    });

    expect(values.images).toEqual([IMAGE_A, IMAGE_B]);
    expect(values.imageAlts).toEqual(['Sunset camel trek in Merzouga', 'Camp under the stars']);
  });

  it("pads missing alt texts with '' so every image has an aligned entry", () => {
    const values = tripToFormValues({
      ...baseTrip,
      images: [IMAGE_A, IMAGE_B],
      imageAlts: ['Only the first photo'],
    });

    expect(values.imageAlts).toEqual(['Only the first photo', '']);
  });

  it('produces aligned empty alt texts when the trip has no stored alts', () => {
    const values = tripToFormValues({ ...baseTrip, images: [IMAGE_A] });

    expect(values.imageAlts).toEqual(['']);
  });

  it('carries over the remaining editable fields', () => {
    const values = tripToFormValues(baseTrip);

    expect(values.title).toBe(baseTrip.title);
    expect(values.category).toBe(TripCategory.Adventure);
    expect(values.status).toBe(TripStatus.Draft);
    expect(values.currency).toBe('MAD');
  });
});
