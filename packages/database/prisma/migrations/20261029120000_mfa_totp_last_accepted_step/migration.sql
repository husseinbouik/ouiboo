-- #642: single-use TOTP. Persist the last accepted TOTP step per user
-- so a code inside the ±1-step acceptance window cannot be replayed:
-- verification refuses any code whose step is at or below this value.
-- Additive only: one nullable column, no changes to existing data.
-- Rollback: drop the column (MFA verification falls back to window-only
-- checks; no other feature reads it).

-- AlterTable
ALTER TABLE "User" ADD COLUMN "mfaTotpLastAcceptedStep" INTEGER;
