-- This migration is additive except for converting two constrained status
-- columns from text to PostgreSQL enums. The preflight checks intentionally
-- stop deployment if legacy values exist instead of coercing or deleting data.
-- They also fail fast when a new unique index (User.passwordResetTokenHash)
-- would encounter duplicates, so the transaction aborts before any DDL runs.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "NotificationLog"
    WHERE "status" NOT IN ('SENT', 'FAILED', 'BOUNCED')
  ) THEN
    RAISE EXCEPTION 'NotificationLog contains unsupported status values';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "PaymentTransaction"
    WHERE "status" NOT IN ('INITIATED', 'SUCCESS', 'FAILED', 'PENDING')
  ) THEN
    RAISE EXCEPTION 'PaymentTransaction contains unsupported status values';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT "passwordResetTokenHash"
      FROM "User"
      WHERE "passwordResetTokenHash" IS NOT NULL
      GROUP BY "passwordResetTokenHash"
      HAVING COUNT(*) > 1
    ) duplicate_hashes
  ) THEN
    RAISE EXCEPTION 'User contains duplicate passwordResetTokenHash values; resolve duplicates before creating the unique index';
  END IF;
END $$;

CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('SENT', 'FAILED', 'BOUNCED');
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('INITIATED', 'SUCCESS', 'FAILED', 'PENDING');

ALTER TABLE "Booking"
  ADD COLUMN "currency" TEXT;

UPDATE "Booking" AS booking
SET "currency" = session."currency"
FROM "TripSession" AS session
WHERE booking."sessionId" = session."id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Booking" WHERE "currency" IS NULL) THEN
    RAISE EXCEPTION 'Booking currency backfill failed for one or more rows';
  END IF;
END $$;

ALTER TABLE "Booking"
  ALTER COLUMN "currency" SET DEFAULT 'MAD',
  ALTER COLUMN "currency" SET NOT NULL;

ALTER TABLE "Wallet"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'MAD';

ALTER TABLE "PayoutRequest"
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'MAD';

ALTER TABLE "NotificationLog"
  ALTER COLUMN "status" TYPE "NotificationDeliveryStatus"
  USING ("status"::text::"NotificationDeliveryStatus");

ALTER TABLE "PaymentTransaction"
  ALTER COLUMN "status" TYPE "PaymentTransactionStatus"
  USING ("status"::text::"PaymentTransactionStatus");

CREATE UNIQUE INDEX "User_passwordResetTokenHash_key"
  ON "User"("passwordResetTokenHash");

CREATE INDEX "Booking_sessionId_status_idx"
  ON "Booking"("sessionId", "status");

CREATE INDEX "Review_tripTemplateId_rating_idx"
  ON "Review"("tripTemplateId", "rating");
