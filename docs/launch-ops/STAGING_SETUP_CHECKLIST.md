# Staging Setup Checklist

This is the first environment you should make fully operational.

## 1. Infrastructure And URLs

- [ ] staging API URL exists
- [ ] staging traveler URL exists
- [ ] staging agency URL exists
- [ ] staging admin URL exists
- [ ] staging landing URL exists
- [ ] all URLs are reachable over HTTPS if possible

Record them here:

- Staging API URL: `________________`
- Staging traveler URL: `________________`
- Staging agency URL: `________________`
- Staging admin URL: `________________`
- Staging landing URL: `________________`

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

- [ ] staging database exists
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

- [ ] API `/api/v1/health/ready`
- [ ] traveler `/api/health`
- [ ] agency `/api/health`
- [ ] admin `/api/health`
- [ ] landing `/api/health`
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

- Staging setup owner: `________________`
- Technical lead: `________________`
- Ops signoff: `________________`
