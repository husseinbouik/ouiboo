-- #446 (Council P2-07): help-centre support tickets.
-- Additive only: three new enums and one new table, no changes to
-- existing tables. Tickets give the #419 support operation stored
-- createdAt / firstResponseAt timestamps, which is what makes the
-- 48-hour first-response rate derivable in BetaMetricsService
-- (previously honestly returned as derivable: false because support
-- ran only over email with no stored timestamps).
-- Rollback: drop the table and the three enum types (tickets hold
-- support correspondence only; nothing else references them).
-- NOTE: this migration is checked in only — it is applied manually to
-- each environment's database by the release owner (migrations do not
-- auto-apply on deploy in this project). Until it is applied, the API
-- code that reads SupportTicket must not be deployed to that
-- environment, or ticket creation / beta-metrics will fail there.

-- CreateEnum
CREATE TYPE "SupportTicketCategory" AS ENUM ('BOOKING', 'PAYMENT', 'REFUND', 'ACCOUNT', 'TRIP', 'COMPLAINT', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportRequesterRole" AS ENUM ('TRAVELER', 'AGENCY', 'GUEST');

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterRole" "SupportRequesterRole" NOT NULL DEFAULT 'GUEST',
    "category" "SupportTicketCategory" NOT NULL DEFAULT 'OTHER',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "bookingRef" TEXT,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_category_createdAt_idx" ON "SupportTicket"("category", "createdAt");
