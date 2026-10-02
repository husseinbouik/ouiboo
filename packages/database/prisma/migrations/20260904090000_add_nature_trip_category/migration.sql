-- Additive enum change. Existing trip records are not modified.
ALTER TYPE "TripCategory" ADD VALUE IF NOT EXISTS 'NATURE';
