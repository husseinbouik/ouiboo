# Testing Guide

This document explains how to run unit and end-to-end (E2E) tests for the Ouiboo monorepo.

Running tests locally

- Install dependencies at repo root:

```bash
npm ci
```

- Run all workspace tests (unit/integration):

```bash
npm run test
```

- Run API E2E tests (starts a local Postgres via docker-compose):

```bash
cd apps/api
./test/scripts/setup-test-db.sh
DATABASE_URL='postgresql://test:test@localhost:5433/ouiboo_test' npm ci
npm run test:ci
./test/scripts/teardown-test-db.sh
```

Seeding test data

```bash
cd apps/api
DATABASE_URL='postgresql://test:test@localhost:5433/ouiboo_test' node test/scripts/seed-test-data.js
```

Coverage

- Generate coverage report for API:

```bash
cd apps/api
npm run coverage:report
```

Test report

- After running Jest with `--json --outputFile=jest-results.json`, generate a markdown summary:

```bash
node ../../scripts/test-report.js
```

Pre-commit hooks

- The repository uses `husky` to run `npm run test` before commits. Ensure you run `npm run prepare` once after cloning.
