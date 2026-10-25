-- #422 (Council P0-20): proof != settlement. A payment proof image can be
-- ACCEPTED without the payment being settled; settlement happens only when
-- the agency confirms the credit in its bank account. Manual ExternalPayment
-- rows therefore carry the bank-confirmation facts (confirmed amount, bank
-- transfer reference, confirmation time/actor) that bind VERIFIED to a real
-- bank credit instead of to the uploaded screenshot.
-- Expand-contract: all changes are additive. The new enum value is declared
-- here and only used by application code deployed after this migration;
-- existing rows keep working (new ExternalPayment columns are nullable).
-- Rollback impact: dropping the new columns is safe only after the
-- application is rolled back first; the added enum value is harmless if
-- left in place.

-- AlterEnum
ALTER TYPE "VerificationStatus" ADD VALUE 'ACCEPTED';

-- AlterTable
ALTER TABLE "ExternalPayment" ADD COLUMN     "confirmedAmount" DECIMAL(18,2),
ADD COLUMN     "bankReference" TEXT,
ADD COLUMN     "bankConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "bankConfirmedBy" TEXT;
