-- Additive destination field; existing trips remain valid.
ALTER TABLE "TripTemplate" ADD COLUMN IF NOT EXISTS "endLocation" TEXT;

-- Refuse to silently discard or rewrite duplicate itinerary positions. If this
-- guard fails, reconcile the duplicate days before retrying the migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ItineraryDay"
    GROUP BY "templateId", "dayNumber"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate itinerary day numbers must be resolved before adding the unique constraint';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ItineraryDay_templateId_dayNumber_key"
  ON "ItineraryDay"("templateId", "dayNumber");
