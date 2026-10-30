-- Council S6 Batch F (#684, #685, #686, #687, #694, #696, #697, #701) — additive only.
-- #685 is read-side (live inventory on the Layer A URLs) and needs no DDL.

-- New enums.
DO $$ BEGIN
    CREATE TYPE "CustomTripRequestStatus" AS ENUM ('PENDING', 'QUOTED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'CONVERTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "CustomTripOfferStatus" AS ENUM ('QUOTED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "SessionKind" AS ENUM ('SHARED', 'PRIVATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "AccommodationTier" AS ENUM ('STANDARD', 'COMFORT', 'PREMIUM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- #684/#686/#687/#694/#697/#701: TripTemplate additions.
ALTER TABLE "TripTemplate" ADD COLUMN IF NOT EXISTS "customTripRequestId" TEXT;
ALTER TABLE "TripTemplate" ADD COLUMN IF NOT EXISTS "isUnlisted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TripTemplate" ADD COLUMN IF NOT EXISTS "faqs" JSONB;
ALTER TABLE "TripTemplate" ADD COLUMN IF NOT EXISTS "freeCancellation" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TripTemplate" ADD COLUMN IF NOT EXISTS "freeCancellationDays" INTEGER;
ALTER TABLE "TripTemplate" ADD COLUMN IF NOT EXISTS "payOnArrivalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TripTemplate" ADD COLUMN IF NOT EXISTS "privateTourEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TripTemplate" ADD COLUMN IF NOT EXISTS "pickupPoints" JSONB;
CREATE INDEX IF NOT EXISTS "TripTemplate_status_freeCancellation_idx" ON "TripTemplate"("status", "freeCancellation");

-- #701: ItineraryDay phase 2.
ALTER TABLE "ItineraryDay" ADD COLUMN IF NOT EXISTS "accommodationTier" "AccommodationTier";
ALTER TABLE "ItineraryDay" ADD COLUMN IF NOT EXISTS "stops" JSONB;
ALTER TABLE "ItineraryDay" ADD COLUMN IF NOT EXISTS "notes" JSONB;

-- #694/#696: TripSession additions.
ALTER TABLE "TripSession" ADD COLUMN IF NOT EXISTS "sessionKind" "SessionKind" NOT NULL DEFAULT 'SHARED';
ALTER TABLE "TripSession" ADD COLUMN IF NOT EXISTS "allowPayLater" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TripSession" ADD COLUMN IF NOT EXISTS "payLaterHoldHours" INTEGER;

-- #694/#696/#697/#701: Booking additions.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "isPrivateSession" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "payLaterDeadline" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "payOnArrival" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "pickupPointId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "pickupPointSnapshot" JSONB;
CREATE INDEX IF NOT EXISTS "Booking_payLaterDeadline_idx" ON "Booking"("payLaterDeadline");

-- #684: custom-trip requests + offers.
CREATE TABLE IF NOT EXISTS "CustomTripRequest" (
    "id" TEXT NOT NULL,
    "publicRef" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "TripCategory" NOT NULL DEFAULT 'CULTURAL',
    "destinationSlug" TEXT,
    "startLocation" TEXT,
    "requestedStartDate" TIMESTAMP(3) NOT NULL,
    "requestedEndDate" TIMESTAMP(3) NOT NULL,
    "guestsCount" INTEGER NOT NULL,
    "budgetMaxMad" DECIMAL(18,2),
    "note" TEXT,
    "status" "CustomTripRequestStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedOfferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomTripRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CustomTripRequest_publicRef_key" ON "CustomTripRequest"("publicRef");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomTripRequest_acceptedOfferId_key" ON "CustomTripRequest"("acceptedOfferId");
CREATE INDEX IF NOT EXISTS "CustomTripRequest_travelerId_createdAt_idx" ON "CustomTripRequest"("travelerId", "createdAt");
CREATE INDEX IF NOT EXISTS "CustomTripRequest_status_expiresAt_idx" ON "CustomTripRequest"("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "CustomTripRequest_destinationSlug_status_idx" ON "CustomTripRequest"("destinationSlug", "status");

CREATE TABLE IF NOT EXISTS "CustomTripOffer" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "quotedTotalAmount" DECIMAL(18,2) NOT NULL,
    "quotedCurrency" TEXT NOT NULL DEFAULT 'MAD',
    "quoteNote" TEXT,
    "cancellationScale" JSONB,
    "status" "CustomTripOfferStatus" NOT NULL DEFAULT 'QUOTED',
    "quotedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "acceptedSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomTripOffer_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CustomTripOffer_requestId_agencyId_key" ON "CustomTripOffer"("requestId", "agencyId");
CREATE INDEX IF NOT EXISTS "CustomTripOffer_agencyId_status_createdAt_idx" ON "CustomTripOffer"("agencyId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "CustomTripOffer_requestId_status_idx" ON "CustomTripOffer"("requestId", "status");

-- Foreign keys (guarded so a re-run cannot fail on duplicates).
DO $$ BEGIN
    ALTER TABLE "CustomTripRequest" ADD CONSTRAINT "CustomTripRequest_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "CustomTripRequest" ADD CONSTRAINT "CustomTripRequest_acceptedOfferId_fkey" FOREIGN KEY ("acceptedOfferId") REFERENCES "CustomTripOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "CustomTripOffer" ADD CONSTRAINT "CustomTripOffer_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CustomTripRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "CustomTripOffer" ADD CONSTRAINT "CustomTripOffer_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "TripTemplate" ADD CONSTRAINT "TripTemplate_customTripRequestId_fkey" FOREIGN KEY ("customTripRequestId") REFERENCES "CustomTripRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "TripTemplate_customTripRequestId_key" ON "TripTemplate"("customTripRequestId");

-- #687 backfill: derive the standardised free-cancellation columns from
-- each trip's stored structured scale (platform defaults when null):
-- free exactly when a 100% band starts at >= 1 day before start.
UPDATE "TripTemplate" t
SET "freeCancellation" = agg.free,
    "freeCancellationDays" = agg.days
FROM (
    SELECT x.id,
           COALESCE(MAX(b.days) FILTER (WHERE b.pct = 100 AND b.days >= 1) IS NOT NULL, false) AS free,
           MAX(b.days) FILTER (WHERE b.pct = 100 AND b.days >= 1) AS days
    FROM "TripTemplate" x
    LEFT JOIN LATERAL (
        SELECT (band->>'minDaysBeforeStart')::int AS days, (band->>'refundPercent')::int AS pct
        FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(x."cancellationPolicy"->'bands') = 'array'
                 THEN x."cancellationPolicy"->'bands'
                 ELSE '[{"minDaysBeforeStart":30,"refundPercent":100},{"minDaysBeforeStart":15,"refundPercent":75},{"minDaysBeforeStart":7,"refundPercent":50},{"minDaysBeforeStart":3,"refundPercent":25},{"minDaysBeforeStart":0,"refundPercent":0}]'::jsonb
            END
        ) AS band
    ) b ON true
    GROUP BY x.id
) agg
WHERE agg.id = t.id;
