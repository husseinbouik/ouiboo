-- #429: drop the dormant custody tables (Wallet, WalletTransaction,
-- PayoutRequest) and their enums. Traveller money has moved directly
-- between travellers and agencies since #368; no code wrote to these
-- tables and the only reader (the GDPR data export) was adjusted in
-- the same change. The retained financial ledger is Booking /
-- PaymentTransaction / ExternalPayment / PaymentStatusLedgerEntry.
--
-- DESTRUCTIVE and NOT reversible from this migration alone: take a
-- pg_dump snapshot of the three tables immediately before applying.
-- Rollback = restore the snapshot, delete this migration's row from
-- _prisma_migrations, and redeploy the prior app build.
-- Checked in only — not applied to any environment by the author.

-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_agencyId_fkey";

-- DropForeignKey
ALTER TABLE "WalletTransaction" DROP CONSTRAINT "WalletTransaction_walletId_fkey";

-- DropForeignKey
ALTER TABLE "PayoutRequest" DROP CONSTRAINT "PayoutRequest_agencyId_fkey";

-- DropTable
DROP TABLE "Wallet";

-- DropTable
DROP TABLE "WalletTransaction";

-- DropTable
DROP TABLE "PayoutRequest";

-- DropEnum
DROP TYPE "PayoutStatus";

-- DropEnum
DROP TYPE "TransactionType";

