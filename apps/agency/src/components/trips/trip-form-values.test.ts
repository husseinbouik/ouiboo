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

describe('tripToFormValues destination + meeting point (#675/#676)', () => {
  it('carries the destination slug and the full meeting point into the form', () => {
    const values = tripToFormValues({
      ...baseTrip,
      destinationSlug: 'chefchaouen',
      meetingPoint: { address: 'Place Outa el Hammam', mapsUrl: 'https://maps.example/outh', pickupAvailable: true },
    });
    expect(values.destinationSlug).toBe('chefchaouen');
    expect(values.meetingPoint).toEqual({
      address: 'Place Outa el Hammam',
      mapsUrl: 'https://maps.example/outh',
      pickupAvailable: true,
    });
  });

  it('maps null destination/meeting point to undefined (derive / not yet provided)', () => {
    const apiTrip = { ...baseTrip, destinationSlug: null, meetingPoint: null } as unknown as TripEditorData;
    const values = tripToFormValues(apiTrip);
    expect(values.destinationSlug).toBeUndefined();
    expect(values.meetingPoint).toBeUndefined();
  });

  it('defaults pickupAvailable to false when the stored point omits it', () => {
    const apiTrip = { ...baseTrip, meetingPoint: { address: 'Gare de Tanger' } } as unknown as TripEditorData;
    expect(tripToFormValues(apiTrip).meetingPoint).toEqual({
      address: 'Gare de Tanger',
      mapsUrl: undefined,
      pickupAvailable: false,
    });
  });
});

describe('tripToFormValues translations (#546)', () => {
  it('carries the stored language map into the form values', () => {
    const translations = {
      fr: { title: baseTrip.title, description: baseTrip.description },
      ar: { title: 'رحلة جمال عند الغروب', description: 'رحلة على ظهر الجمال عبر كثبان عرق الشبي.' },
    };
    const values = tripToFormValues({ ...baseTrip, translations });
    expect(values.translations).toEqual(translations);
  });

  it('maps a null/absent map to undefined so reset() leaves no stale languages', () => {
    const apiTrip = { ...baseTrip, translations: null } as unknown as TripEditorData;
    expect(tripToFormValues(apiTrip).translations).toBeUndefined();
    expect(tripToFormValues(baseTrip).translations).toBeUndefined();
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
