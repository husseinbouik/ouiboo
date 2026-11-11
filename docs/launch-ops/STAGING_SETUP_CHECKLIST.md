# Staging Setup Checklist

This is the first environment you should make fully operational.

## 1. Infrastructure And URLs

- [x] staging API URL exists
- [x] staging traveler URL exists
- [x] staging agency URL exists
- [x] staging admin URL exists
- [x] staging landing URL exists
- [x] all URLs returned HTTP 200 over HTTPS on 2026-11-10

Record them here:

- Staging API URL: `https://ouiboo-api-staging.vercel.app/api/v1`
- Staging traveler URL: `https://ouiboo-traveler-staging.vercel.app`
- Staging agency URL: `https://ouiboo-agency-staging.vercel.app`
- Staging admin URL: `https://ouiboo-admin-staging.vercel.app`
- Staging landing URL: `https://ouiboo-landing-staging.vercel.app`

Evidence boundary: these URLs served a release other than the current pull-request candidate when checked. The latest observed Staging Release workflow failed before migration/attestation, even though scheduled smoke and uptime checks passed. Reachability is not candidate release attestation.

## 2. GitHub Environment Setup

Create or verify the GitHub `staging` environment and load:

### Required secrets

- `STAGING_DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT`
- `GMAIL_EMAIL`
- `GMAIL_APP_PASSWORD`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`
- `DEPLOY_HOOK_URL`
- `DEPLOY_HOOK_TOKEN`

### Required vars

- `STAGING_API_URL`
- `STAGING_TRAVELER_URL`
- `STAGING_AGENCY_URL`
- `STAGING_ADMIN_URL`
- `STAGING_LANDING_URL`
- `STAGING_CORS_ORIGINS`

## 3. Staging Service Validation

Before running the workflow, confirm:

- [x] staging database responds through the API readiness check
- [x] staging Redis responds through the API readiness check
- [ ] storage bucket or container exists
- [ ] email sender is configured
- [ ] frontend apps point to staging API
- [ ] API callback base URL is correct for staging

## 4. First Staging Release

Trigger the staging workflow from:

- push to `develop`, or
- manual workflow dispatch

Expected workflow order:

1. install dependencies
2. validate env and placeholders
3. build release candidate
4. publish immutable service images
5. apply Prisma migrations
6. invoke the deployment orchestrator
7. run smoke checks against staging URLs

## 5. Required Smoke Outcomes

These health checks must pass:

- [x] API `/api/v1/health/ready` (database and Redis `ok`, 2026-11-10)
- [x] traveler application URL
- [x] agency application URL
- [x] admin application URL
- [x] landing application URL
- [ ] worker heartbeat and Redis health command succeeds

## 6. Dress Rehearsal

After the workflow is green, run the staging dress rehearsal from:

- [ENVIRONMENT_VALIDATION_AND_DRESS_REHEARSAL.md](./ENVIRONMENT_VALIDATION_AND_DRESS_REHEARSAL.md)

Minimum success criteria:

- [ ] traveler signup and verification work
- [ ] booking creation works
- [ ] bank transfer instructions render correctly
- [ ] proof upload works
- [ ] admin proof approval works
- [ ] booking becomes confirmed
- [ ] agency sees booking and wallet update
- [ ] payout request and resolution work

## 7. Exit Criteria

Staging is ready only when:

- the staging workflow completes without manual intervention
- smoke checks pass
- dress rehearsal passes
- no unresolved secret, storage, email, or callback issue remains

## Owners

- Staging setup owner: `OWNER REQUIRED`
- Technical lead: `OWNER REQUIRED`
- Ops signoff: `OWNER REQUIRED`
