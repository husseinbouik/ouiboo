-- #878 (Council S12 P0): AgencyProfile.isTestData — marks team-created
-- test/example supply so public surfaces render the Example state
-- instead of verification claims. Additive only, defaults false.
ALTER TABLE "AgencyProfile" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
