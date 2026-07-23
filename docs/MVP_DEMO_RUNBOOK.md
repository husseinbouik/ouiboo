# Ouiboo MVP Demo Runbook

This runbook starts a local launch-demo environment with Postgres, seeded accounts, API, Traveler, Agency, Admin, and a visible worker process. Redis is required for real BullMQ queue processing; when Redis is unavailable, the demo launcher starts a local no-Redis worker that verifies database connectivity and keeps the worker slot visible for controlled demos.

## Demo Accounts

All seeded accounts use the password from `DEMO_PASSWORD`, defaulting to:

```text
Password123!
```

- Admin: `admin@ouiboo.demo`
- Agency: `agency@ouiboo.demo`
- Traveler: `traveler@ouiboo.demo`

## Start Dependencies

Postgres must be reachable before preparing the demo. If Docker is available, start Postgres and Redis:

```bash
docker compose up -d db redis
```

Set local service URLs if they are not already present:

```bash
DATABASE_URL=postgresql://postgres:admin@localhost:5432/ouiboo?schema=public
REDIS_URL=redis://localhost:6379
```

The local demo API runs on port `3010` to avoid common conflicts on `3000`.

## Prepare Database

```bash
npm run demo:prepare
```

The seed creates:

- Verified admin, agency, and traveler users.
- Verified agency profile.
- Active featured Sahara demo trip.
- Open future session.
- Confirmed traveler booking.
- Successful demo payment transaction.
- Agency wallet balance and wallet transaction.

## Start Apps

Start API, worker, Traveler, Agency, and Admin together:

```bash
npm run demo:start
```

Check health and smoke-test the web surfaces:

```bash
npm run demo:status
npm run demo:smoke
```

Stop all demo processes:

```bash
npm run demo:stop
```

The script writes logs and PID state to `.demo-runtime/` and can recover healthy URL services from listening ports if state becomes stale during a restart.

## Health Checks

```bash
curl http://localhost:3010/api/v1/health
curl http://localhost:3010/api/v1/health/db
curl http://localhost:3010/api/v1/health/redis
npm run demo:status
npm run demo:smoke
```

## Demo Script

1. Traveler logs in and views active trips.
2. Traveler opens the Sahara demo trip and sees the future session.
3. Agency logs in and views bookings, wallet, analytics, and payout state.
4. Admin logs in and reviews agency/trip/payment governance surfaces.
5. API health confirms database readiness. If Redis is running, `/health/redis` should also be green and the worker runs real BullMQ jobs; otherwise the demo worker runs in local no-Redis mode.

## Verified Local Status

Verified on 2026-07-20:

- `npm run demo:status`: passed for API, worker, Traveler, Agency, and Admin.
- `npm run demo:smoke`: passed for API, Traveler, Agency, and Admin.
- `npm run check:env`: passed.
- `npm run lint`: passed.
- `npm run build --workspace apps/api`: passed.
- `npm test --workspace apps/api -- --runInBand`: passed, 12 suites / 41 tests.
- `npm run build --workspace apps/traveler`: passed.
- `npm run build --workspace apps/agency`: passed.
- `npm run build --workspace apps/admin`: passed.
- `npm audit --audit-level=high`: passed, 0 vulnerabilities.

## Current Demo Caveats

- Redis is not installed/running on this machine, so the current worker is the local no-Redis demo worker. Real reminder, exchange-rate, and queue processing still requires Redis and the BullMQ worker.
- External payment providers should stay in demo/mock mode for launch demos.
- Full API E2E needs a longer production-like run; unit/smoke API tests are green.
- Uploads now have server-side signature/content checks and path traversal protection; a managed malware/CDR scanner still needs provider selection for public production.
