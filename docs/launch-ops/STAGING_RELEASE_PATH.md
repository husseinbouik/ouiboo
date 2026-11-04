# Staging release path — the single promotion path

Status: live on `staging` (issues #639, #502). This document is the
canonical description of how a commit becomes a staging release.

## The path

1. **PR into `staging`.** Branch protection requires all 8 contexts green
   before merge: `build (20.x)`, `browser-e2e`, `review`,
   `Secret scanning (Gitleaks)`, `SAST (CodeQL)`, `SAST (Semgrep)`,
   `CodeQL`, `smoke`.
2. **Merge to `staging`** produces the candidate SHA.
3. **`Staging Release` workflow** (`.github/workflows/staging-release.yml`)
   is the single release controller for that SHA. It triggers on `push`
   to `staging` (a `workflow_run`-triggered workflow would have to live
   on the default branch, `master`, to fire at all; `workflow_run` is
   kept as a secondary trigger that activates once this file reaches
   `master`, and manual dispatch can re-verify any staging SHA). It:
   - **Gate** — polls the check-runs API (60s interval, 45-minute
     budget) until the required push checks for that *exact* SHA
     complete, and verifies they all succeeded (`build (20.x)`,
     `browser-e2e`, `Secret scanning (Gitleaks)`, `SAST (Semgrep)`,
     `SAST (CodeQL)`, `CodeQL`). A failed required check blocks the
     release loudly; a gate still pending after the budget fails the
     run without attesting (re-run manually once checks complete).
     (`review` and `smoke` are PR-only contexts — they gated the merge
     in step 1.)
   - **Migrate** — runs `prisma migrate deploy` against the staging Neon
     DB (`STAGING_DATABASE_URL` Actions secret; staging project
     `hidden-mountain-93789107`). This workflow is the **single migration
     owner** for staging (#639). A migration failure fails the release.
     There is **no seed step** in the release path, by design, so the
     release path can never seed — and the guard step hard-refuses the
     production Neon project id (`delicate-tree-54473957`).
   - **Attest** — uploads a `staging-release-<sha>` artifact recording the
     verified SHA, the checks verified for it, and the migration outcome.
4. **App deploys.** Staging apps deploy on Vercel (git integration +
   coordinator-created deployments).

## Known bypass (remainder of #502 — read before claiming the contract is closed)

Step 4 is **not yet bound** to step 3: a Vercel deployment can still be
created for a SHA whose gate/migration has not completed, and the
coordinator's API-created deployments bypass the gate entirely. The
attestation therefore proves "this SHA passed every required check and
its migrations were applied by the single owner" — it does not yet prove
"only attested SHAs are serving".

Closing the bypass requires, in order:

1. Move staging app deploys into the `Staging Release` workflow as a job
   that `needs` the attestation job and deploys the attested SHA via the
   Vercel API (needs a `VERCEL_TOKEN` Actions secret — not currently
   provisioned for Actions).
2. Disable Vercel git-integration auto-deploy for the five staging
   projects (or set them to ignore builds not initiated by the workflow),
   so the workflow is the only deploy creator.
3. Make the post-deploy smoke run blocking against the deployed SHA
   (today `production-smoke.yml` gates PRs and runs on a schedule; it is
   not chained to the attestation).

Until all three land, treat the attestation artifact + this document as
the release record, and do not describe staging deploys as gate-bound.

## Production

Production promotion is a separate, manual, checkpointed path — see
`PRODUCTION_CHECKPOINT_PIPELINE.md` and the `Release — Promote Staging
SHA to Production` workflow (`release.yml`). Never promote a SHA that
has no staging attestation artifact.
