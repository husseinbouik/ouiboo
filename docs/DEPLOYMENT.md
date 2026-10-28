# Deployment Guide — RETIRED, do not use as a procedure

> **This document no longer contains a deploy procedure.** Its previous
> body described a Docker / Docker Compose / Kubernetes / Helm
> deployment — staging and production namespaces, container registries,
> image scanning, pod scaling and rollback — that is **not** the live
> system and never was the deployment path. An operator following it
> would prepare artefacts that do not exist, look for clusters that do
> not exist, and miss the gates that actually protect a release. The
> body was replaced with this redirect on 2026-10-27 (#592, follow-up
> to the #442 docs correction in PR #591, which retired
> `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md` the same way). The old text
> remains in git history only.

## The live architecture (what deployment actually is)

- **Apps:** five Vercel projects per environment — Traveler, Agency,
  Admin, Landing (Next.js) and the API (NestJS) — deployed serverless:
  staging twins from `staging`, production from `master`. There are no
  Docker images, no Kubernetes, and no Helm charts in the live stack.
  Docker, where present in the repo, is a local-development
  convenience only.
- **Database:** Neon Postgres (Prisma ORM). Staging project
  `hidden-mountain-93789107`, production project
  `delicate-tree-54473957`.
- **Cache / rate limiting:** Upstash Redis.
- **Object storage:** Backblaze (S3-compatible) for uploads and
  payment proofs.
- **Email:** SMTP, configured purely by environment
  (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).
- **Payments at launch:** bank transfer + manual payment proof. The
  traveller pays the **agency directly**; Ouiboo never holds traveller
  money. Gateway payments stay **off** (`ENABLE_GATEWAY_PAYMENTS` is
  not enabled) until the gateway hardening work is verified.
- **Full architecture description:**
  [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md).

## Where the real procedures live

| Need | Governing document |
| --- | --- |
| Promote `staging` → production (the gated manual path, Gate A attestation + Gate B promotion, manual migration procedure, attestation record) | [`docs/launch-ops/RELEASE_RUNBOOK.md`](./launch-ops/RELEASE_RUNBOOK.md) |
| Beta operations: support lanes, escalation, refund-chase, alerting status | [`docs/launch-ops/BETA_OPS_CHECKLIST.md`](./launch-ops/BETA_OPS_CHECKLIST.md) |
| First actions in an incident (API down, active-trip escalation, refund overdue, proof dispute, lockout) | [`docs/launch-ops/INCIDENT_CARD.md`](./launch-ops/INCIDENT_CARD.md) |
| When and how to roll back, post-deploy validation | [`docs/launch-ops/ROLLBACK_AND_POST_DEPLOY_CHECKLIST.md`](./launch-ops/ROLLBACK_AND_POST_DEPLOY_CHECKLIST.md) |
| Monitoring and alerting truth (uptime monitor, dashboard logs) | [`docs/OPERATIONS_MONITORING.md`](./OPERATIONS_MONITORING.md) |

## Non-negotiables an operator must not relearn the hard way

- **Migrations never auto-apply.** A Vercel deploy does not run Prisma
  migrations, and CI never applies them. The release's named migration
  owner applies each migration by hand in the Neon Console SQL Editor
  — positively confirming the project on screen first — runs the
  migration's `migration.sql`, then inserts the `_prisma_migrations`
  row with the checksum set to the SHA-256 hex of the exact
  `migration.sql` file bytes and `applied_steps_count` 1. Verify
  afterwards via `information_schema.columns` and a live endpoint
  probe: the API boots fine with an unapplied migration, but any
  endpoint selecting the new columns 500s. Full procedure: Release
  Runbook, "Migration procedure".
- **No workflow promotes code.** Promotion is the gated manual path in
  the Release Runbook (one attested staging SHA, one batched
  `staging` → `master` PR, human blocking smoke, per-surface
  verification on the deployed apps). Legacy dispatch workflows in the
  repo are not part of it.
- **CI gates pull requests, it does not deploy.** GitHub Actions run
  the required check suite (CI, Security, Browser-E2E and the other
  required checks) on pull requests; a release is judged on the latest
  run per check name for the exact release SHA.
- **One immutable SHA.** Every piece of release evidence (CI,
  Security, Browser-E2E, deployments, smoke) must name the same
  staging SHA; any new push voids the attestation.
- **Traveller staging alias is static.**
  `ouiboo-traveler-staging.vercel.app` is a static alias, not a
  project domain, so it does not follow new staging deployments.
  After every traveller staging deploy, re-point it to the new
  deployment (`POST /v2/deployments/{deploymentId}/aliases`) and
  verify by served-content change — a 200 response is not proof.
  (Production traveller follows its project domain normally.)
- **`NEXT_PUBLIC_API_URL` must include `/api/v1`** on every frontend
  project, per environment.
- **Verify on the deployed environment**, per surface, with
  served-content proof — never on a build or a 200 smoke alone.

*Superseded 2026-10-27 — #592 (follow-up to #442 / PR #591).*
