-- #729/#754 (Council S7-2): chat safety — conversation reports + traveller
-- blocks of agencies. Additive only: two new tables, both starting empty.
-- No existing column, row, or shape changes; no data preflight needed.
-- Rollback: DROP TABLE "AgencyBlock"; DROP TABLE "ConversationReport";
-- after the application is rolled back. Dropping loses only report/block
-- records created since deploy; conversations and messages are untouched.

-- CreateTable
CREATE TABLE "ConversationReport" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyBlock" (
    "id" TEXT NOT NULL,
    "travelerId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationReport_conversationId_idx" ON "ConversationReport"("conversationId");

-- CreateIndex
CREATE INDEX "ConversationReport_reporterId_idx" ON "ConversationReport"("reporterId");

-- CreateIndex
CREATE INDEX "ConversationReport_createdAt_idx" ON "ConversationReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyBlock_travelerId_agencyId_key" ON "AgencyBlock"("travelerId", "agencyId");

-- CreateIndex
CREATE INDEX "AgencyBlock_agencyId_idx" ON "AgencyBlock"("agencyId");

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationReport" ADD CONSTRAINT "ConversationReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyBlock" ADD CONSTRAINT "AgencyBlock_travelerId_fkey" FOREIGN KEY ("travelerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyBlock" ADD CONSTRAINT "AgencyBlock_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
