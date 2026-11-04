-- #776 (Council S6 Phase 3): review depth — sub-scores + traveller photos.
-- Additive only: four nullable sub-score columns on Review (existing rows
-- keep NULL = "not scored") and a new ReviewPhoto table whose rows share
-- the parent review's moderation lifecycle. No data rewrite; rollback is
-- dropping the ReviewPhoto table and the four columns.

ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "organisationRating" INTEGER;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "guideRating" INTEGER;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "valueRating" INTEGER;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "accuracyRating" INTEGER;

CREATE TABLE IF NOT EXISTS "ReviewPhoto" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReviewPhoto_reviewId_idx" ON "ReviewPhoto"("reviewId");

DO $$ BEGIN
    ALTER TABLE "ReviewPhoto" ADD CONSTRAINT "ReviewPhoto_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
