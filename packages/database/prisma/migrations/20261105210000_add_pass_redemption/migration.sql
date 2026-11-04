-- #753: auditable Booking Pass redemption stamps on Booking.
-- Additive only: two nullable columns; existing rows stay unredeemed.
ALTER TABLE "Booking" ADD COLUMN "passRedeemedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "passRedeemedBy" TEXT;
