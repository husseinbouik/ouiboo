-- AlterTable: subscription terms acceptance + renewal reminder marker (#324).
-- Additive and nullable (expand step).
ALTER TABLE "AgencyProfile" ADD COLUMN "subscriptionTermsVersion" TEXT;
ALTER TABLE "AgencyProfile" ADD COLUMN "subscriptionTermsAcceptedAt" TIMESTAMP(3);
ALTER TABLE "AgencyProfile" ADD COLUMN "renewalReminderSentFor" TIMESTAMP(3);
