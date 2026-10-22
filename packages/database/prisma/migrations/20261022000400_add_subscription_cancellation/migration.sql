-- AlterTable: self-serve subscription cancellation (#324).
-- Additive (expand step): flag + request timestamp on AgencyProfile.
-- Cancellation takes effect at the period boundary; the API only records
-- the request, and the SubscriptionGuard ends access once the boundary
-- has passed.
ALTER TABLE "AgencyProfile" ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgencyProfile" ADD COLUMN "cancellationRequestedAt" TIMESTAMP(3);
