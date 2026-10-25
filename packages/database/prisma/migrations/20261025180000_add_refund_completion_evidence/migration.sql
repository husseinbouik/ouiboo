-- #416 (Council P0-09): refund completion integrity. A RefundCase may no
-- longer be completed on the agency's own say-so (an empty request, or a
-- merely typed provider string recorded as GATEWAY_REFUND). Completion now
-- requires a qualifying evidence set on the new append-only RefundEvidence
-- table: tier 1 PSP_CONFIRMATION, tier 2 BANK_PROVIDER_CONFIRMATION,
-- tier 3 BANK_REFERENCE (reference AND retained proof file), tier 5
-- ADMIN_REVIEW, or tier 4 TRAVELLER_CONFIRMATION corroborated by tier 5.
-- RefundCase gains the completion/audit bookkeeping columns, and the
-- ledger gains an honest BANK_CONFIRMATION source for tier 2–3
-- completions.
-- Expand-contract: all changes are additive. Existing completed cases
-- keep completionTier NULL (grandfathered — no retro-evidence); existing
-- rows keep working under the new code.
-- Rollback impact: dropping the new table/columns is safe only after the
-- application is rolled back first; the added enum types and the added
-- PaymentLedgerSource value are harmless if left in place.

-- CreateEnum
CREATE TYPE "RefundEvidenceTier" AS ENUM ('PSP_CONFIRMATION', 'BANK_PROVIDER_CONFIRMATION', 'BANK_REFERENCE', 'TRAVELLER_CONFIRMATION', 'ADMIN_REVIEW');

-- CreateEnum
CREATE TYPE "RefundEvidenceSource" AS ENUM ('SYSTEM_WEBHOOK', 'AGENCY', 'TRAVELLER', 'ADMIN');

-- AlterEnum
ALTER TYPE "PaymentLedgerSource" ADD VALUE 'BANK_CONFIRMATION';

-- AlterTable
ALTER TABLE "RefundCase" ADD COLUMN     "completionTier" "RefundEvidenceTier",
ADD COLUMN     "travellerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "disputedAt" TIMESTAMP(3),
ADD COLUMN     "auditRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auditedAt" TIMESTAMP(3),
ADD COLUMN     "auditedBy" TEXT;

-- CreateTable
CREATE TABLE "RefundEvidence" (
    "id" TEXT NOT NULL,
    "refundCaseId" TEXT NOT NULL,
    "tier" "RefundEvidenceTier" NOT NULL,
    "source" "RefundEvidenceSource" NOT NULL,
    "reference" TEXT,
    "proofUrl" TEXT,
    "amount" DECIMAL(18,2),
    "note" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefundEvidence_refundCaseId_tier_idx" ON "RefundEvidence"("refundCaseId", "tier");

-- AddForeignKey
ALTER TABLE "RefundEvidence" ADD CONSTRAINT "RefundEvidence_refundCaseId_fkey" FOREIGN KEY ("refundCaseId") REFERENCES "RefundCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
