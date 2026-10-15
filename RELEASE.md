# Ouiboo Release Process

## The one promotion path (issue #211)

Production is promoted **only** through the `Release — Promote Staging SHA to Production`
workflow (`.github/workflows/release.yml`). There is exactly one release owner:
that workflow.

### Flow

```
staging branch (tested) 
  → manual workflow_dispatch on release.yml with staging SHA + confirmation
    → validate: SHA is a staging ancestor, all 5 Vercel staging deploys READY at SHA,
                staging smoke tests pass, current production SHAs recorded as rollback targets
    → migrate: prisma migrate deploy runs EXACTLY ONCE against production
    → promote: Vercel production deploys triggered pinned to the exact SHA,
               polled until READY, GitHub release created with promotion manifest
    → smoke-production: smoke tests run against production URLs
```

### Promotion manifest

Every promotion creates a GitHub release tagged `release-YYYYMMDD-<sha>` whose
notes are a JSON manifest:

```json
{
  "promoted_sha": "<sha>",
  "promoted_at": "<utc timestamp>",
  "promoted_by": "<github actor>",
  "migration_version": "<latest applied migration>",
  "staging_smoke": "pass",
  "rollback_targets": {
    "api": "<prev prod sha>",
    "traveler": "<prev prod sha>",
    "agency": "<prev prod sha>",
    "admin": "<prev prod sha>",
    "landing": "<prev prod sha>"
  }
}
```

### Required secrets / vars

| Name | Type | Purpose |
|---|---|---|
| `VERCEL_TOKEN` | secret | Vercel API token for deploy status + triggering production deploys |
| `PRODUCTION_DATABASE_URL` | secret | Production Postgres (migrations run once here) |
| `PRODUCTION_*_URL` | vars | Production URLs for smoke tests (already in use) |
| `STAGING_*_URL` | vars | Staging URLs for pre-promotion smoke tests (already in use) |

## Disabling uncontrolled production auto-deploys

Vercel currently auto-deploys on every push to `master` (via `ignoreCommand`
in each app's `vercel.json`, which deploys on `master` and `staging` refs).
This means a merge to `master` can go live **before** migrations and smoke
tests complete — the exact problem #211 fixes.

**Recommended dashboard setting** (do this once the release workflow is proven):

1. Vercel dashboard → each project (ouiboo-api, ouiboo-traveler, ouiboo-agency,
   ouiboo-admin, ouiboo-landing) → Settings → Git.
2. Under "Production Branch", keep `master` as the production branch.
3. Enable **"Ignored Build Step"** or disconnect automatic production deploys
   so pushes to `master` no longer auto-deploy; production deploys happen
   only via the release workflow's pinned-SHA API calls.

Until that setting is flipped, treat the release workflow as the gate:
**do not consider a master merge "released" until the release workflow
has promoted its SHA and production smoke tests pass.**

## Rollback procedure

### 1. Identify the rollback target

From the failed (or previous successful) promotion's GitHub release notes,
copy the `rollback_targets` SHAs. If the release notes are unavailable,
find the previous production deployment in Vercel:

- Vercel dashboard → project → Deployments → filter Production →
  pick the last known-good deployment → note its commit SHA.

### 2. Roll back the apps

**Option A — Vercel dashboard (fastest):**
Vercel dashboard → each project → Deployments → find the deployment for the
rollback SHA → ⋯ → **Redeploy**. Do this for all 5 projects.

**Option B — release workflow:**
Re-run `release.yml` with `staging_sha` set to the rollback target SHA.
This re-validates, re-runs migrations (idempotent — already-applied
migrations are skipped), and re-promotes.

### 3. Database

Prisma migrations are **forward-only** (`migrate deploy` never rolls back
schema automatically). If the failed release applied a migration that must
be reverted:

1. Check `packages/database/prisma/migrations/` for the migration.
2. Write and review a compensating migration (additive fix preferred over
   destructive rollback).
3. Apply it via the release workflow's migrate step, or manually with
   `DATABASE_URL=<prod> npm run db:migrate:deploy --workspace=packages/database`.

**Never** run `prisma migrate resolve --rolled-back` or edit
`_prisma_migrations` by hand without a second reviewer.

### 4. Verify

1. Re-run `node scripts/smoke-deploy.mjs` against production URLs
   (or the `Production Smoke Tests` workflow).
2. Check Vercel deployments show READY at the rollback SHA.
3. Confirm the promotion manifest for the rollback in the new GitHub release.

### 5. Follow-up

- File or update an issue with the failure root cause.
- Do not re-promote the failed SHA until the cause is fixed and
  re-validated on staging.
