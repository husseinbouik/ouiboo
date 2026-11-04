# Production checkpoint pipeline — design (#639, prod half)

Status: **design only**. Production migration/deployment mechanics are
deliberately NOT fully automated. The staging half of #639 is automated
in `.github/workflows/staging-release.yml`; this document is the
checkpoint design the production path must follow, and the remainder
left open on #639.

## Why a checkpoint, not full automation

The fully manual path caught real value in the Session #4 release
window: a preflight counted 19 pending migrations and verified the
wallet tables were empty (0/0/0 rows) before an irreversible drop, and a
`pg_dump` existed before the point of no return. The design keeps that
judgement gate and automates only the mechanics around it.

## The pipeline (in order — no step may be skipped or reordered)

1. **Preflight report** (automated collection, human/agent review)
   - Pending migration list: `prisma migrate status` against production,
     diffed against the target SHA's `packages/database/prisma/migrations`.
   - For every migration that drops a table/column or rewrites data:
     row counts of the affected tables, and a note of what is lost.
   - Tenant-orphan check on any table a migration touches.
   - Output: a preflight artefact attached to the release record.
2. **Backup** — a real `pg_dump` of production, stored outside the DB
   host, with its location + checksum recorded in the release record.
   No dump, no migration.
3. **Human gate** — steps 1–2 are reviewed before proceeding whenever
   any pending migration is destructive (drop/truncate/type-narrow/
   backfill-rewrite). Non-destructive releases (additive only) may run
   straight through after the preflight is attached.
4. **Migrate** — `prisma migrate deploy` exactly once, by the single
   migration owner (the `migrate` job of `release.yml`,
   `environment: production`). Never from a laptop, never per-app.
5. **Deploy** — app deploys pinned to the exact promoted SHA
   (`release.yml` `promote` job, Vercel API with explicit SHA ref).
6. **Verify** — post-deploy smoke against production URLs must pass;
   the promoted SHA + migration version are recorded in the GitHub
   release manifest (`release.yml` already writes one). A failed verify
   triggers the rollback guidance in `RELEASE.md`.

## Hard rules

- **Seeding never runs against production.** Any seed step in any
  pipeline must hard-refuse when the target is the production Neon
  project (`delicate-tree-54473957`). The staging release workflow
  contains no seed step at all; production tooling must refuse, not omit.
- **One migration owner per release** (repo AGENTS.md). If `release.yml`
  is migrating, nothing else migrates.
- **No promotion without a staging attestation** for the same SHA
  (see `STAGING_RELEASE_PATH.md`).

## Current state vs this design

`release.yml` already implements: SHA validation (staging ancestry +
READY staging deployments), the single-owner migrate job, SHA-pinned
deploys, a promotion manifest, and post-deploy smoke. **Not yet
implemented** (the #639 remainder): automated preflight artefact
(step 1), automated `pg_dump` + recording (step 2), and an explicit
destructive-migration gate input (step 3). Until those land, steps 1–3
are performed manually by the release operator and the evidence is
attached to the release record by hand.
