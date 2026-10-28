-- #546: multilingual trip content (language map).
-- TripTemplate gains a `translations` JSONB map keyed by ISO language
-- code: { "fr": { "title": ..., "description": ... }, "ar": { ... } }.
-- French is canonical: the existing "title"/"description" columns hold
-- the French text and mirror translations.fr on every application
-- write. The backfill below seeds translations.fr from those columns
-- for every existing trip, so a legacy trip renders exactly as before
-- (in French) in every locale.
-- Additive only: one nullable column + a data backfill; no existing
-- column or row shape changes.
-- Rollback: DROP COLUMN "translations" (safe once the application is
-- rolled back; the map is derived data — the columns stay canonical).

-- AlterTable
ALTER TABLE "TripTemplate" ADD COLUMN "translations" JSONB;

-- Backfill: seed the French entry from the canonical columns.
UPDATE "TripTemplate"
SET "translations" = jsonb_build_object(
    'fr', jsonb_build_object('title', "title", 'description', "description")
)
WHERE "translations" IS NULL;
