# Release Runbook — The Gated Manual Promotion Path

This runbook is the single governing process for promoting Ouiboo code from
`staging` to production. It replaces automation with a checklist on purpose.

## Why this exists (decision record)

- Founder decision on #502, approved 2026-10-27: the release workflow is
  **retired**, and the manual path documented here **is** the gated promotion
  path — the same evidence discipline, executed by checklist.
- `.github/workflows/staging-release.yml` was removed in the same change. It
  did not gate on CI, Security, or Browser-E2E, and its `verify-and-migrate`
  job applied Prisma migrations from a CI runner — a design that failed in
  practice (run 40242679785, error P1001: the runner could not reach the
  database). Migrations are never applied by CI again.
- The five apps deploy through Vercel from their branches (staging twins from
  `staging`, production from `master`). No workflow promotes code on its own.
  Other dispatch workflows in the repo (`release.yml`,
  `production-release.yml`) are legacy helpers and are **not** part of the
  gated path; using one to bypass this checklist voids the release.
- `production-smoke.yml` is **advisory only**: it runs against the staging
  URLs on pull requests and on a daily schedule with `continue-on-error` and
  auto-files issues on failure. It never gates a release. The blocking smoke
  in this runbook is a human pass, defined below.
- Council Session #2 (2026-10-27, item B13/D3): this gated path is the
  promotion requirement for public launch, with no exception. For the capped
  closed beta, a staging attestation under this runbook is the interim
  admission gate (see "Beta interim admission").

## Principles

1. **One immutable SHA.** A release is exactly one commit SHA on `staging`.
   Every piece of evidence below must name that same SHA.
2. **Evidence before promotion.** CI, Security, and Browser-E2E results are
   collected for the release SHA *before* anything is promoted. A green run
   for a different SHA is not evidence.
3. **One named migration owner.** Each release names a single migration
   owner in its attestation record. Only that person applies migrations for
   that release, exactly once, by hand.
4. **Migrations never auto-apply.** Vercel deploys do not run migrations.
   An endpoint that selects new columns will 500 until the migration is
   applied manually. Plan the order: migration first where the schema is
   additive, code first only where the change is provably backward
   compatible — and record the chosen order in the attestation.
5. **Freeze rule.** Once the attestation is signed, the release SHA is
   frozen. **Any new push to the branch voids the attestation** — evidence,
   deployments, and smoke must be re-collected for the new SHA.
6. **Verify on the deployed environment.** A release is done only when the
   behaviour is verified on the deployed apps, per surface — never on API
   probes alone.

## Gate A — staging attestation (the release record)

Complete in order for the chosen staging SHA:

- [ ] Staging head equals the release SHA; no unmerged PR is part of the
      release but missing from it.
- [ ] **CI evidence:** the latest `CI` check run for the SHA is green
      (check runs can duplicate names — judge the latest run per name by
      start time, never a cancelled duplicate).
- [ ] **Security evidence:** the latest `Security` check run for the SHA is
      green.
- [ ] **Browser-E2E evidence:** the latest `Browser E2E` check run for the
      SHA is green. Known flake: `traveler.spec.ts` — exactly one rerun is
      the established response; a second failure is a real failure.
- [ ] Any migration in the release applied to the **staging** database by
      the named migration owner (procedure below; staging Neon project
      `hidden-mountain-93789107`), and recorded.
- [ ] All five staging apps deployed at the SHA; record each Vercel
      deployment ID in the attestation.
- [ ] **Served-content proof per app:** fetch each staging app and confirm
      the served content changed with this deploy (a new chunk/hash or a
      visible change from the release). A 200 response is not proof.
- [ ] **Traveller staging alias re-pointed:** `ouiboo-traveler-staging.vercel.app`
      is a static alias and does not follow new deployments. After every
      traveller staging deploy, re-point it to the new deployment
      (`POST /v2/deployments/{deploymentId}/aliases`) and verify by
      served-content change. (Production traveller follows its project
      domain normally.)
- [ ] Functional verification pass on staging for every issue in the
      release, on a deployed surface. Only then may issues move to
      `status: verified in staging`.

## Gate B — production promotion

Production promotion is one batched release, never a stream of merges:

