-- Council S6 Batch D (trust & proof): #688/#689/#693/#700.
-- Additive only (expand): one seller-block phone column on AgencyProfile,
-- and the attendance-dispute + pass check-in stamps on Booking.
-- #665 (payment-proof privacy) and #690 (PWA) and #699 (traveller
-- RefundCase view) need no schema change: they build on the existing
-- private-upload path, the traveller app shell, and the RefundCase
-- machinery respectively.
-- Rollback: drop the new columns after the application is rolled back.

-- AlterTable: #700 seller block — the agency's public business phone
-- (Law 31-08 Art. 29(2) seller block at checkout). Distinct from the
-- emergency contact (booking-holders only) and from any personal number.
ALTER TABLE "AgencyProfile" ADD COLUMN "businessPhone" TEXT;

-- AlterTable: #693 attendance dispute + #689 pass check-in second signal.
ALTER TABLE "Booking" ADD COLUMN "attendanceDisputedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "attendanceDisputeReason" TEXT;
ALTER TABLE "Booking" ADD COLUMN "passCheckInAt" TIMESTAMP(3);
