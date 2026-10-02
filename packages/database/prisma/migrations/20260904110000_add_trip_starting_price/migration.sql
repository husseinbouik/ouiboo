-- Keep one authoritative currency per trip so prices are comparable and sessions
-- cannot silently drift into a different currency.
ALTER TABLE "TripTemplate"
  ADD COLUMN IF NOT EXISTS "currency" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "TripSession"
    GROUP BY "templateId"
    HAVING COUNT(DISTINCT "currency") > 1
  ) THEN
    RAISE EXCEPTION 'Cannot assign a trip currency while a trip has sessions in multiple currencies';
  END IF;
END $$;

UPDATE "TripTemplate" AS trip
SET "currency" = COALESCE(
  (
    SELECT MIN(session."currency")
    FROM "TripSession" AS session
    WHERE session."templateId" = trip."id"
  ),
  'MAD'
)
WHERE trip."currency" IS NULL;

ALTER TABLE "TripTemplate"
  ALTER COLUMN "currency" SET DEFAULT 'MAD',
  ALTER COLUMN "currency" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "TripTemplate_id_currency_key"
  ON "TripTemplate"("id", "currency");

ALTER TABLE "TripSession"
  DROP CONSTRAINT IF EXISTS "TripSession_templateId_fkey";

ALTER TABLE "TripSession"
  ADD CONSTRAINT "TripSession_templateId_currency_fkey"
  FOREIGN KEY ("templateId", "currency")
  REFERENCES "TripTemplate"("id", "currency")
  ON DELETE CASCADE
  ON UPDATE RESTRICT;

-- Denormalized minimum future open-session price used for scalable marketplace sorting.
ALTER TABLE "TripTemplate"
  ADD COLUMN IF NOT EXISTS "startingPrice" DECIMAL(18, 2);

UPDATE "TripTemplate" AS trip
SET "startingPrice" = (
  SELECT MIN(session."price")
  FROM "TripSession" AS session
  WHERE session."templateId" = trip."id"
    AND session."status" = 'OPEN'
    AND session."startDate" >= CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS "TripTemplate_status_startingPrice_idx";

CREATE INDEX IF NOT EXISTS "TripTemplate_status_currency_startingPrice_idx"
  ON "TripTemplate"("status", "currency", "startingPrice");
