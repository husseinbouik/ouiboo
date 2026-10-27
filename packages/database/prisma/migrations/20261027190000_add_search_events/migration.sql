-- #432 / B21 (Council Session #2): search-event log for the beta's
-- zero-result-rate measurement. Additive only: one new table, no
-- changes to existing tables. The table is identifier-free by design
-- (no traveller id, no IP, no user agent) — see the SearchEvent model
-- comment in schema.prisma.
-- Rollback: drop the table (it holds measurement data only; nothing
-- references it).

-- CreateTable
CREATE TABLE "SearchEvent" (
    "id" TEXT NOT NULL,
    "query" TEXT,
    "filters" JSONB NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchEvent_createdAt_idx" ON "SearchEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SearchEvent_resultCount_createdAt_idx" ON "SearchEvent"("resultCount", "createdAt");
