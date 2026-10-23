-- AlterTable: per-photo alt text for trip images (#332).
-- Additive (expand step): optional alt text aligned by index with the
-- existing `images` array on TripTemplate. Existing rows get an empty
-- array; renderers fall back to the generated "title - startLocation"
-- pattern for any image without a custom alt, so no backfill is needed
-- and the pre-migration API (which never selects this column) is
-- unaffected.
ALTER TABLE "TripTemplate" ADD COLUMN "imageAlts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
