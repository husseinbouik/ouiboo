# Environment Validation And Dress Rehearsal

This is the non-repo validation checklist for staging and production readiness.

## Current execution record — 2026-11-10

Status: **BLOCKED — dress rehearsal not executed**.

Verified without mutation: all staging application URLs return 200; API readiness reports PostgreSQL and Redis `ok`; the local synthetic rehearsal for migration `20260915133000_add_currency_status_enums_and_indexes` passes. Not verified: candidate release attestation, worker heartbeat/job processing, SMTP delivery, private S3 upload/download, backup restore, rollback, or any authenticated agency/traveler/admin journey.

Required before execution:

- staging candidate SHA successfully migrated and attested by the single-owner workflow;
- staging-only traveler, agency, and admin identities approved for this rehearsal;
- a controlled test inbox and approved sender;
- an approved non-sensitive proof fixture and storage-retention decision;
- named agency-verification, payment-review, support, refund, and technical-incident owners;
- confirmed test trip policy and bank instructions;
- gateway flags explicitly false.

## Secrets And Service Setup

Verify both staging and production have:

- [ ] database connection configured
- [ ] email provider configured
- [ ] storage configured
- [ ] frontend app URLs configured
- [ ] API base URL configured
- [ ] webhook and callback base URLs configured

Record locations:

- Staging secret store: `________________`
- Production secret store: `________________`

## Staging Dress Rehearsal Script

Run this in staging with real team members, not mocks.

### Traveler flow

- [ ] sign up
- [ ] receive and complete email verification
- [ ] search for a trip
- [ ] open trip details
- [ ] create a booking
- [ ] confirm bank transfer instructions are shown correctly
- [ ] upload payment proof

### Admin finance flow

- [ ] open pending payment proof
- [ ] inspect uploaded proof
- [ ] approve proof
- [ ] confirm booking state changes to confirmed

### Agency flow

- [ ] agency sees the confirmed booking
- [ ] agency sees wallet state update
- [ ] agency submits payout request

### Admin payout flow

- [ ] admin sees payout request
- [ ] admin approves or rejects payout
- [ ] agency wallet state reflects the result correctly

## Email Validation

Validate these live:

- [ ] verify-email message is delivered
- [ ] proof-review related communication is deliverable
- [ ] refund email path is deliverable if currently enabled

Record sender and inbox tested:

- Sender: `________________`
- Inbox used: `________________`

## Storage Validation

- [ ] traveler proof upload succeeds
- [ ] admin can download proof
- [ ] unauthorized access is blocked
- [ ] uploaded file remains available for review window

## Required failure scenarios

- [ ] Reject an unreadable or mismatched proof with a reason; traveler sees the rejection and can follow the documented correction path.
- [ ] Request cancellation of a confirmed booking through the published support contact; record policy, owner, booking state, refund decision, and audit evidence without inventing an automatic refund.
- [ ] Simulate one email or worker-job failure; confirm the booking transaction remains correct, the job follows configured retry behavior, and the failure is visible to the technical owner.

## Worker evidence record

Record one real staging event as: job ID/name → enqueue time → worker receipt log → attempts/result → database state before/after → notification result. API/Redis health alone is not worker evidence.

## Analytics record

Until consent-approved funnel events are proven, record manually: visit, search, trip view, checkout start, booking created, proof uploaded, confirmed; and agency registration, verification, first trip, first departure, publication, first booking. Do not add tracking without privacy/consent review.

## Backup and restore evidence

`BACKUP CONFIGURED` and `RESTORE VERIFIED` are separate decisions. Before pilot signoff, the database owner must create or identify a staging backup, restore it into a newly named isolated non-production database, point a temporary API process at that restore, and verify Prisma migration status plus representative traveler search, booking, agency, and audit queries. Never overwrite the active staging database to test restore.

Record:

- Backup provider/job and artifact or snapshot ID: `EVIDENCE REQUIRED`
- Backup completion time and retention: `EVIDENCE REQUIRED`
- Isolated restore target: `EVIDENCE REQUIRED`
- Restore start/end time and result: `EVIDENCE REQUIRED`
- Prisma migration status after restore: `EVIDENCE REQUIRED`
- Query/API verification result: `EVIDENCE REQUIRED`
- Database owner: `OWNER REQUIRED`

For object storage, record whether versioning/provider backup is enabled, its retention, and one safe recovery test using a staging-only fixture. A database backup does not recover missing proof files.

## Minimum monitoring ownership

| Signal | Current evidence | Immediate intervention | Owner |
|---|---|---|---|
| API/frontends unavailable | Scheduled GitHub uptime workflow | Repeated non-200 after retry | `OWNER REQUIRED` |
| PostgreSQL/Redis unavailable | API readiness endpoints | Any staging/pilot readiness failure | `OWNER REQUIRED` |
| Worker unavailable | Heartbeat probe exists; deployment not evidenced | Stale heartbeat or Redis probe failure | `OWNER REQUIRED` |
| Repeated job failures | BullMQ attempts/backoff configured; no alert evidenced | Exhausted retries for booking/payment notification jobs | `OWNER REQUIRED` |
| Payment/manual-review errors | Server logs and audited state changes | Any cross-booking, duplicate credit, or unexplained transition | `OWNER REQUIRED` |
| Unexpected server errors | Application logs only; aggregation/alert route not evidenced | Repeated 5xx or booking-impacting exception | `OWNER REQUIRED` |

Record the log destination and alert channel before rehearsal: `EVIDENCE REQUIRED`. Do not treat GitHub workflow failure notifications as complete worker or application error monitoring.

## Exit Criteria

Staging rehearsal is complete only when:

- no step required engineering intervention
- booking state, wallet state, and payout state all match expected outcomes
- no missing secret or callback issue remains open

## Signoff

- Technical lead: `OWNER REQUIRED`
- Ops lead: `OWNER REQUIRED`
- Finance lead: `OWNER REQUIRED`
- Rehearsal date: `________________`
