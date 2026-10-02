-- Convert operational money fields from floating point to fixed precision decimals.
-- Historical migrations intentionally remain unchanged; this migration safely converts
-- existing production data in place with explicit rounding.

ALTER TABLE "TripSession"
  ALTER COLUMN "price" TYPE DECIMAL(18, 2) USING ROUND("price"::numeric, 2),
  ALTER COLUMN "deposit" DROP DEFAULT,
  ALTER COLUMN "deposit" TYPE DECIMAL(18, 2) USING ROUND("deposit"::numeric, 2),
  ALTER COLUMN "deposit" SET DEFAULT 0;

ALTER TABLE "Booking"
  ALTER COLUMN "totalAmount" TYPE DECIMAL(18, 2) USING ROUND("totalAmount"::numeric, 2),
  ALTER COLUMN "refundAmount" TYPE DECIMAL(18, 2) USING ROUND("refundAmount"::numeric, 2);

ALTER TABLE "Wallet"
  ALTER COLUMN "availableBalance" DROP DEFAULT,
  ALTER COLUMN "availableBalance" TYPE DECIMAL(18, 2) USING ROUND("availableBalance"::numeric, 2),
  ALTER COLUMN "availableBalance" SET DEFAULT 0,
  ALTER COLUMN "pendingBalance" DROP DEFAULT,
  ALTER COLUMN "pendingBalance" TYPE DECIMAL(18, 2) USING ROUND("pendingBalance"::numeric, 2),
  ALTER COLUMN "pendingBalance" SET DEFAULT 0;

ALTER TABLE "WalletTransaction"
  ALTER COLUMN "amount" TYPE DECIMAL(18, 2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "PayoutRequest"
  ALTER COLUMN "amount" TYPE DECIMAL(18, 2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "PaymentTransaction"
  ALTER COLUMN "amount" TYPE DECIMAL(18, 2) USING ROUND("amount"::numeric, 2);

ALTER TABLE "ExchangeRate"
  ALTER COLUMN "rate" TYPE DECIMAL(18, 8) USING ROUND("rate"::numeric, 8);
