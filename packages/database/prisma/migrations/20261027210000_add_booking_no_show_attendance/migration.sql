-- #434 (Council P1-08): NO_SHOW booking state + attendance recording.
-- Expand-only: one new BookingStatus value, one new enum, three nullable
-- columns on Booking. Existing rows keep attendance NULL (= not recorded),
-- which preserves their stored status exactly; review eligibility for
-- those rows is governed by the application gate (attendance must be
-- recorded ATTENDED — agencies can record it for COMPLETED bookings).
-- No backfill is performed on purpose: fabricating attendance for past
-- bookings would manufacture the very review eligibility this change
-- removes from date-based completion.
-- Rollback: after rolling back the application, run:
--   ALTER TABLE "Booking" DROP COLUMN "attendanceRecordedBy";
--   ALTER TABLE "Booking" DROP COLUMN "attendanceRecordedAt";
--   ALTER TABLE "Booking" DROP COLUMN "attendance";
--   DROP TYPE "BookingAttendance";
-- The 'NO_SHOW' BookingStatus value cannot be removed from a Postgres
-- enum in place; leaving it is harmless once the application is rolled
-- back (no pre-#434 code writes or reads it). Any rows already in
-- NO_SHOW must be moved back to CONFIRMED/COMPLETED by an operator
-- before rollback, or they will render as an unknown status.
-- NOTE: ALTER TYPE ... ADD VALUE must not be followed by use of the new
-- value in the same transaction; nothing below references 'NO_SHOW' as
-- a BookingStatus value (the BookingAttendance enum is a separate type).

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'NO_SHOW';

-- CreateEnum
CREATE TYPE "BookingAttendance" AS ENUM ('ATTENDED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "attendance" "BookingAttendance";
ALTER TABLE "Booking" ADD COLUMN "attendanceRecordedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "attendanceRecordedBy" TEXT;
