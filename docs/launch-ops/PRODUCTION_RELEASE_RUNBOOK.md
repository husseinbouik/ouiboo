# Production Release Runbook

Use this for the first live release and every later production deployment.

## 1. Preconditions

Do not start production release until all are true:

- [ ] staging workflow is green
- [ ] staging dress rehearsal passed
- [ ] production secrets are loaded
- [ ] production URLs are confirmed
- [ ] DB backup procedure is ready
- [ ] rollback owner is assigned
- [ ] launch payment method remains `bank transfer + manual proof`
- [ ] `CMI` and `CashPlus` are hidden if not approved and live-tested

## 2. Production Environment Setup

Create or verify the GitHub `production` environment and load:

### Required secrets

- `PRODUCTION_DATABASE_URL`
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

- `PRODUCTION_API_URL`
- `PRODUCTION_TRAVELER_URL`
- `PRODUCTION_AGENCY_URL`
- `PRODUCTION_ADMIN_URL`
- `PRODUCTION_LANDING_URL`
- `PRODUCTION_CORS_ORIGINS`

## 3. Release Ownership

Assign these before the release starts:

- Release commander: `________________`
- Database and migration owner: `________________`
- Smoke-test owner: `________________`
- Business signoff owner: `________________`
- Rollback approver: `________________`

## 4. Release Order

Follow this exact order:

1. freeze release window and notify stakeholders
2. verify last green commit or tag to release
3. take production database backup
4. confirm backup is restorable
5. trigger production workflow
6. watch build and migration step
7. watch smoke checks
8. run manual post-deploy validation
9. get business signoff

## 5. Workflow Truth

The production workflow currently does:

1. install dependencies
2. validate env and placeholders
3. build release candidate
4. publish immutable SHA-tagged images to GHCR
5. apply Prisma migrations
6. invoke the configured deployment orchestrator
7. smoke deployed production services

The deployment endpoint must follow
[DEPLOYMENT_ORCHESTRATOR_CONTRACT.md](./DEPLOYMENT_ORCHESTRATOR_CONTRACT.md).

## 6. Payment-Specific Release Rules

For launch:

- traveler checkout must show only bank transfer instructions
- proof upload must work before go-live
- admin proof review must be verified after deploy
- do not expose `CMI` or `CashPlus` in production until approved and tested

## 7. Go / No-Go Before Public Traffic

Do not open public traffic until all are true:

- [ ] production smoke checks passed
- [ ] signup and verification work
- [ ] booking creation works
- [ ] proof upload works
- [ ] admin proof review works
- [ ] agency dashboard loads
- [ ] wallet and payout surfaces load
- [ ] email delivery works

## 8. Release Log

- Release date: `________________`
- Commit or tag: `________________`
- Start time: `________________`
- End time: `________________`
- Decision: `Go / No-Go`
- Notes:

`____________________________________________________________`
