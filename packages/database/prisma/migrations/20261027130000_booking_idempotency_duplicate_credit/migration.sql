-- #494 (Council Session #2, B16): booking/proof idempotency +
-- duplicate-credit flag. Expand-contract: all changes additive; the
-- idempotency columns are nullable (null on existing rows = legacy
-- behaviour) and the unique index admits multiple NULL keys.
-- Rollback: drop the new table/columns/index only after the app.

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Booking" ADD COLUMN "idempotencyPayloadHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_travelerId_idempotencyKey_key" ON "Booking"("travelerId", "idempotencyKey");

-- AlterTable
ALTER TABLE "PaymentProof" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "PaymentProof" ADD COLUMN "idempotencyPayloadHash" TEXT;

-- CreateEnum
CREATE TYPE "DuplicateCreditFlagStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "DuplicateCreditFlag" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "externalPaymentId" TEXT,
    "agencyId" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "bankReference" TEXT,
    "note" TEXT,
    "status" "DuplicateCreditFlagStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuplicateCreditFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DuplicateCreditFlag_agencyId_status_idx" ON "DuplicateCreditFlag"("agencyId", "status");

-- CreateIndex
CREATE INDEX "DuplicateCreditFlag_bookingId_idx" ON "DuplicateCreditFlag"("bookingId");

-- CreateIndex
CREATE INDEX "DuplicateCreditFlag_status_createdAt_idx" ON "DuplicateCreditFlag"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "DuplicateCreditFlag" ADD CONSTRAINT "DuplicateCreditFlag_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuplicateCreditFlag" ADD CONSTRAINT "DuplicateCreditFlag_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
