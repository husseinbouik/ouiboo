-- #421 (Council P0-19): bank payment-destination verification.
-- Expand-contract: all changes are additive. `bankDetails` (the live,
-- traveller-visible instructions) is untouched by this migration; agency
-- submissions move to `pendingBankDetails` and only an admin
-- verification against a bank attestation promotes them.
-- Backfill: the column is added with DEFAULT 'PENDING_REVIEW' so
-- existing agencies land in PENDING_REVIEW — their live details were
-- never verified against an attestation, so there is no honest VERIFIED
-- backfill. The column default is then reset to 'UNVERIFIED' so new
-- profiles start unverified, matching the Prisma schema default.
-- Rollback impact: dropping the new column/type is safe only after the
-- application is rolled back first; leaving them in place is harmless
-- for older code.

-- CreateEnum
CREATE TYPE "BankDetailsStatus" AS ENUM ('UNVERIFIED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "AgencyProfile"
    ADD COLUMN "pendingBankDetails" TEXT,
    ADD COLUMN "bankAccountHolderName" TEXT,
    ADD COLUMN "bankAttestationUrl" TEXT,
    ADD COLUMN "bankDetailsStatus" "BankDetailsStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    ADD COLUMN "bankDetailsVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "bankDetailsVerifiedBy" TEXT,
    ADD COLUMN "bankDetailsRejectionReason" TEXT;

-- New profiles start UNVERIFIED; 'PENDING_REVIEW' above is only the
-- backfill value for agencies that already exist at migration time.
ALTER TABLE "AgencyProfile" ALTER COLUMN "bankDetailsStatus" SET DEFAULT 'UNVERIFIED';