1. Open **one** pull request `staging` → `master` containing exactly the
   attested release. Its head must equal the attested SHA — if staging has
   moved, the attestation is void (freeze rule) and Gate A restarts.
2. Confirm the Gate A record is complete and signed before merging.
3. Take a production database backup and confirm it is restorable.
4. Merge the PR. `master` now equals the attested SHA.
5. Apply the release's migrations to the **production** database
   (Neon project `delicate-tree-54473957`), same named migration owner,
   same procedure, exactly once.
6. Watch the five production Vercel deployments reach READY at the SHA
   (deployment status is the `readyState` field). Record each production
   deployment ID in the attestation.
7. **Served-content proof per production app**, as in Gate A.
8. **Blocking smoke (human, real browser):** API readiness, traveller
   home/search, one trip page, agency login, admin login, and the release's
   headline flow end to end. Any failure blocks sign-off — stop, roll back
   per [ROLLBACK_AND_POST_DEPLOY_CHECKLIST.md](./ROLLBACK_AND_POST_DEPLOY_CHECKLIST.md),
   and record the failure in the attestation.
9. Verify the release's issues on production, per surface. Only then move
   them to `status: in prod` and close them.
10. Re-sync `staging` from `master` so the branches reconverge.
11. File the signed attestation with the release notes.

## Migration procedure (manual, Neon console)

Migrations never auto-apply on deploy, to either database. For each
migration in the release, the named migration owner:

1. Opens the Neon Console SQL Editor and **positively confirms the project
   on screen** — staging `hidden-mountain-93789107`, production
   `delicate-tree-54473957`. Never rely on the selected-project default.
2. Runs the migration's `migration.sql` as-is.
3. Records the migration in `_prisma_migrations`:

   ```sql
   INSERT INTO "_prisma_migrations"
     (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
   VALUES
     (gen_random_uuid(), '<sha256 hex of the migration.sql file bytes>', now(), '<migration folder name>', NULL, NULL, now(), 1);
   ```

   The `id` must be explicit (`gen_random_uuid()`); the checksum is the
   SHA-256 hex of the exact `migration.sql` file bytes.
4. Verifies afterwards: the new columns/tables exist
   (`information_schema.columns`) **and** a live endpoint that selects them
   answers without a 500.

## Attestation record (one per release)

Copy this block into the release notes / PR and complete every field.
Incomplete = not attested.

```
Release attestation — Ouiboo
Environment:        staging | production
Release SHA:        <full 40-char SHA>
Date:               <YYYY-MM-DD>
Release commander:  <name>
Migration owner:    <name — the only person who applied migrations>

Evidence (all for the SHA above):
  CI run:           <link / run id> — green
  Security run:     <link / run id> — green
  Browser-E2E run: <link / run id> — green (reruns: <n>)

Migrations applied: <folder names, or "none">
  Checksums:        <sha256 per migration>
  Verified via:     information_schema + live endpoint probe

Deployments (Vercel deployment ID + served-content proof per app):
  API:      <id> — <what changed in served content>
  Traveler: <id> — <proof> (staging: alias re-pointed — yes/no)
  Agency:   <id> — <proof>
  Admin:    <id> — <proof>
  Landing:  <id> — <proof>

Blocking smoke:     passed | failed (details)
Issues verified on this environment: <# list>

Signed: <name>, <date>
```

## Beta interim admission (B13)

For the capped closed beta, a complete Gate A attestation for one staging
SHA admits exactly that SHA as the frozen beta build:

- Auto-deploy stays disabled for the whole beta; any push voids the
  attestation and the beta build must be re-attested before further use.
- The attestation is an evidence record only. It permits neither production
  promotion nor any "verified in prod" claim.
- Public launch promotion always requires the full Gate A + Gate B path.

## Known traps

- Migrations do not auto-apply on Vercel deploy (see above) — the API
  boots fine and only the endpoints selecting new columns fail.
- Check runs duplicate names; a cancelled duplicate is not a failure.
  Judge the latest run per name.
- `NEXT_PUBLIC_API_URL` must include `/api/v1`.
- The Vercel free tier has a daily deployment cap; a blocked deploy is not
  a failed release — wait for the cap to reset and re-check `readyState`.
- The traveller staging alias is static (Gate A) — a green deploy with a
  stale alias looks exactly like an undeployed fix.
