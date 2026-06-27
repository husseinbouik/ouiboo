# Production Deployment Runbook

Target: Docker-based API, worker, Traveler, Agency, and Admin services with managed Postgres, Redis, object storage, SMTP, logging, and monitoring.

## Required Managed Services

- Postgres with automated daily backups and point-in-time recovery.
- Redis with persistence enabled for rate limiting and BullMQ queues.
- S3-compatible object storage for uploads and payment proofs.
- Centralized logs and alerts for API, worker, database, Redis, and storage errors.

## Required Secrets

Do not commit `.env.production`.

Required values:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`
- `API_URL`
- `TRAVELER_APP_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `STORAGE_PROVIDER=s3`
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- Payment provider secrets for enabled providers.

## Pre-Deploy Checklist

1. Confirm the latest database backup completed successfully.
2. Run `npm run check:env`.
3. Run `npm run lint`.
4. Run `npm test`.
5. Run `npm run build`.
6. Run `npm audit --audit-level=high`.
7. Build and publish immutable Docker images for API, worker, Traveler, Agency, and Admin.

## Migration Procedure

1. Put the deployment in maintenance mode if payment/write traffic is active.
2. Take a manual Postgres backup.
3. Run Prisma migrations once from a controlled migration job/container:
   - `npx prisma migrate deploy --schema packages/database/prisma/schema.prisma`
4. Verify Decimal columns:
   - `TripSession.price`, `TripSession.deposit`
   - `Booking.totalAmount`, `Booking.refundAmount`
   - `Wallet.availableBalance`, `Wallet.pendingBalance`
   - `WalletTransaction.amount`
   - `PayoutRequest.amount`
   - `PaymentTransaction.amount`
   - `ExchangeRate.rate`
5. Deploy API.
6. Deploy worker.
7. Deploy frontends.
8. Check `/api/v1/health`, `/api/v1/health/db`, and `/api/v1/health/redis`.
9. Disable maintenance mode.

## Rollback Procedure

1. Stop new deployments and pause worker processing.
2. Roll back API/frontends to the previous image if the issue is application-only.
3. If the issue is caused by a migration, restore the manual pre-migration backup.
4. Re-enable API only after `/health/db` and `/health/redis` are healthy.
5. Re-enable worker last.

## Monitoring And Alerts

Alert on:

- API `/health` failure for 2 consecutive checks.
- Worker process down.
- Redis unavailable.
- BullMQ failed job count above threshold.
- Postgres connection saturation or slow queries.
- Payment webhook signature failures spike.
- Refund or payout failure rate above threshold.
- Object storage upload/download failures.

## Backup And Restore

- Postgres: daily automated backup plus point-in-time recovery.
- Object storage: versioning enabled for payment proofs and agency assets.
- Redis: persistence enabled; queues are recoverable, but financial state must remain in Postgres.

## Production Blockers Still Requiring Verification

- API-backed E2E must pass against a production-like test environment.
- Payment provider webhooks need replay/idempotency tests.
- File upload malware scanning is not yet implemented.
