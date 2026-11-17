-- Additive idempotency claim for staged-payment balance notifications.
-- Existing plans remain unclaimed and are notified only when a future
-- confirmation path explicitly calls the notifier.
ALTER TABLE "BookingPaymentPlan"
ADD COLUMN "balanceNotifiedAt" TIMESTAMP(3);

-- Preserve the evidence independently for each FULL/DEPOSIT/BALANCE row.
-- This is additive; existing payment records remain valid with null proof
-- metadata until a new proof is uploaded.
ALTER TABLE "ExternalPayment"
ADD COLUMN "proofImageUrl" TEXT,
ADD COLUMN "proofUploadedAt" TIMESTAMP(3),
ADD COLUMN "proofStatus" "VerificationStatus",
ADD COLUMN "proofRejectionReason" TEXT;
