import { TripCategory, TripStatus } from '@ouiboo/types';
import { tripToFormValues, type TripEditorData } from './trip-form-values';

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

describe('tripToFormValues (#375)', () => {
  it('round-trips stored image alt texts, index-aligned with the images', () => {
    const values = tripToFormValues({
      ...baseTrip,
      images: ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg'],
      imageAlts: ['Sunset camel trek in Merzouga', 'Camp under the stars'],
    });

    expect(values.images).toEqual(['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg']);
    expect(values.imageAlts).toEqual(['Sunset camel trek in Merzouga', 'Camp under the stars']);
  });

  it("pads missing alt texts with '' so every image has an aligned entry", () => {
    const values = tripToFormValues({
      ...baseTrip,
      images: ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg'],
      imageAlts: ['Only the first photo'],
    });

    expect(values.imageAlts).toEqual(['Only the first photo', '']);
  });

  it('produces aligned empty alt texts when the trip has no stored alts', () => {
    const values = tripToFormValues({ ...baseTrip, images: ['https://cdn.example/a.jpg'] });

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
