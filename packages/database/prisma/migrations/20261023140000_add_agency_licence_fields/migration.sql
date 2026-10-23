-- #371: agency legal identity + Law 11-16 travel licence fields.
-- Expand-contract: all changes are additive. Existing agencies keep
-- working: new identity fields are nullable and travelLicenceStatus
-- defaults to NOT_SUBMITTED, which only gates NEW activations
-- (trip publish / payment activation), never existing ACTIVE trips.
-- Rollback impact: dropping the new columns/enums is safe only after
-- the application is rolled back first; leaving them in place is
-- harmless for older code.

-- CreateEnum
CREATE TYPE "TravelLicenceType" AS ENUM ('ODV', 'DV');

-- CreateEnum
CREATE TYPE "LicenceStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "AgencyProfile"
    ADD COLUMN "legalName" TEXT,
    ADD COLUMN "rc" TEXT,
    ADD COLUMN "taxId" TEXT,
    ADD COLUMN "legalRepresentative" TEXT,
    ADD COLUMN "businessAddress" TEXT,
    ADD COLUMN "travelLicenceType" "TravelLicenceType",
    ADD COLUMN "travelLicenceNumber" TEXT,
    ADD COLUMN "travelLicenceStatus" "LicenceStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    ADD COLUMN "licenceVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "licenceExpiry" TIMESTAMP(3),
    ADD COLUMN "licenceRejectionReason" TEXT;
