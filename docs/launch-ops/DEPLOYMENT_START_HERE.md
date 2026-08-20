# Deployment Start Here

This is the shortest path to go live with Ouiboo across `dev`, `staging`, and `production`.

Use this document as the entry point for deployment work.

## Environment Order

Always move in this order:

1. local development
2. staging
3. production

Never skip directly from local to production.

## Current Repo Truth

These deployment assets already exist:

- staging workflow: `.github/workflows/staging-release.yml`
- production workflow: `.github/workflows/production-release.yml`
- smoke validation script: `scripts/smoke-deploy.mjs`
- health endpoints:
  - traveler `/api/health`
  - agency `/api/health`
  - admin `/api/health`
  - landing `/api/health`
  - api readiness `/api/v1/health/ready`
- worker health command: `node dist/apps/api/src/worker-healthcheck`

## Where To Start

### Step 1: Finish staging setup first

Start with [STAGING_SETUP_CHECKLIST.md](./STAGING_SETUP_CHECKLIST.md).

Goal:

- create a real staging environment
- load staging secrets and URLs
- run the staging workflow successfully
- complete a full dress rehearsal

Do not start production setup until staging is working end to end.

### Step 2: Prepare production release controls

Then use [PRODUCTION_RELEASE_RUNBOOK.md](./PRODUCTION_RELEASE_RUNBOOK.md).

Goal:

- define the exact release order
- define who owns migrations, smoke checks, and business signoff
- confirm backup and rollback procedure before first production release

### Step 3: Validate rollback and post-deploy checks

Then use [ROLLBACK_AND_POST_DEPLOY_CHECKLIST.md](./ROLLBACK_AND_POST_DEPLOY_CHECKLIST.md).

Goal:

- know exactly what to do if release verification fails
- know exactly what to check after a successful deployment

## Recommended Practical Sequence

1. fill staging secrets and URLs
2. deploy and verify staging
3. run staging dress rehearsal with traveler, admin, and agency roles
4. fix issues from rehearsal
5. prepare production secrets, DB backup plan, and release owners
6. perform first production deploy during a controlled release window
7. run post-deploy checks immediately

## Launch Constraint For Payments

For Morocco launch:

- production launch payment method stays `bank transfer + manual proof`
- `CMI` stays hidden until approved and live-tested
- `CashPlus` stays hidden until approved and live-tested
- `Wafacash` is not part of launch

This means production deployment is not blocked by live gateway credentials if bank transfer is the only visible payment method.
