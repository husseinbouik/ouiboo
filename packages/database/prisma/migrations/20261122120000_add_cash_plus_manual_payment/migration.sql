-- #988: Cash Plus as a second manual payment method (alongside bank
-- transfer). Additive only: every new column is nullable or defaulted,
-- so existing rows stay valid. Cash Plus infos follow the #421 bank
-- details pattern — agency submissions pend in the pending* columns and
-- only an admin verification promotes them to the live, traveller-
-- visible beneficiary name + phone.
CREATE TYPE "ManualPaymentChannel" AS ENUM ('BANK_TRANSFER', 'CASH_PLUS');

ALTER TABLE "AgencyProfile"
ADD COLUMN "cashPlusBeneficiaryName" TEXT,
ADD COLUMN "cashPlusPhone" TEXT,
ADD COLUMN "pendingCashPlusBeneficiaryName" TEXT,
ADD COLUMN "pendingCashPlusPhone" TEXT,
ADD COLUMN "cashPlusEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "cashPlusStatus" "BankDetailsStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN "cashPlusVerifiedAt" TIMESTAMP(3),
ADD COLUMN "cashPlusVerifiedBy" TEXT,
ADD COLUMN "cashPlusRejectionReason" TEXT;

ALTER TABLE "Booking"
ADD COLUMN "manualPaymentChannel" "ManualPaymentChannel";

ALTER TABLE "ExternalPayment"
ADD COLUMN "manualChannel" "ManualPaymentChannel",
ADD COLUMN "transactionCode" TEXT;

ALTER TABLE "PaymentProof"
ADD COLUMN "transactionCode" TEXT;
