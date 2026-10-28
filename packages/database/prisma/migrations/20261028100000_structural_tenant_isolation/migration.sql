-- #428 (Council P1-01) — structural tenant isolation.
--
-- Tenant-owned rows that previously reached their agency only
-- transitively (TripSession, Booking, PaymentTransaction, Review,
-- InvoiceLineItem) gain a stamped agencyId, backfilled down the
-- session -> template chain, and the relations between tenant rows
-- become COMPOSITE foreign keys on (row id, agencyId). After this
-- migration the database itself rejects any cross-tenant pairing
-- (e.g. an ExternalPayment of agency B pointing at agency A's
-- booking), instead of relying on per-query discipline alone.
-- PaymentStatusLedgerEntry's previously bare agencyId/bookingId/
-- externalPaymentId scalars gain real FKs in the process.
--
-- Ordering is deliberate: columns are added nullable, backfilled,
-- verified by loud preflight checks, and only then made NOT NULL
-- and bound by the composite FKs. A preflight failure aborts the
-- migration with a named check — investigate the flagged rows
-- instead of letting the migration rewrite money records.
--
-- NOT reversible by a down migration alone for the new agencyId
-- stamps (the stamps are derivable from the parent chain, so a
-- rollback = drop the composite FKs/uniques and the five columns).

-- 1. New tenant columns (nullable until backfilled).
ALTER TABLE "TripSession" ADD COLUMN "agencyId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "agencyId" TEXT;
ALTER TABLE "PaymentTransaction" ADD COLUMN "agencyId" TEXT;
ALTER TABLE "Review" ADD COLUMN "agencyId" TEXT;
ALTER TABLE "InvoiceLineItem" ADD COLUMN "agencyId" TEXT;

-- 2. Backfill down the ownership chain (template -> session ->
--    booking -> payment transaction / review; invoice -> line item).
UPDATE "TripSession" s
SET "agencyId" = t."agencyId"
FROM "TripTemplate" t
WHERE s."templateId" = t."id";

UPDATE "Booking" b
SET "agencyId" = s."agencyId"
FROM "TripSession" s
WHERE b."sessionId" = s."id";

UPDATE "PaymentTransaction" p
SET "agencyId" = b."agencyId"
FROM "Booking" b
WHERE p."bookingId" = b."id";

UPDATE "Review" r
SET "agencyId" = b."agencyId"
FROM "Booking" b
WHERE r."bookingId" = b."id";

UPDATE "InvoiceLineItem" li
SET "agencyId" = i."agencyId"
FROM "Invoice" i
WHERE li."invoiceId" = i."id";

