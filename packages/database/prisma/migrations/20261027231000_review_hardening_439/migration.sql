-- #439 (Council P1-14): review-system hardening.
-- Additive only: a new PENDING pre-publication moderation status and the
-- author edit counter. Existing rows keep status VISIBLE (the column
-- default is unchanged) and editCount 0; no data rewrite, no rollback
-- hazard beyond dropping the column/value again.
ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "editCount" INTEGER NOT NULL DEFAULT 0;
