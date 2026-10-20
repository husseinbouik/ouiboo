# Environment-scoped test identities

Test identities are fixtures, never personal accounts. Use a different email and password for each role and environment. Store all six values only in the environment's approved secret manager; never place them in `.env`, CI logs, tickets, screenshots, or shell history.

## Required inputs

`DATABASE_URL`, `API_URL`, `TEST_IDENTITY_ENV`, `ALLOW_TEST_IDENTITIES`, `TEST_TRAVELER_EMAIL`, `TEST_TRAVELER_PASSWORD`, `TEST_AGENCY_EMAIL`, `TEST_AGENCY_PASSWORD`, `TEST_ADMIN_EMAIL`, and `TEST_ADMIN_PASSWORD`.

The API must already be running against the same database. The script upserts and verifies the three accounts through `POST /api/v1/auth/login`. Database/upsert errors appear under **FIXTURE/PRECONDITION FAILURE**; HTTP, credential, or role mismatches appear under **APPLICATION LOGIN FAILURE**. No password or token is printed.

For local use, inject temporary values into the process and run:

```powershell
$env:TEST_IDENTITY_ENV='local'; $env:ALLOW_TEST_IDENTITIES='local'; node apps/api/prisma/provision-test-identities.js
```

For staging, use a secret-manager wrapper to inject the required variables, then run exactly:

```powershell
$env:TEST_IDENTITY_ENV='staging'; $env:ALLOW_TEST_IDENTITIES='staging'; node apps/api/prisma/provision-test-identities.js
```

For production, schedule an approved change, verify the API/database targets aloud with a second operator, inject production-scoped secrets, then run exactly:

```powershell
$env:TEST_IDENTITY_ENV='production'; $env:ALLOW_TEST_IDENTITIES='production'; node apps/api/prisma/provision-test-identities.js
```

Production execution is deliberately an operator-only step and was not run during implementation.

## Rotation

1. Generate three independent high-entropy passwords in the secret manager.
2. Update the versioned environment secret entries without exposing values.
3. Run the provisioner for that environment; it revokes the old passwords by replacement.
4. Confirm all three roles report `PASS` and capture only the redacted report, environment, timestamp, API release SHA, and operator names.
5. Revoke old secret versions after the rollback window and confirm no automation still references them.

Restrict mutation-capable golden paths to staging. Production checks must be read-only and formally approved.
