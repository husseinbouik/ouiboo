ALTER TABLE "WalletTransaction"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "WalletTransaction_idempotencyKey_key"
  ON "WalletTransaction"("idempotencyKey");
