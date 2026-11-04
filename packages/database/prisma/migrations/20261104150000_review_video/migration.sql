-- #783 (Council S6 Phase 3): video reviews — ONE optional traveller
-- video per review. Additive only: a single nullable `videoKey` column
-- on Review (existing rows keep NULL = "no video"). The file itself
-- lives in private storage (upload intent `review-video`) and is only
-- served while the review is VISIBLE, sharing the review's moderation
-- lifecycle like the #776 photo rows. No data rewrite; rollback is
-- dropping the column.

ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "videoKey" TEXT;
