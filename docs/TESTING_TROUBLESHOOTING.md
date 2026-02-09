# Testing Troubleshooting

Common issues and fixes when running tests.

- Postgres connection refused when running E2E:
  - Ensure Docker Desktop is running.
  - Start the test DB: `./apps/api/test/scripts/setup-test-db.sh`.
  - Verify `DATABASE_URL` points to `postgresql://test:test@localhost:5433/ouiboo_test`.

- Prisma migration / missing tables:
  - Run your migration or generate schema for the test DB. Example:

```bash
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

- Tests time out or hang:
  - Increase Jest timeout by setting `jest.setTimeout(...)` in tests.
  - Ensure background services (DB) are up.

- Husky pre-commit fails locally:
  - Run `npm run prepare` once to install hooks.
  - If you want to skip tests for a commit: `git commit --no-verify` (not recommended).

- CI failures related to DB:
  - CI must have Docker available. The workflow uses docker-compose to start a Postgres for E2E.
