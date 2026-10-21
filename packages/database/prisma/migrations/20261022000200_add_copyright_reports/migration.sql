-- CreateEnum
CREATE TYPE "CopyrightReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- CreateTable: copyright takedown reports (#325)
CREATE TABLE "CopyrightReport" (
    "id" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "reporterEmail" TEXT NOT NULL,
    "contentUrl" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CopyrightReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "CopyrightReport_pkey" PRIMARY KEY ("id")
);
