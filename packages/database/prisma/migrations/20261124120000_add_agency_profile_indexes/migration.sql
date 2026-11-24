-- #1028 (F11): secondary indexes on AgencyProfile + User.referredById.
-- AgencyProfile had NO secondary indexes despite being filtered on
-- nearly every catalogue read (publicBookableAgencyWhere filters
-- verificationStatus and the subscriptionStatus/subscriptionEndsAt
-- pair) and by the scheduled renewal-reminder scan
-- (subscriptionStatus = 'ACTIVE' + subscriptionEndsAt in window) and
-- compliance sweeps. User.referredById backs referral lookups/joins.
-- Expand-only: three non-unique B-tree indexes, no data change.
-- NOTE: migrations do NOT auto-apply on deploy — this one is applied
-- by hand to each Neon DB at release time (with its
-- _prisma_migrations row), per the release procedure.
-- Rollback: DROP INDEX "AgencyProfile_verificationStatus_idx";
-- DROP INDEX "AgencyProfile_subscriptionStatus_subscriptionEndsAt_idx";
-- DROP INDEX "User_referredById_idx";
CREATE INDEX "AgencyProfile_verificationStatus_idx" ON "AgencyProfile"("verificationStatus");
CREATE INDEX "AgencyProfile_subscriptionStatus_subscriptionEndsAt_idx" ON "AgencyProfile"("subscriptionStatus", "subscriptionEndsAt");
CREATE INDEX "User_referredById_idx" ON "User"("referredById");
