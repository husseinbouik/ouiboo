-- #481: persist traveller terms acceptance on the booking.
-- Expand-contract: the only change is additive. Booking gains a nullable
-- `termsVersion` (the version of the booking terms the checkout
-- displayed and the traveller accepted — CURRENT_BOOKING_TERMS_VERSION
-- in @ouiboo/types) and a nullable `termsAcceptedAt` (the server
-- timestamp stamped at booking creation when a version is recorded).
-- Together they are the evidence of which terms a booking was made
-- under; until now only the account-level attestation was versioned
-- (User.termsVersion at signup), never the per-booking acceptance.
-- Existing bookings keep NULL for both columns — the version they
-- booked under was never captured and cannot be backfilled. Clients
-- that do not send a version also record NULL; booking creation is
-- never blocked on this.
-- Rollback impact: dropping the new columns is safe only after the
-- application is rolled back first; leaving them in place is harmless.

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "termsVersion" TEXT;
ALTER TABLE "Booking" ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);
