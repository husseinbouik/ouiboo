-- #370: RefundCase lifecycle (plan §§13–16).
-- Expand-contract: all changes are additive. The new RefundCase table and
-- the two AgencyProfile restriction columns are only used by application
-- code deployed after this migration; existing rows keep working
-- (newBookingsRestrictedAt stays NULL = not restricted).
-- Rollback impact: dropping RefundCase / the new columns is safe only
-- after the application is rolled back first; the added enum is harmless
-- if left in place.

-- CreateEnum
CREATE TYPE "RefundCaseStatus" AS ENUM ('REFUND_REQUESTED', 'ELIGIBILITY_REVIEW', 'REFUND_APPROVED', 'AGENCY_ACTION_REQUIRED', 'REFUND_INITIATED', 'REFUND_COMPLETED', 'REFUND_REJECTED', 'REFUND_FAILED', 'REFUND_OVERDUE');

-- AlterTable
ALTER TABLE "AgencyProfile" ADD COLUMN "newBookingsRestrictedAt" TIMESTAMP(3);
ALTER TABLE "AgencyProfile" ADD COLUMN "newBookingsRestrictionReason" TEXT;

-- CreateTable
CREATE TABLE "RefundCase" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "originalPaymentId" TEXT,
    "externalPaymentReference" TEXT,
    "requestedAmount" DECIMAL(18,2) NOT NULL,
    "approvedAmount" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "reason" TEXT NOT NULL,
    "eligibilityRule" TEXT,
    "policyVersion" TEXT NOT NULL,
    "status" "RefundCaseStatus" NOT NULL DEFAULT 'REFUND_REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "agencyNotifiedAt" TIMESTAMP(3),
    "refundDueAt" TIMESTAMP(3),
    "initiatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "providerRefundId" TEXT,
    "providerStatus" TEXT,
    "failureReason" TEXT,
    "disputeReason" TEXT,
    "dedupeKey" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RefundCase_bookingId_idx" ON "RefundCase"("bookingId");

-- CreateIndex
CREATE INDEX "RefundCase_travelerId_status_idx" ON "RefundCase"("travelerId", "status");

-- CreateIndex
CREATE INDEX "RefundCase_agencyId_status_idx" ON "RefundCase"("agencyId", "status");

-- CreateIndex
CREATE INDEX "RefundCase_status_refundDueAt_idx" ON "RefundCase"("status", "refundDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefundCase_dedupeKey_key" ON "RefundCase"("dedupeKey");

-- AddForeignKey
ALTER TABLE "RefundCase" ADD CONSTRAINT "RefundCase_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundCase" ADD CONSTRAINT "RefundCase_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundCase" ADD CONSTRAINT "RefundCase_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundCase" ADD CONSTRAINT "RefundCase_originalPaymentId_fkey" FOREIGN KEY ("originalPaymentId") REFERENCES "ExternalPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
