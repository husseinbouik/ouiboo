# Production operations rehearsal

This is a preparation runbook. Never point these steps at production. Use isolated infrastructure, sanitized data, immutable release image SHAs, and named operator/reviewer pairs. Store evidence in the restricted launch-evidence location and link its index to issues #209 and #251.

## 1. Migration rehearsal on a sanitized snapshot

1. Owner exports a production-like snapshot using the approved sanitizer; verify direct identifiers, credentials, tokens, message bodies, bank details, documents, and payment payloads are removed.
2. Record source schema version, sanitizer version, row-count ranges, snapshot checksum, and access list. Do not record data values.
3. Restore into a newly created isolated database with outbound access disabled.
4. Run `node scripts/rehearse-migration.mjs`, then `npx prisma migrate deploy --schema packages/database/prisma/schema.prisma` against that isolated database.
5. Capture command exit codes, migration table before/after, preflight output, timings/locks, row-count comparisons, application smoke results, and reviewer sign-off.
6. Destroy the rehearsal database and snapshot copy under the approved retention policy.

Acceptance evidence: sanitized-snapshot approval, checksum, migration/preflight transcript, lock/duration measurements, before/after invariants, smoke report, destruction record.

## 2. Backup restore in isolation

1. Select a recent encrypted backup without changing its retention or source.
2. Restore it to a network-isolated account/project and a fresh database name.
3. Verify checksum, latest expected transaction timestamp, critical table counts, referential checks, and a read-only API smoke.
4. Measure RTO and recovery point; compare both with approved objectives.
5. Delete the isolated restore and record deletion evidence.

Acceptance evidence: backup identifier (not credentials), restore logs, integrity queries, RPO/RTO result, smoke output, teardown record, operator/reviewer.

## 3. Frontend/API rollback and migration recovery

1. Deploy candidate immutable image SHAs to rehearsal; record all five application image digests and schema version.
2. Run health, auth, traveler browse, agency read, and admin read-only smoke checks.
3. Redeploy the immediately previous known-good image digests without rebuilding.
4. Repeat smoke checks and verify sessions, static assets, queues, and API compatibility.
5. Treat database migrations as forward-only unless a migration has an explicitly reviewed safe reverse script. For incompatible changes, restore/forward-fix using the isolated recovery plan; never improvise a production rollback.

Acceptance evidence: candidate/previous digests, deployment timeline, smoke reports before/after, migration decision record, achieved rollback time, reviewer sign-off.

## 4. Providers and webhooks

Inject provider secrets from the environment secret manager and run `npm run smoke:providers`. It performs a read-only Stripe authentication check, SMTP `verify` without sending mail, S3 `HeadBucket`, and a local synthetic Stripe webhook signature verification. It never prints configured secret values.

Acceptance evidence: timestamped redacted pass/fail output, provider account/environment identifiers, least-privilege policy review, webhook delivery/retry evidence from each provider console, and signer rotation date. A passing local signature check does not prove public callback routing.

## 5. Alerts, dashboards, ownership, and incidents

Assign primary/secondary owners and escalation contacts for API availability/latency/error rate, database capacity/locks/replication/backups, queue failures, payment/webhook failures, email bounces, storage errors, auth anomalies, and certificate/domain expiry. Configure severity thresholds, paging hours, acknowledgement target, runbook link, and test notification. Exercise one synthetic incident through detection, acknowledgement, containment, communication, recovery, and retrospective.

Acceptance evidence: dashboard URLs, alert rule export, ownership roster, notification-test timestamps, incident timeline, communication sample, retrospective actions.

**Implemented (issue #399):** uptime checks and alerting run from the `Uptime Monitor` GitHub Actions workflow (every 15 minutes, production + staging), and API errors are emitted as structured `http_error` JSON log lines — see `docs/OPERATIONS_MONITORING.md`. An external log drain remains a Pro-gated follow-up (owner decision, 2026-10-23).

## Operator-only remaining work

- Run all five sections with sanitized or provider-controlled resources.
- Obtain two-person approval before any production-adjacent access.
- Capture every evidence item above and check each #209 acceptance checkbox only after review.
- Attach the restricted evidence index—not secret-bearing raw logs—to #209 and cross-link #251.
