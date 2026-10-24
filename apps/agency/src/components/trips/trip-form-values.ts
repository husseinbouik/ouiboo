import type { CreateTripInput } from '@ouiboo/schemas';
import type { TripStatusType } from '@ouiboo/types';

/** Shape of the trip payload returned by GET /agency/trips/:id. */
export type TripEditorData = CreateTripInput & {
  title: string;
  description: string;
  category: CreateTripInput['category'];
  startLocation: string;
  durationDays: number;
  durationNights: number;
  status: TripStatusType;
};

/**
 * Map a fetched trip into trip-wizard form values for the edit page.
 *
 * #375: `imageAlts` must be part of the values handed to react-hook-form's
 * reset() — reset replaces the whole form state, so omitting it left the
 * Media step's per-photo alt fields empty even though the API had returned
 * the stored values. Alts are index-aligned with `images` (padded with ''
 * where a photo has no custom alt), matching the wizard's invariant.
 */
export function tripToFormValues(trip: TripEditorData): CreateTripInput {
  const images = trip.images || [];
  return {
    title: trip.title,
    description: trip.description,
    category: trip.category,
    startLocation: trip.startLocation,
    endLocation: trip.endLocation,
    durationDays: trip.durationDays,
    durationNights: trip.durationNights,
    inclusions: trip.inclusions || [],
    exclusions: trip.exclusions || [],
    checklist: trip.checklist || [],
    images,
    imageAlts: images.map((_, i) => trip.imageAlts?.[i] ?? ''),
    itinerary: trip.itinerary || [],
    status: trip.status,
    currency: trip.currency || 'MAD',
  };
}
