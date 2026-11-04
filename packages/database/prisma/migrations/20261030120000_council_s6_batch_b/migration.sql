-- Council S6 Batch B (#675 + #676): destination taxonomy, structured
-- meeting point, language-neutral itinerary slice.
-- Additive only (expand): two new enums, new nullable columns, one new
-- index, and a data backfill of TripTemplate.destinationSlug from
-- startLocation. No existing column or row shape changes.
-- #674 needs no schema change: its guardrails are publish-gate rules
-- over the existing cancellationPolicy JSON column.
-- Rollback: drop the new index/columns/enums after the application is
-- rolled back; the backfilled slugs are derived data (startLocation
-- stays the source text), so dropping them loses nothing.

-- CreateEnum
CREATE TYPE "ItineraryMeal" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('HOTEL', 'RIAD', 'GUESTHOUSE', 'CAMP', 'HOSTEL', 'OTHER');

-- AlterTable: #675 destination slug + #676 meeting point on TripTemplate
ALTER TABLE "TripTemplate" ADD COLUMN "destinationSlug" TEXT;
ALTER TABLE "TripTemplate" ADD COLUMN "meetingPoint" JSONB;

-- AlterTable: #676 language-neutral itinerary slice (all optional)
ALTER TABLE "ItineraryDay" ADD COLUMN "distanceKm" DOUBLE PRECISION;
ALTER TABLE "ItineraryDay" ADD COLUMN "driveTimeMinutes" INTEGER;
ALTER TABLE "ItineraryDay" ADD COLUMN "mealsIncluded" "ItineraryMeal"[] DEFAULT ARRAY[]::"ItineraryMeal"[];
ALTER TABLE "ItineraryDay" ADD COLUMN "accommodationName" TEXT;
ALTER TABLE "ItineraryDay" ADD COLUMN "accommodationType" "AccommodationType";

-- CreateIndex
CREATE INDEX "TripTemplate_destinationSlug_status_idx" ON "TripTemplate"("destinationSlug", "status");

-- Backfill (#675): stamp the destination slug from startLocation using
-- the same alias set as the API derivation (BETA_DESTINATIONS config in
-- @ouiboo/types + apps/api/src/trips/destinations.util.ts). Cluster
-- order is tangier → tetouan → chefchaouen; each UPDATE only touches
-- rows not already stamped, and non-cluster trips stay NULL (they are
-- simply not part of any destination facet).
UPDATE "TripTemplate" SET "destinationSlug" = 'tangier'
WHERE "destinationSlug" IS NULL
  AND ("startLocation" ILIKE '%tangier%' OR "startLocation" ILIKE '%tanger%' OR "startLocation" LIKE '%طنجة%');
UPDATE "TripTemplate" SET "destinationSlug" = 'tetouan'
WHERE "destinationSlug" IS NULL
  AND ("startLocation" ILIKE '%tetouan%' OR "startLocation" ILIKE '%tétouan%' OR "startLocation" ILIKE '%tetuan%' OR "startLocation" LIKE '%تطوان%');
UPDATE "TripTemplate" SET "destinationSlug" = 'chefchaouen'
WHERE "destinationSlug" IS NULL
  AND ("startLocation" ILIKE '%chefchaouen%' OR "startLocation" ILIKE '%chaouen%' OR "startLocation" LIKE '%شفشاون%');
