-- CreateEnum
CREATE TYPE "AgencyPaymentOnboardingStatus" AS ENUM ('NOT_STARTED', 'PENDING_VERIFICATION', 'CONNECTED', 'DISABLED');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('CREATED', 'PENDING', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'REJECTED', 'MISMATCH', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentReconciliationMismatchType" AS ENUM ('STATUS_MISMATCH', 'AMOUNT_MISMATCH', 'MERCHANT_MISMATCH', 'MISSING_WEBHOOK');

-- CreateEnum
CREATE TYPE "PaymentReconciliationStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "AgencyPaymentProfile" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalMerchantId" TEXT NOT NULL,
    "onboardingStatus" "AgencyPaymentOnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "paymentEnabled" BOOLEAN NOT NULL DEFAULT false,
    "refundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "lastVerifiedAt" TIMESTAMP(3),
    "webhookSecretRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyPaymentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "paymentProfileId" TEXT NOT NULL,
    "stage" "ExternalPaymentStage" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "provider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "hostedUrl" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'CREATED',
    "externalPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookInboxEntry" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "signatureValidated" BOOLEAN NOT NULL DEFAULT false,
    "processingStatus" "WebhookProcessingStatus" NOT NULL DEFAULT 'RECEIVED',
    "failureReason" TEXT,
    "payload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookInboxEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReconciliationMismatch" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" "PaymentReconciliationMismatchType" NOT NULL,
    "status" "PaymentReconciliationStatus" NOT NULL DEFAULT 'OPEN',
    "agencyId" TEXT,
    "bookingId" TEXT,
    "paymentAttemptId" TEXT,
    "externalPaymentId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentReconciliationMismatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgencyPaymentProfile_agencyId_key" ON "AgencyPaymentProfile"("agencyId");

-- CreateIndex
CREATE INDEX "AgencyPaymentProfile_provider_onboardingStatus_idx" ON "AgencyPaymentProfile"("provider", "onboardingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_idempotencyKey_key" ON "PaymentAttempt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentAttempt_bookingId_stage_idx" ON "PaymentAttempt"("bookingId", "stage");

-- CreateIndex
CREATE INDEX "PaymentAttempt_agencyId_status_createdAt_idx" ON "PaymentAttempt"("agencyId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_provider_providerPaymentId_key" ON "PaymentAttempt"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "WebhookInboxEntry_processingStatus_receivedAt_idx" ON "WebhookInboxEntry"("processingStatus", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookInboxEntry_provider_providerEventId_key" ON "WebhookInboxEntry"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "PaymentReconciliationMismatch_status_type_createdAt_idx" ON "PaymentReconciliationMismatch"("status", "type", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentReconciliationMismatch_paymentAttemptId_type_status_idx" ON "PaymentReconciliationMismatch"("paymentAttemptId", "type", "status");

-- AddForeignKey
ALTER TABLE "AgencyPaymentProfile" ADD CONSTRAINT "AgencyPaymentProfile_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentProfileId_fkey" FOREIGN KEY ("paymentProfileId") REFERENCES "AgencyPaymentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_externalPaymentId_fkey" FOREIGN KEY ("externalPaymentId") REFERENCES "ExternalPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReconciliationMismatch" ADD CONSTRAINT "PaymentReconciliationMismatch_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

