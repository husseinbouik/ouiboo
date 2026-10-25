-- #424 (Council P0-22): record the traveller's checkout locale on the
-- booking so transactional emails for the booking journey (booking
-- received, payment confirmation/reminder, trip reminder, unpaid
-- cancellation) render in the language the traveller booked in
-- (en/fr/ar) instead of English-only.
-- Additive and nullable: existing rows keep NULL, which the email layer
-- treats as "no recorded locale" and falls back to the default (en).
-- No backfill is possible — the locale was never captured before.
-- Rollback: ALTER TABLE "Booking" DROP COLUMN "locale";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "locale" TEXT;
