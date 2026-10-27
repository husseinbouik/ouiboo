-- B4 (Council Session #2): licence issue date + issuing authority for
-- the Law 31-08 Art. 29/32 seller identity block (checkout, trip page,
-- booking confirmation).
-- Expand-contract: both columns are additive and nullable. Existing
-- agencies keep working: legacy verified rows hold NULL ("not yet
-- supplied") until the agency submits the values; new submissions are
-- only reviewable when both are present, and an admin can no longer
-- mark a licence VERIFIED without them.
-- Rollback impact: dropping the columns is safe only after the
-- application is rolled back first; leaving them in place is harmless
-- for older code.

-- AlterTable
ALTER TABLE "AgencyProfile"
    ADD COLUMN "licenceIssuedAt" TIMESTAMP(3),
    ADD COLUMN "licenceIssuingAuthority" TEXT;
