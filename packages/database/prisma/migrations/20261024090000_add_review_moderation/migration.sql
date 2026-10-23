-- #393: Auditable review moderation lifecycle.
-- Expand-contract: all changes are additive. Existing reviews default to
-- VISIBLE, which preserves today's behaviour (every existing review is
-- publicly shown and counted in ratings). The moderation columns stay
-- NULL until an admin moderates a review.
-- Rollback impact: dropping the new columns / ReviewStatus enum is safe
-- only after the application is rolled back first; the enum is harmless
-- if left in place.

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('VISIBLE', 'HIDDEN', 'REMOVED');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'VISIBLE';
ALTER TABLE "Review" ADD COLUMN "moderatedById" TEXT;
ALTER TABLE "Review" ADD COLUMN "moderatedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "moderationReason" TEXT;

-- CreateIndex
CREATE INDEX "Review_tripTemplateId_status_idx" ON "Review"("tripTemplateId", "status");

-- CreateIndex
CREATE INDEX "Review_moderatedById_idx" ON "Review"("moderatedById");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
