-- CreateEnum
CREATE TYPE "PaymentCustodian" AS ENUM ('AGENCY', 'AGENCY_PSP');

-- CreateEnum
CREATE TYPE "ExternalPaymentStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentLedgerEntryType" AS ENUM ('PAYMENT_VERIFIED', 'PAYMENT_CAPTURED', 'PAYMENT_REJECTED', 'PAYMENT_FAILED', 'REFUND_INITIATED', 'REFUND_COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentLedgerSource" AS ENUM ('MANUAL_PROOF_REVIEW', 'ADMIN_PROOF_REVIEW', 'GATEWAY_WEBHOOK', 'GATEWAY_REFUND');

-- CreateTable
CREATE TABLE "ExternalPayment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "method" "PaymentMethod" NOT NULL DEFAULT 'MANUAL',
    "provider" TEXT,
    "externalReference" TEXT,
    "custodian" "PaymentCustodian" NOT NULL,
    "status" "ExternalPaymentStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentStatusLedgerEntry" (
    "id" TEXT NOT NULL,
    "externalPaymentId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "type" "PaymentLedgerEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "custodian" "PaymentCustodian" NOT NULL,
    "provider" TEXT,
    "externalTransactionId" TEXT,
    "status" "ExternalPaymentStatus" NOT NULL,
    "source" "PaymentLedgerSource" NOT NULL,
    "idempotencyKey" TEXT,
    "correlationId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentStatusLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPayment_bookingId_key" ON "ExternalPayment"("bookingId");

-- CreateIndex
CREATE INDEX "ExternalPayment_agencyId_status_createdAt_idx" ON "ExternalPayment"("agencyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalPayment_travelerId_idx" ON "ExternalPayment"("travelerId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentStatusLedgerEntry_idempotencyKey_key" ON "PaymentStatusLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentStatusLedgerEntry_bookingId_createdAt_idx" ON "PaymentStatusLedgerEntry"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentStatusLedgerEntry_agencyId_createdAt_idx" ON "PaymentStatusLedgerEntry"("agencyId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentStatusLedgerEntry_externalPaymentId_createdAt_idx" ON "PaymentStatusLedgerEntry"("externalPaymentId", "createdAt");

-- AddForeignKey
ALTER TABLE "ExternalPayment" ADD CONSTRAINT "ExternalPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalPayment" ADD CONSTRAINT "ExternalPayment_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentStatusLedgerEntry" ADD CONSTRAINT "PaymentStatusLedgerEntry_externalPaymentId_fkey" FOREIGN KEY ("externalPaymentId") REFERENCES "ExternalPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

