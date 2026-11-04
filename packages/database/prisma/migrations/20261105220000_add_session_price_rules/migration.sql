-- #755: campaign/session pricing — agency-owned price rules applied to
-- sessions without a promo code, plus the booking snapshot columns.
-- Additive only.
CREATE TABLE "SessionPriceRule" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "templateId" TEXT,
    "sessionId" TEXT,
    "name" TEXT NOT NULL,
    "discountType" "PromoDiscountType" NOT NULL,
    "discountValue" DECIMAL(18,2) NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "budgetCap" DECIMAL(18,2),
    "discountGranted" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "stacksWithPromoCode" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionPriceRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SessionPriceRule_agencyId_isActive_idx" ON "SessionPriceRule"("agencyId", "isActive");
CREATE INDEX "SessionPriceRule_agencyId_sessionId_idx" ON "SessionPriceRule"("agencyId", "sessionId");
CREATE INDEX "SessionPriceRule_agencyId_templateId_idx" ON "SessionPriceRule"("agencyId", "templateId");

ALTER TABLE "SessionPriceRule" ADD CONSTRAINT "SessionPriceRule_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD COLUMN "priceRuleId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "campaignDiscountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "campaignSnapshot" JSONB;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_priceRuleId_fkey" FOREIGN KEY ("priceRuleId") REFERENCES "SessionPriceRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
