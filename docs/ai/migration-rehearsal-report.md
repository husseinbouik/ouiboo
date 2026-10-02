# Migration Rehearsal Report

**Migration:** `20260915133000_add_currency_status_enums_and_indexes`
**Database:** `postgresql://localhost:5432/ouiboo_rehearsal_test?schema=public`
**Date:** 2026-09-25
**Result:** ALL REHEARSAL SCENARIOS PASSED

## Methodology
A legacy-shaped schema was materialized by applying every migration before
`20260915133000_add_currency_status_enums_and_indexes` to an empty scratch database, then seeding rows
with free-text statuses, pre-currency columns (matching the pre-migration
schema), and reset-token hashes. The target migration was then applied with
`prisma migrate deploy`. Every scenario ran against a freshly created,
non-production scratch database (name ends `_test`, local host by default).

## Scenario results
| Scenario | Result | Detail |
|----------|--------|--------|
| A-clean-legacy-migrates | PASS | 10 legacy migrations applied; target deploy exit 0 in 2591 ms |
| B-rejects-invalid-notification-status | PASS | target deploy exit 1; A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to |
| C-rejects-invalid-payment-status | PASS | target deploy exit 1; A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to |
| D-rejects-duplicate-reset-token-hash | PASS | target deploy exit 1; A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to |

## Post-migration verification (clean scenario)
- A-clean-legacy-migrates: currency column added to Booking with MAD default — pass (text default='MAD'::text)
- A-clean-legacy-migrates: currency column added to Wallet with MAD default — pass (text default='MAD'::text)
- A-clean-legacy-migrates: currency column added to PayoutRequest with MAD default — pass (text default='MAD'::text)
- A-clean-legacy-migrates: legacy booking inherits session currency while wallet and payout keep the explicit Morocco default — pass ({"booking_currency":"EUR","wallet_currency":"MAD","payout_currency":"MAD"})
- A-clean-legacy-migrates: NotificationLog.status becomes enum — pass (NotificationDeliveryStatus)
- A-clean-legacy-migrates: PaymentTransaction.status becomes enum — pass (PaymentTransactionStatus)
- A-clean-legacy-migrates: legacy status values preserved through cast — pass ({"notification_status":"SENT","payment_status":"INITIATED"})
- A-clean-legacy-migrates: index User_passwordResetTokenHash_key exists — pass (User_passwordResetTokenHash_key)
- A-clean-legacy-migrates: index Booking_sessionId_status_idx exists — pass (Booking_sessionId_status_idx)
- A-clean-legacy-migrates: index Review_tripTemplateId_rating_idx exists — pass (Review_tripTemplateId_rating_idx)
- A-clean-legacy-migrates: unique index rejects duplicate passwordResetTokenHash — pass (
Invalid `prisma.$executeRawUnsafe()` invocation:


Raw query failed. Code: `23505`. Message: `Key ("passwordResetTokenHash")=(hash-traveler-legacy) already exi)
- A-clean-legacy-migrates: enum rejects invalid NotificationLog status — pass (
Invalid `prisma.$executeRawUnsafe()` invocation:


Raw query failed. Code: `22P02`. Message: `ERROR: invalid input value for enum "NotificationDeliveryStatus":)
- B-rejects-invalid-notification-status: preflight fails fast before creating enum/DDL — pass (A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260915133000_add_currency_status_enums_and_indexes

Database error code: P0001

Database error:
ERROR: NotificationLog contains unsupported status values

DbError { severity: )
- C-rejects-invalid-payment-status: preflight fails fast before creating enum/DDL — pass (A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260915133000_add_currency_status_enums_and_indexes

Database error code: P0001

Database error:
ERROR: PaymentTransaction contains unsupported status values

DbError { severit)
- D-rejects-duplicate-reset-token-hash: duplicate-hash preflight fails fast before unique index — pass (A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260915133000_add_currency_status_enums_and_indexes

Database error code: P0001

Database error:
ERROR: User contains duplicate passwordResetTokenHash values; resolve duplicate)

## Preflight coverage
- NotificationLog.status must contain only `SENT`, `FAILED`, `BOUNCED`.
- PaymentTransaction.status must contain only `INITIATED`, `SUCCESS`, `FAILED`, `PENDING`.
- `User.passwordResetTokenHash` must have no duplicate non-null values before the unique index is created.

## Rollback / locking notes
- Each migration runs in its own transaction; the target aborts atomically and
  preflight failures leave no partial DDL (verified for all scenarios).
- Wallet and payout currency columns use metadata-only defaults on PostgreSQL 11+.
- Booking currency is backfilled from `TripSession.currency`; this update writes
  every legacy booking row and must be timed on a production-like snapshot.
- `ALTER COLUMN ... TYPE <enum>` and `CREATE INDEX` take ACCESS EXCLUSIVE
  locks; at launch scale the two status tables are small, so the rewrite is
  brief, but a scheduled maintenance window is recommended and large-table
  review is required before any future enum/index expansion.

## Regeneration
  node scripts/rehearse-migration.mjs   # default local scratch DB
  REHEARSAL_DATABASE_URL=... node scripts/rehearse-migration.mjs   # custom local _test DB

## Remaining risk
- A production snapshot may contain status values not covered above; the
  preflight fails closed, so run this rehearsal (or a staging
  `prisma migrate deploy`) against a real sanitized production dump before
  launch.
- Index creation on large tables was not profiled at production cardinality;
  duration was recorded only on the small rehearsal fixture.
