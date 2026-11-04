# Retention enforcement (#438, Council P1-12)

The retention schedule was **adopted as the working rule by the founder
on 2026-10-28** (pending counsel confirmation at the CNDP session). The
canonical schedule lives in the goal workspace
(`files/legal/retention-schedule-DRAFT.md`); this document records how
the code enforces it and where the scheduling configuration lives.

## What runs

`RetentionService` (`apps/api/src/retention/`) purges, in batches, the
categories whose periods the adopted schedule **defines**:

| Category | Period | Rule in code |
| --- | --- | --- |
| Audit logs | 3 years | `AuditLog.createdAt` older than the period (the admin prune endpoint stays env-driven and untouched) |
| Search-event analytics | 13 months rolling | `SearchEvent.createdAt` |
| Notification logs (incl. mail bodies) | 90 days | `NotificationLog.sentAt` — the schedule's "server/application logs: 90 days" row, for the DB-resident application log |
| Webhook inbox | 90 days | `WebhookInboxEntry.receivedAt`, terminal processing states only (never `RECEIVED`) |
| Expired auth material | at expiry | expired `RefreshToken` rows deleted; expired OTP / password-reset fields on `User` cleared |
| Messages + attachments | 2 years after the thread's last message | whole conversation; attachment objects deleted from storage first |
| Payment proofs | 2 years after the booking's refund/dispute window closes | window anchor = latest closed refund case, else session end; open cases block the purge; storage object deleted, legacy `Booking.paymentProofUrl` pointer cleared |
| Refund case evidence | 2 years after case closure | evidence rows + stored files only; the case (financial record) stays |

Every period is env-overridable (`RETENTION_*`, see
`retention-config.ts`) so a counsel amendment is configuration, not a
code change. Every real run writes one `AuditLog` row with action
`RETENTION_PURGE` carrying the structured per-category counts — the
purge audit trail. A storage deletion failure skips that row for the
run (counted as `storageFailed`) instead of orphaning the file.

## NOT purged — counsel-held remainder

The schedule leaves these to counsel; **no job deletes them**:

- **Booking records** (5 years after completion — "counsel to confirm
  against Moroccan fiscal retention duties").
- **Agency verification dossiers** (relationship duration + 1 year —
  the schema has no relationship-end timestamp yet).
- **Invoices, credit notes, payment ledger** (fiscal archive; no
  period in the schedule).
- **Legal holds**: the exception mechanism itself is an open counsel
  question; the `RETENTION_PURGE` audit trail is what a future hold
  will key on.

## How it is invoked

`POST /api/v1/cron/retention` on the API, guarded by `CRON_SECRET`
(same pattern as `/cron/deadlines`), with `?dryRun=true` for a
count-only report.

Scheduling follows the existing external-pinger pattern and lives
**outside** this codebase's runtime:

- Vercel Cron entries live in `apps/api/vercel.json` (`crons` array).
- The GitHub-Actions pinger pattern lives in
  `.github/workflows/deadlines-hourly.yml` — a retention pinger is the
  same workflow shape pointed at `/api/v1/cron/retention` with a
  weekly cadence (retention needs no hourly cadence).

Enabling the retention ping (adding the vercel.json entry and/or the
workflow) is a coordinator/ops step at deploy time; the code ships
the endpoint, the dry-run mode and the audit trail only.
