-- #415 (Council P0-08): real agency verification — licence document +
-- Ministry-check attestation, RC insurance artefact, auto-pause marker.
-- Expand-contract: all changes are additive. The licence document /
-- ministry columns are nullable; insurance columns mirror the licence
-- lifecycle reusing the existing LicenceStatus enum, defaulting to
-- NOT_SUBMITTED so existing agencies are untouched until they submit
-- insurance details. Nothing here changes any stored verification
-- status: already-VERIFIED agencies keep their stored status (the
-- null-expiry derivation fix lives in application code).
-- Rollback impact: dropping the new columns is safe only after the
-- application is rolled back first; leaving them in place is harmless
-- for older code.

-- AlterTable
ALTER TABLE "AgencyProfile"
    ADD COLUMN "licenceDocumentKey" TEXT,
    ADD COLUMN "licenceDocumentName" TEXT,
    ADD COLUMN "licenceMinistryCheckedAt" TIMESTAMP(3),
    ADD COLUMN "licenceMinistryCheckedBy" TEXT,
    ADD COLUMN "insuranceStatus" "LicenceStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    ADD COLUMN "insuranceInsurer" TEXT,
    ADD COLUMN "insurancePolicyNumber" TEXT,
    ADD COLUMN "insuranceInsuredName" TEXT,
    ADD COLUMN "insuranceValidFrom" TIMESTAMP(3),
    ADD COLUMN "insuranceExpiry" TIMESTAMP(3),
    ADD COLUMN "insuranceCoverageLimit" DECIMAL(18,2),
    ADD COLUMN "insuranceCertificateKey" TEXT,
    ADD COLUMN "insuranceVerifiedAt" TIMESTAMP(3),
    ADD COLUMN "insuranceRejectionReason" TEXT,
    ADD COLUMN "verificationPausedAt" TIMESTAMP(3),
    ADD COLUMN "verificationPauseReason" TEXT;