-- 3. Preflight: every backfilled row must have a tenant, and every
--    pre-existing tenant stamp on money rows must agree with the
--    booking chain it points at. Any disagreement aborts loudly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "TripSession" WHERE "agencyId" IS NULL)
     OR EXISTS (SELECT 1 FROM "Booking" WHERE "agencyId" IS NULL)
     OR EXISTS (SELECT 1 FROM "PaymentTransaction" WHERE "agencyId" IS NULL)
     OR EXISTS (SELECT 1 FROM "Review" WHERE "agencyId" IS NULL)
     OR EXISTS (SELECT 1 FROM "InvoiceLineItem" WHERE "agencyId" IS NULL) THEN
    RAISE EXCEPTION '#428 preflight: unbackfilled agencyId rows remain (orphaned parent chain)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "ExternalPayment" ep
    JOIN "Booking" b ON b."id" = ep."bookingId"
    WHERE ep."agencyId" <> b."agencyId"
  ) THEN
    RAISE EXCEPTION '#428 preflight: ExternalPayment agencyId disagrees with its booking';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "BookingPaymentPlan" p
    JOIN "Booking" b ON b."id" = p."bookingId"
    JOIN "TripSession" s ON s."id" = p."sessionId"
    WHERE p."agencyId" <> b."agencyId" OR p."agencyId" <> s."agencyId"
  ) THEN
    RAISE EXCEPTION '#428 preflight: BookingPaymentPlan agencyId disagrees with its booking/session';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "RefundCase" rc
    JOIN "Booking" b ON b."id" = rc."bookingId"
    WHERE rc."agencyId" <> b."agencyId"
  ) OR EXISTS (
    SELECT 1 FROM "DuplicateCreditFlag" f
    JOIN "Booking" b ON b."id" = f."bookingId"
    WHERE f."agencyId" <> b."agencyId"
  ) THEN
    RAISE EXCEPTION '#428 preflight: RefundCase/DuplicateCreditFlag agencyId disagrees with its booking';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "PaymentAttempt" pa
    JOIN "Booking" b ON b."id" = pa."bookingId"
    JOIN "AgencyPaymentProfile" pp ON pp."id" = pa."paymentProfileId"
    WHERE pa."agencyId" <> b."agencyId" OR pa."agencyId" <> pp."agencyId"
  ) THEN
    RAISE EXCEPTION '#428 preflight: PaymentAttempt agencyId disagrees with its booking/payment profile';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "PaymentStatusLedgerEntry" le
    JOIN "Booking" b ON b."id" = le."bookingId"
    JOIN "ExternalPayment" ep ON ep."id" = le."externalPaymentId"
    WHERE le."agencyId" <> b."agencyId" OR le."agencyId" <> ep."agencyId"
  ) THEN
    RAISE EXCEPTION '#428 preflight: PaymentStatusLedgerEntry agencyId disagrees with its booking/payment';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "InvoiceLineItem" li
    JOIN "Booking" b ON b."id" = li."bookingId"
    WHERE li."agencyId" <> b."agencyId"
  ) THEN
    RAISE EXCEPTION '#428 preflight: InvoiceLineItem agency (from invoice) disagrees with its booking';
  END IF;
END $$;

-- 4. The stamps are total: make them NOT NULL.
ALTER TABLE "TripSession" ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "PaymentTransaction" ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "agencyId" SET NOT NULL;
ALTER TABLE "InvoiceLineItem" ALTER COLUMN "agencyId" SET NOT NULL;

-- 5. Drop the single-column FKs that the composite FKs replace.
ALTER TABLE "TripSession" DROP CONSTRAINT "TripSession_templateId_currency_fkey";
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_sessionId_fkey";
ALTER TABLE "ExternalPayment" DROP CONSTRAINT "ExternalPayment_bookingId_fkey";
ALTER TABLE "BookingPaymentPlan" DROP CONSTRAINT "BookingPaymentPlan_bookingId_fkey";
ALTER TABLE "BookingPaymentPlan" DROP CONSTRAINT "BookingPaymentPlan_sessionId_fkey";
ALTER TABLE "RefundCase" DROP CONSTRAINT "RefundCase_bookingId_fkey";
ALTER TABLE "DuplicateCreditFlag" DROP CONSTRAINT "DuplicateCreditFlag_bookingId_fkey";
ALTER TABLE "PaymentStatusLedgerEntry" DROP CONSTRAINT "PaymentStatusLedgerEntry_externalPaymentId_fkey";
ALTER TABLE "Review" DROP CONSTRAINT "Review_bookingId_fkey";
ALTER TABLE "Review" DROP CONSTRAINT "Review_tripTemplateId_fkey";
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_bookingId_fkey";
ALTER TABLE "InvoiceLineItem" DROP CONSTRAINT "InvoiceLineItem_invoiceId_fkey";
ALTER TABLE "InvoiceLineItem" DROP CONSTRAINT "InvoiceLineItem_bookingId_fkey";
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT "PaymentAttempt_bookingId_fkey";
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT "PaymentAttempt_paymentProfileId_fkey";

