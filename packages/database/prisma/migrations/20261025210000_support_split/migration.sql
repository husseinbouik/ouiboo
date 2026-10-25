-- #419 (Council P0-16): minimum support operation — the support split.
-- Two additive changes:
-- 1. AgencyProfile gains the trip emergency contact (name + phone) that
--    travellers holding a booking see in their departure pack and call
--    FIRST during an active trip. Until now no agency phone existed
--    anywhere in the product, so the departure pack was impossible.
-- 2. RefundCase gains travelerNotifiedAt, mirroring agencyNotifiedAt:
--    the stamp of the traveller notification sent when an automatic
--    (minimum-group-not-reached) refund case opens. The stamp makes the
--    best-effort notification idempotent across the cascade, the admin
--    close-group path and the maintenance backstop.
-- Expand-contract: all changes are additive nullable columns; existing
-- rows keep working under old and new code.
-- Rollback impact: dropping these columns is safe only after the
-- application is rolled back first; leaving them in place is harmless.
-- NOTE: this migration is checked in only — it is applied manually to
-- each environment's database by the release owner (migrations do not
-- auto-apply on deploy in this project).

-- AlterTable
ALTER TABLE "AgencyProfile" ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT;

-- AlterTable
ALTER TABLE "RefundCase" ADD COLUMN     "travelerNotifiedAt" TIMESTAMP(3);
