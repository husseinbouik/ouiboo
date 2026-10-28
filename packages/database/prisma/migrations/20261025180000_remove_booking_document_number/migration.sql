-- Founder decision 2026-10-25: Ouiboo does not collect or store traveller
-- identity-document numbers (CIN / passport). CIN processing would trigger
-- a CNDP prior authorisation (Law 09-08 Art. 12(1)(e)); the licensed agency
-- is the party that checks ID physically at departure.
-- All Booking.documentNumber collection paths (checkout form, booking DTO,
-- booking responses) are removed in the same change, so after this migration
-- no application code reads or writes the column.
-- Data impact: staging and production booking data at this point is
-- synthetic test data only, so the column is dropped outright instead of
-- being retained under expand-contract.
-- Rollback: re-add the column (values are not recoverable):
--   ALTER TABLE "Booking" ADD COLUMN "documentNumber" TEXT;

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "documentNumber";
