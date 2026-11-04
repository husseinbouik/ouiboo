-- #682 (Council S6): catalogue firm-quote for published trips.
-- Additive only (expand): one new enum, one new table with FKs and
-- indexes. No existing column, row, or shape changes.
-- Rollback: DROP TABLE "QuoteRequest"; DROP TYPE "QuoteRequestStatus";
-- after the application is rolled back. QuoteRequests are standalone
-- records (bookings never reference them), so dropping loses only the
-- quote history itself.

-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('PENDING', 'QUOTED', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "requestedStartDate" TIMESTAMP(3) NOT NULL,
    "requestedEndDate" TIMESTAMP(3) NOT NULL,
    "guestsCount" INTEGER NOT NULL,
    "note" TEXT,
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'PENDING',
    "quotedTotalAmount" DECIMAL(18,2),
    "quotedCurrency" TEXT NOT NULL DEFAULT 'MAD',
    "quoteNote" TEXT,
    "cancellationScale" JSONB,
    "quotedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "acceptedSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteRequest_travelerId_createdAt_idx" ON "QuoteRequest"("travelerId", "createdAt");
CREATE INDEX "QuoteRequest_agencyId_status_createdAt_idx" ON "QuoteRequest"("agencyId", "status", "createdAt");
CREATE INDEX "QuoteRequest_templateId_idx" ON "QuoteRequest"("templateId");

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TripTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
