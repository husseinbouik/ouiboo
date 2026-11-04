-- #777: zero-value referral — tracked sharing + recognition ONLY.
-- Additive only. referralCode is a personal attribution label (unique);
-- referredById records who introduced the new account. There is no
-- value mechanic in this change: no points, credits, discounts, cash,
-- stored value, or balances are created or implied.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredById" TEXT;

-- Backfill a code for every existing account (generated only where the
-- account does not already have one, so a re-run cannot rotate codes).
UPDATE "User"
SET "referralCode" = 'OUI-' || upper(substr(md5("id" || '-' || random()::text), 1, 10))
WHERE "referralCode" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode");
CREATE INDEX IF NOT EXISTS "User_referredById_idx" ON "User"("referredById");

DO $$ BEGIN
    ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
