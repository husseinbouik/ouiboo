-- #369: staged payments (deposit + minimum-group confirmation + balance).
-- Expand-contract: all changes are additive. New enum values are declared
-- here and only used by application code deployed after this migration;
-- existing rows keep working (ExternalPayment.stage defaults to FULL,
-- TripSession.groupStatus defaults to NOT_REQUIRED).
-- Rollback impact: dropping BookingPaymentPlan / the new columns is safe
-- only after the application is rolled back first; the added enum values
-- are harmless if left in place.

-- CreateEnum
CREATE TYPE "SessionGroupStatus" AS ENUM ('NOT_REQUIRED', 'PENDING_MINIMUM', 'CONFIRMED', 'NOT_CONFIRMED');

-- CreateEnum
CREATE TYPE "BookingPaymentPlanStatus" AS ENUM ('DEPOSIT_DUE', 'DEPOSIT_PAID', 'BALANCE_DUE', 'FULLY_PAID', 'REFUND_DUE', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExternalPaymentStage" AS ENUM ('FULL', 'DEPOSIT', 'BALANCE');

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_MINIMUM';
ALTER TYPE "BookingStatus" ADD VALUE 'NOT_CONFIRMED';

-- AlterEnum
ALTER TYPE "BookingPaymentStatus" ADD VALUE 'PARTIALLY_PAID';

-- AlterEnum
ALTER TYPE "PaymentLedgerEntryType" ADD VALUE 'DEPOSIT_CAPTURED';
ALTER TYPE "PaymentLedgerEntryType" ADD VALUE 'BALANCE_CAPTURED';
ALTER TYPE "PaymentLedgerEntryType" ADD VALUE 'REFUND_DUE';

-- DropIndex
DROP INDEX "ExternalPayment_bookingId_key";

-- AlterTable
ALTER TABLE "TripSession" ADD COLUMN     "confirmationDeadline" TIMESTAMP(3),
ADD COLUMN     "groupStatus" "SessionGroupStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

-- AlterTable
ALTER TABLE "ExternalPayment" ADD COLUMN     "stage" "ExternalPaymentStage" NOT NULL DEFAULT 'FULL';

-- CreateTable
CREATE TABLE "BookingPaymentPlan" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "depositAmount" DECIMAL(18,2) NOT NULL,
    "balanceAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "minimumParticipants" INTEGER NOT NULL,
    "confirmationDeadline" TIMESTAMP(3) NOT NULL,
    "balanceDueAt" TIMESTAMP(3),
    "groupConfirmedAt" TIMESTAMP(3),
    "status" "BookingPaymentPlanStatus" NOT NULL DEFAULT 'DEPOSIT_DUE',
    "paymentPolicyVersion" TEXT NOT NULL,
    "refundPolicyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingPaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingPaymentPlan_bookingId_key" ON "BookingPaymentPlan"("bookingId");

-- CreateIndex
CREATE INDEX "BookingPaymentPlan_sessionId_status_idx" ON "BookingPaymentPlan"("sessionId", "status");

-- CreateIndex
CREATE INDEX "BookingPaymentPlan_agencyId_status_idx" ON "BookingPaymentPlan"("agencyId", "status");

-- CreateIndex
CREATE INDEX "BookingPaymentPlan_status_confirmationDeadline_idx" ON "BookingPaymentPlan"("status", "confirmationDeadline");

-- CreateIndex
CREATE INDEX "TripSession_groupStatus_confirmationDeadline_idx" ON "TripSession"("groupStatus", "confirmationDeadline");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPayment_bookingId_stage_key" ON "ExternalPayment"("bookingId", "stage");

-- AddForeignKey
ALTER TABLE "BookingPaymentPlan" ADD CONSTRAINT "BookingPaymentPlan_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPaymentPlan" ADD CONSTRAINT "BookingPaymentPlan_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TripSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

