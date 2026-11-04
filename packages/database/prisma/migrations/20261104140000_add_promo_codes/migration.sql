-- #778 (Council S6 Phase 3): agency-funded promo codes.
-- Additive only (expand): one new enum, one new table, four new
-- Booking columns (discountAmount defaults to 0 for existing rows).
-- No existing column, row, or shape changes; no data preflight needed
-- (new table starts empty, new columns are nullable or defaulted).
-- Rollback: ALTER TABLE "Booking" DROP COLUMN "promoSnapshot",
-- DROP COLUMN "promoCodeId", DROP COLUMN "promoCode",
-- DROP COLUMN "discountAmount"; DROP TABLE "PromoCode";
-- DROP TYPE "PromoDiscountType"; after the application is rolled
-- back. Dropping loses only promo redemption history; bookings keep
-- their (already discounted) totalAmount either way.

-- CreateEnum
CREATE TYPE "PromoDiscountType" AS ENUM ('PERCENT', 'FIXED_MAD');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "promoCode" TEXT,
ADD COLUMN     "promoCodeId" TEXT,
ADD COLUMN     "promoSnapshot" JSONB;

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountType" "PromoDiscountType" NOT NULL,
    "discountValue" DECIMAL(18,2) NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromoCode_agencyId_isActive_idx" ON "PromoCode"("agencyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_agencyId_code_key" ON "PromoCode"("agencyId", "code");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCode" ADD CONSTRAINT "PromoCode_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