-- 6. Composite uniques the new FKs reference.
CREATE UNIQUE INDEX "TripTemplate_id_agencyId_key" ON "TripTemplate"("id", "agencyId");
CREATE UNIQUE INDEX "TripTemplate_id_agencyId_currency_key" ON "TripTemplate"("id", "agencyId", "currency");
CREATE INDEX "TripSession_agencyId_idx" ON "TripSession"("agencyId");
CREATE UNIQUE INDEX "TripSession_id_agencyId_key" ON "TripSession"("id", "agencyId");
CREATE INDEX "Booking_agencyId_idx" ON "Booking"("agencyId");
CREATE UNIQUE INDEX "Booking_id_agencyId_key" ON "Booking"("id", "agencyId");
CREATE UNIQUE INDEX "ExternalPayment_id_agencyId_key" ON "ExternalPayment"("id", "agencyId");
CREATE UNIQUE INDEX "BookingPaymentPlan_bookingId_agencyId_key" ON "BookingPaymentPlan"("bookingId", "agencyId");
CREATE INDEX "Review_agencyId_idx" ON "Review"("agencyId");
CREATE UNIQUE INDEX "Review_bookingId_agencyId_key" ON "Review"("bookingId", "agencyId");
CREATE INDEX "PaymentTransaction_agencyId_idx" ON "PaymentTransaction"("agencyId");
CREATE UNIQUE INDEX "Invoice_id_agencyId_key" ON "Invoice"("id", "agencyId");
CREATE INDEX "InvoiceLineItem_agencyId_idx" ON "InvoiceLineItem"("agencyId");
CREATE UNIQUE INDEX "AgencyPaymentProfile_id_agencyId_key" ON "AgencyPaymentProfile"("id", "agencyId");

-- 7. Composite foreign keys: a tenant row can only pair with rows
--    of the SAME tenant, enforced by the database.
ALTER TABLE "TripSession" ADD CONSTRAINT "TripSession_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TripSession" ADD CONSTRAINT "TripSession_templateId_agencyId_currency_fkey" FOREIGN KEY ("templateId", "agencyId", "currency") REFERENCES "TripTemplate"("id", "agencyId", "currency") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_sessionId_agencyId_fkey" FOREIGN KEY ("sessionId", "agencyId") REFERENCES "TripSession"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalPayment" ADD CONSTRAINT "ExternalPayment_bookingId_agencyId_fkey" FOREIGN KEY ("bookingId", "agencyId") REFERENCES "Booking"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingPaymentPlan" ADD CONSTRAINT "BookingPaymentPlan_bookingId_agencyId_fkey" FOREIGN KEY ("bookingId", "agencyId") REFERENCES "Booking"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingPaymentPlan" ADD CONSTRAINT "BookingPaymentPlan_sessionId_agencyId_fkey" FOREIGN KEY ("sessionId", "agencyId") REFERENCES "TripSession"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefundCase" ADD CONSTRAINT "RefundCase_bookingId_agencyId_fkey" FOREIGN KEY ("bookingId", "agencyId") REFERENCES "Booking"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DuplicateCreditFlag" ADD CONSTRAINT "DuplicateCreditFlag_bookingId_agencyId_fkey" FOREIGN KEY ("bookingId", "agencyId") REFERENCES "Booking"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentStatusLedgerEntry" ADD CONSTRAINT "PaymentStatusLedgerEntry_externalPaymentId_agencyId_fkey" FOREIGN KEY ("externalPaymentId", "agencyId") REFERENCES "ExternalPayment"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentStatusLedgerEntry" ADD CONSTRAINT "PaymentStatusLedgerEntry_bookingId_agencyId_fkey" FOREIGN KEY ("bookingId", "agencyId") REFERENCES "Booking"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentStatusLedgerEntry" ADD CONSTRAINT "PaymentStatusLedgerEntry_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_agencyId_fkey" FOREIGN KEY ("bookingId", "agencyId") REFERENCES "Booking"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_tripTemplateId_agencyId_fkey" FOREIGN KEY ("tripTemplateId", "agencyId") REFERENCES "TripTemplate"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_bookingId_agencyId_fkey" FOREIGN KEY ("bookingId", "agencyId") REFERENCES "Booking"("id", "agencyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_agencyId_fkey" FOREIGN KEY ("invoiceId", "agencyId") REFERENCES "Invoice"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_bookingId_agencyId_fkey" FOREIGN KEY ("bookingId", "agencyId") REFERENCES "Booking"("id", "agencyId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_bookingId_agencyId_fkey" FOREIGN KEY ("bookingId", "agencyId") REFERENCES "Booking"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentProfileId_agencyId_fkey" FOREIGN KEY ("paymentProfileId", "agencyId") REFERENCES "AgencyPaymentProfile"("id", "agencyId") ON DELETE CASCADE ON UPDATE CASCADE;
