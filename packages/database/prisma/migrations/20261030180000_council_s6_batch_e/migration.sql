-- Council S6 Batch E (#691, #692, #695, #698) — additive only.
-- #691: storefront about (language-keyed) + languages.
-- #698: minimal billing config fields (tier / beta cohort / grandfathering).
ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "aboutTranslations" JSONB;
ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "betaCohort" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AgencyProfile" ADD COLUMN IF NOT EXISTS "grandfatheredUntil" TIMESTAMP(3);

-- #692: agency review replies enter the review moderation lifecycle.
-- Legacy replies that were written before moderation existed are held
-- at PENDING (no unmoderated public text) until an admin approves them.
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "responseStatus" "ReviewStatus";
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "responseEditCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "respondedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "responseModeratedById" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "responseModeratedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "responseModerationReason" TEXT;
UPDATE "Review" SET "responseStatus" = 'PENDING' WHERE "response" IS NOT NULL AND "responseStatus" IS NULL;

-- #695: booking pricing-selection snapshot.
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "pricingSelection" JSONB;

-- #695: agency-priced variants + paid add-ons.
DO $$ BEGIN
    CREATE TYPE "PricingUnit" AS ENUM ('PER_PERSON', 'PER_GROUP', 'PER_VEHICLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    CREATE TYPE "AddOnPricingUnit" AS ENUM ('PER_PERSON', 'PER_BOOKING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TripPricingVariant" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "pricingUnit" "PricingUnit" NOT NULL DEFAULT 'PER_PERSON',
    "unitSize" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TripPricingVariant_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "TripAddOn" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "pricingUnit" "AddOnPricingUnit" NOT NULL DEFAULT 'PER_BOOKING',
    "price" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TripAddOn_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TripPricingVariant_templateId_isActive_idx" ON "TripPricingVariant"("templateId", "isActive");
CREATE INDEX IF NOT EXISTS "TripPricingVariant_agencyId_idx" ON "TripPricingVariant"("agencyId");
CREATE INDEX IF NOT EXISTS "TripAddOn_templateId_isActive_idx" ON "TripAddOn"("templateId", "isActive");
CREATE INDEX IF NOT EXISTS "TripAddOn_agencyId_idx" ON "TripAddOn"("agencyId");
DO $$ BEGIN
    ALTER TABLE "TripPricingVariant" ADD CONSTRAINT "TripPricingVariant_templateId_agencyId_fkey" FOREIGN KEY ("templateId", "agencyId") REFERENCES "TripTemplate"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
    ALTER TABLE "TripAddOn" ADD CONSTRAINT "TripAddOn_templateId_agencyId_fkey" FOREIGN KEY ("templateId", "agencyId") REFERENCES "TripTemplate"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- #692: author-notification log type for visible agency replies.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_RESPONSE';
