# Production Deployment Runbook — RETIRED, do not use

> **This document no longer contains a deploy procedure.** Its previous
> body described a Docker/workers architecture — immutable Docker images
> for API, worker, Traveler, Agency and Admin containers, a controlled
> migration container, worker heartbeat checks — that is **not** the live
> system and never was the production path. An operator following it
> would prepare the wrong artefacts, look for containers that do not
> exist, and miss the gates that actually protect a release. The body was
> replaced with this redirect on 2026-10-27 (Council item P1-17, #442).
> The old text remains in git history only.

## The live architecture (what production actually is)

- **Apps:** five Vercel projects per environment — Traveler, Agency,
  Admin, Landing (Next.js) and the API (NestJS) — deployed serverless
  from their branches: staging twins from `staging`, production from
  `master`. There are no Docker images, no worker containers, and no
  Kubernetes in the live stack.
- **Database:** Neon Postgres (Prisma ORM). Staging project
  `hidden-mountain-93789107`, production project
  `delicate-tree-54473957`.
- **Cache / rate limiting:** Upstash Redis.
- **Object storage:** Backblaze (S3-compatible) for uploads and payment
  proofs.
- **Email:** SMTP, configured purely by environment
  (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).
- **Payments at launch:** bank transfer + manual payment proof. The
  traveller pays the **agency directly**; Ouiboo never holds traveller
  money, runs no wallet/payout flow, and applies no gateway in the beta
  path.

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
  owner applies each migration by hand in the Neon Console, exactly
  once, per the procedure in the Release Runbook. An endpoint that
  selects new columns will 500 until its migration is applied.
- **No workflow promotes code.** The gated path is the manual checklist
  in the Release Runbook. Legacy dispatch workflows in the repo
  (`release.yml`, `production-release.yml`) are **not** part of it;
  using one to bypass the checklist voids the release.
- **One immutable SHA.** Every piece of release evidence (CI, Security,
  Browser-E2E, deployments, smoke) must name the same staging SHA; any
  new push voids the attestation.
- **Verify on the deployed environment**, per surface, with
  served-content proof — a 200 response is not proof, and the traveller
  staging alias (`ouiboo-traveler-staging.vercel.app`) is static and
  must be re-pointed after every traveller staging deploy.

*Superseded 2026-10-27 — Council Session #1 item P1-17 (#442).*
