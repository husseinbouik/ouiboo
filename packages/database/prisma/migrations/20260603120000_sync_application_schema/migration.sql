-- Bring the historical baseline up to the application schema before the
-- production indexes and decimal conversion migrations run.

ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'AWAITING_VALIDATION';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'REFUND';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'PAYMENT_GATEWAY';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'BOOKING';

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('MANUAL', 'GATEWAY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('PAYMENT_REMINDER', 'TRIP_REMINDER', 'BOOKING_CONFIRMATION', 'CANCELLATION', 'REVIEW_REQUEST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "BookingPaymentStatus" AS ENUM ('UNPAID', 'PAID', 'REFUNDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "otpExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "otpLastSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "displayCurrency" TEXT NOT NULL DEFAULT 'MAD';

ALTER TABLE "AgencyProfile"
  ADD COLUMN IF NOT EXISTS "bankDetails" TEXT;

ALTER TABLE "TripTemplate"
  ADD COLUMN IF NOT EXISTS "exclusions" TEXT[],
  ADD COLUMN IF NOT EXISTS "checklist" TEXT[],
  ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastReviewDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellationPolicy" JSONB,
  ADD COLUMN IF NOT EXISTS "minBookings" INTEGER NOT NULL DEFAULT 1;

UPDATE "TripTemplate" SET "inclusions" = ARRAY[]::TEXT[] WHERE "inclusions" IS NULL;
UPDATE "TripTemplate" SET "images" = ARRAY[]::TEXT[] WHERE "images" IS NULL;
UPDATE "TripTemplate" SET "exclusions" = ARRAY[]::TEXT[] WHERE "exclusions" IS NULL;
UPDATE "TripTemplate" SET "checklist" = ARRAY[]::TEXT[] WHERE "checklist" IS NULL;
ALTER TABLE "TripTemplate"
  ALTER COLUMN "inclusions" SET NOT NULL,
  ALTER COLUMN "images" SET NOT NULL,
  ALTER COLUMN "exclusions" SET NOT NULL,
  ALTER COLUMN "checklist" SET NOT NULL;

ALTER TABLE "TripSession"
  ADD COLUMN IF NOT EXISTS "deposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'MAD',
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "minBookings" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'TripSession'
      AND column_name = 'status'
      AND data_type <> 'USER-DEFINED'
  ) THEN
    ALTER TABLE "TripSession" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "TripSession" ALTER COLUMN "status" TYPE "SessionStatus"
      USING "status"::text::"SessionStatus";
    ALTER TABLE "TripSession" ALTER COLUMN "status" SET DEFAULT 'OPEN';
  END IF;
END $$;

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "fullName" TEXT,
  ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "documentNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentProofUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "paymentGatewayTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentGatewayMetadata" JSONB,
  ADD COLUMN IF NOT EXISTS "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS "lastReminderSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notificationsSent" JSONB,
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledBy" TEXT,
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "refundAmount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "refundStatus" "RefundStatus",
  ADD COLUMN IF NOT EXISTS "refundProcessedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "PaymentProof"
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

ALTER TABLE "WalletTransaction"
  ADD COLUMN IF NOT EXISTS "referenceId" TEXT;

CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "replacedByTokenId" TEXT,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RefreshToken_replacedByTokenId_fkey" FOREIGN KEY ("replacedByTokenId") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");

CREATE TABLE IF NOT EXISTS "ItineraryDay" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "dayNumber" INTEGER NOT NULL,
  "title" TEXT,
  "description" TEXT NOT NULL,
  "activities" TEXT[] NOT NULL,
  CONSTRAINT "ItineraryDay_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ItineraryDay_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TripTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "travelerId" TEXT NOT NULL,
  "tripTemplateId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "response" TEXT,
  "isVerifiedBooking" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Review_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Review_tripTemplateId_fkey" FOREIGN KEY ("tripTemplateId") REFERENCES "TripTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Review_bookingId_key" ON "Review"("bookingId");
CREATE INDEX IF NOT EXISTS "Review_tripTemplateId_idx" ON "Review"("tripTemplateId");
CREATE INDEX IF NOT EXISTS "Review_travelerId_idx" ON "Review"("travelerId");

CREATE TABLE IF NOT EXISTS "Wishlist" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tripTemplateId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Wishlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Wishlist_tripTemplateId_fkey" FOREIGN KEY ("tripTemplateId") REFERENCES "TripTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Wishlist_userId_tripTemplateId_key" ON "Wishlist"("userId", "tripTemplateId");
CREATE INDEX IF NOT EXISTS "Wishlist_userId_idx" ON "Wishlist"("userId");

CREATE TABLE IF NOT EXISTS "NotificationPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "paymentReminder" BOOLEAN NOT NULL DEFAULT true,
  "tripReminder" BOOLEAN NOT NULL DEFAULT true,
  "bookingConfirmation" BOOLEAN NOT NULL DEFAULT true,
  "cancellationAlert" BOOLEAN NOT NULL DEFAULT true,
  "reviewRequest" BOOLEAN NOT NULL DEFAULT true,
  "smsNotifications" BOOLEAN NOT NULL DEFAULT false,
  "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

CREATE TABLE IF NOT EXISTS "NotificationLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "notificationType" "NotificationType" NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "subject" TEXT,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "failureReason" TEXT,
  "metadata" JSONB,
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "NotificationLog_userId_idx" ON "NotificationLog"("userId");
CREATE INDEX IF NOT EXISTS "NotificationLog_sentAt_idx" ON "NotificationLog"("sentAt");

CREATE TABLE IF NOT EXISTS "PaymentTransaction" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "transactionId" TEXT,
  "status" TEXT NOT NULL,
  "provider" TEXT,
  "providerData" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PaymentTransaction_bookingId_idx" ON "PaymentTransaction"("bookingId");
CREATE INDEX IF NOT EXISTS "PaymentTransaction_transactionId_idx" ON "PaymentTransaction"("transactionId");

CREATE TABLE IF NOT EXISTS "Conversation" (
  "id" TEXT NOT NULL,
  "travelerId" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Conversation_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Conversation_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_travelerId_fkey') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_travelerId_fkey"
      FOREIGN KEY ("travelerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_agencyId_fkey') THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_agencyId_fkey"
      FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_travelerId_agencyId_key" ON "Conversation"("travelerId", "agencyId");
CREATE INDEX IF NOT EXISTS "Conversation_travelerId_idx" ON "Conversation"("travelerId");
CREATE INDEX IF NOT EXISTS "Conversation_agencyId_idx" ON "Conversation"("agencyId");

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Message_conversationId_idx" ON "Message"("conversationId");
CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");

CREATE TABLE IF NOT EXISTS "ExchangeRate" (
  "id" TEXT NOT NULL,
  "baseCurrency" TEXT NOT NULL DEFAULT 'MAD',
  "targetCurrency" TEXT NOT NULL,
  "rate" DOUBLE PRECISION NOT NULL,
  "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeRate_baseCurrency_targetCurrency_key" ON "ExchangeRate"("baseCurrency", "targetCurrency");
CREATE INDEX IF NOT EXISTS "ExchangeRate_expiresAt_idx" ON "ExchangeRate"("expiresAt");

CREATE INDEX IF NOT EXISTS "TripSession_startDate_idx" ON "TripSession"("startDate");
CREATE INDEX IF NOT EXISTS "TripSession_endDate_idx" ON "TripSession"("endDate");
CREATE INDEX IF NOT EXISTS "Booking_travelerId_idx" ON "Booking"("travelerId");
CREATE INDEX IF NOT EXISTS "Booking_sessionId_idx" ON "Booking"("sessionId");
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");
