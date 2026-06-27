# Ouiboo MVP Demo Runbook

This runbook starts a local launch-demo environment with Postgres, seeded accounts, API, Traveler, Agency, and Admin apps. Redis is required to run the BullMQ worker; when Redis is unavailable, the demo launcher skips the worker and reports that explicitly.

## Demo Accounts

All seeded accounts use the password from `DEMO_PASSWORD`, defaulting to:

```text
Password123!
```

- Admin: `admin@ouiboo.demo`
- Agency: `agency@ouiboo.demo`
- Traveler: `traveler@ouiboo.demo`

## Start Dependencies

If Docker is available, start Postgres and Redis:

```bash
docker compose up -d db redis
```

Set local service URLs if they are not already present:

```bash
DATABASE_URL=postgresql://postgres:admin@localhost:5432/ouiboo?schema=public
REDIS_URL=redis://localhost:6379
```

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

Start API, worker when Redis is available, Traveler, Agency, and Admin together:

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

The script writes logs and PID state to `.demo-runtime/`.

## Health Checks

```bash
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/health/db
curl http://localhost:3000/api/v1/health/redis
npm run demo:status
npm run demo:smoke
```

## Demo Script

1. Traveler logs in and views active trips.
2. Traveler opens the Sahara demo trip and sees the future session.
3. Agency logs in and views bookings, wallet, analytics, and payout state.
4. Admin logs in and reviews agency/trip/payment governance surfaces.
5. API health confirms database readiness. If Redis is running, worker and Redis health should also be green.

## Verified Local Status

Verified on 2026-06-19:

- `npm run demo:prepare`: passed and seeded demo data.
- `npm run demo:status`: API, Traveler, Agency, and Admin health endpoints passed.
- `npm run demo:smoke`: API, Traveler, Agency, and Admin smoke checks passed.
- `npm test --workspace apps/api -- --runInBand`: passed, 10 suites / 34 tests.
- Redis was not reachable at `redis://localhost:6379`; the worker was skipped.

## Current Demo Caveats

- Redis must be installed/running locally to include the BullMQ worker process.
- External payment providers should stay in demo/mock mode for launch demos.
- Full API E2E needs a longer production-like run; unit/smoke API tests are green.
- File upload malware scanning is still a production hardening item.
