-- AlterTable: age-gate fields on User (#321). Additive and nullable (expand
-- step); existing rows keep NULL until the fields are backfilled or the user
-- re-attests. New signups always populate all three.
ALTER TABLE "User" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "ageAttestedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "termsVersion" TEXT;
