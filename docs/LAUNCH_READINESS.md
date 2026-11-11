# Launch Readiness

This is the source-of-truth pre-pilot checklist. `[x]` means verified evidence exists in the current code or recorded environment. `[ ]` means incomplete, externally owned or not yet rehearsed. Do not infer production readiness from a build alone.

## Evidence snapshot — 2026-11-11

The pull-request candidate is based on remote `staging` commit `4e26f28885da83181eab474ed70ab910deedc35f`; the stabilization documentation is committed on top of that base. It has not yet been deployed, so live staging health does not attest this candidate.

| Gate | Status | Evidence / required action |
|---|---|---|
| Git repository integrity | READY | The invalid `master`, `origin/HEAD`, `stash`, and `master` reflog pointers were repaired on 2026-11-11 after a recoverable `.git` backup and preservation of the historical and remote master commits. `git fsck --full` exits 0; dangling objects remain available for later housekeeping. |
| Production-like migration rehearsal | PARTIAL | Synthetic legacy rehearsal passed on 2026-11-10; an approved sanitized snapshot at representative cardinality is still required. |
| PostgreSQL staging readiness | PARTIAL | Staging `/health`, `/health/ready`, and `/health/db` returned 200 with `database: ok`; release migration attestation is not green. |
| Redis staging readiness | READY | Staging `/health/ready` and `/health/redis` returned 200 with `redis: ok`. This does not prove worker consumption. |
| Background worker | REQUIRES EXTERNAL INFRASTRUCTURE | Code, command, heartbeat, retries, and probe exist; no independently observed staging worker heartbeat or processed job evidence is available. |
| Private storage | PARTIAL | Private-key and authorization tests pass in code; no authenticated staging S3 upload/download/unauthorized-access rehearsal exists. |
| SMTP/email | REQUIRES EXTERNAL INFRASTRUCTURE | No staging mailbox, sender evidence, or approved test recipient was supplied. |
| Monitoring/alerting | PARTIAL | Scheduled uptime and staging smoke workflows passed on remote `master`; worker/job failures and error-rate alerts are not evidenced. |
| Backup/restore | REQUIRES EXTERNAL INFRASTRUCTURE | Procedures exist; no staging backup artifact and successful isolated restore evidence exists. |
| Rollback | PARTIAL | Immutable-SHA procedure is documented; application, worker, configuration, and DB compatibility rollback have not been rehearsed. |
| Full manual-payment journey | BLOCKED | No approved staging identities, test mailbox, proof fixture ownership, or finance reviewer was supplied. |
| Operational ownership | REQUIRES HUMAN ACTION | All launch roles and response targets remain unassigned. |
| Legal/business gates | REQUIRES HUMAN ACTION | Terms, privacy, agency agreement, verified-badge meaning, manual-transfer responsibility, refunds, disputes, and commission require approval. |

Remote evidence: all five staging application URLs and the API dependency health endpoints returned 200 on 2026-11-10. The scheduled `Staging Smoke Tests` run `42634821243` passed for remote SHA `4597c8be...`. The latest `Staging Release` run `42185003280` failed its required-check gate; its migration and attestation jobs were skipped. Therefore reachability is proven, but release provenance for the current candidate is not.

The local `scripts/smoke-deploy.mjs` run against those URLs was blocked by this workstation's Node TLS trust chain (`unable to get local issuer certificate`). TLS verification was not disabled. Direct PowerShell requests and the GitHub-hosted smoke workflow succeeded, so this is recorded as a local runner limitation rather than evidence that the staging sites were unavailable.

## Security

- [x] Production dependency audit has no Critical or High findings (`npm audit --audit-level=high --omit=dev`, 2026-11-10)
- [x] Sensitive verified agency changes return the agency to pending review and create an audit event
- [ ] Git history and production secrets have been reviewed after invalid refs are repaired
- [x] Current traveler/agency/admin API authorization inventory has been reviewed
- [x] Manual payment-proof path uses authenticated private access
- [ ] Gateway providers have been approved and validated; until then both gateway flags remain false

## Core traveler journey

- [x] Home search submits destination/date/traveler criteria to the existing search page
- [x] Search parameters are shareable and refresh-safe
- [x] Trip page displays selling agency and verification status
- [x] Trip page displays the available cancellation policy or a truthful missing-policy warning
- [ ] Every pilot trip has an operations-approved cancellation/refund policy
- [ ] Full staging booking and manual-payment journey has passed with real email and storage
- [ ] Booking confirmation and booking access have passed staging smoke testing

## Agency journey

- [ ] Registration and email verification passed in staging
- [ ] Agency verification SOP and named reviewer are approved
- [ ] Trip creation/editing passed in staging
- [ ] Departure creation and publishing passed in staging
- [ ] Booking management passed in staging
- [ ] Payment-proof inspection/review responsibilities passed in staging

## Infrastructure

- [x] GitHub release workflow is the single migration owner; application builds do not migrate
- [x] API and worker commands/configuration are separated in the repository
- [x] Staging landing, traveler, agency, admin and API URLs returned HTTP 200 on 2026-11-10
- [x] Staging API readiness reported PostgreSQL and Redis `ok` on 2026-11-10
- [ ] Exact candidate SHA passes the Staging Release gate, migration job and attestation job
- [ ] Production Redis and worker runtime are deployed and heartbeat-healthy
- [x] Playwright starts Next.js standalone artifacts like the container deployment
- [x] Local traveler smoke covers home/search/trip and booking/manual-payment confirmation
- [x] Basic scheduled frontend/API uptime monitoring is demonstrated on remote `master`
- [ ] Worker heartbeat, repeated job failure, payment-error and unexpected-server-error alerts are demonstrated
- [ ] Backup restore is rehearsed against a safe environment
- [ ] Rollback of the complete immutable release is rehearsed
- [x] Target migration passes the local synthetic legacy-data rehearsal
- [ ] Migration is rehearsed against an approved sanitized production-like snapshot

## Operations

- [x] Minimum controlled-pilot support process is documented in `MVP_SCOPE.md`
- [ ] Traveler support contact and coverage owner are assigned
- [ ] Cancellation and refund approvers/SOP are assigned and approved
- [ ] Payment-proof review owner and response target are assigned
- [ ] Agency verification owner and evidence checklist are assigned

Required ownership decisions:

| Responsibility | Required role | Named owner |
|---|---|---|
| Agency verification | Pilot Administrator | `OWNER REQUIRED` |
| Payment-proof and bank-receipt review | Pilot Finance Reviewer | `OWNER REQUIRED` |
| Traveler and agency support | Pilot Support Lead | `OWNER REQUIRED` |
| Cancellations | Pilot Operations Approver | `OWNER REQUIRED` |
| Refund authorization and evidence | Pilot Finance Approver | `OWNER REQUIRED` |
| Technical incidents and rollback | Pilot Technical Lead | `OWNER REQUIRED` |

The published support email/channel is also `OWNER REQUIRED`. Do not invite pilot users until it is visible in the traveler experience and monitored during the declared coverage window.

## Pilot analytics readiness

The landing application can load GA/Clarity only after consent, but the current worktree does not provide verified named events for the traveler or agency MVP funnels. Analytics must not delay the pilot if operators record the following counts in the approved pilot log: visit, search, trip view, checkout start, booking created, proof uploaded, booking confirmed; and agency registration, verification, trip creation, departure creation, publication, first booking. Any automated tracking added later requires a separate consent/privacy review.

## Legal and business — human validation required

- [ ] Terms reviewed by qualified counsel/business owner
- [ ] Privacy and consent reviewed by qualified counsel/business owner
- [ ] Agency agreement reviewed and signed off
- [ ] Payment responsibilities and bank-transfer wording approved
- [ ] Commission model documented and approved
- [ ] Verified-agency badge meaning approved

## Repository integrity — repaired with recovery references

The invalid pointers in `refs/heads/master`, `refs/remotes/origin/HEAD` and `refs/stash` were repaired on 2026-11-11 after the repository owner authorized the operation. A complete `.git` backup was created first at `../ouiboo-git-backup-20261111-131221` and verified to contain `HEAD`.

Observed root cause/evidence:

- loose `refs/heads/master` points to missing object `2278e228...` and shadows a valid packed `master` value;
- the valid historical packed commit `fca1a7b...` is preserved by `refs/heads/master-NTTD-9840PG4`;
- `refs/remotes/origin/HEAD` symbolically targets absent `refs/remotes/origin/master`;
- packed `refs/stash` points to missing object `c6a48db...`;
- remote `master` pointed to `ab4dfdf6...` and remote `staging` to `4e26f288...` at repair time;
- numerous dangling commits exist. The `-NTTD-9840PG4` collision files make a OneDrive/synchronization collision a plausible cause, but this remains an inference.

Completed recovery procedure:

1. created and verified the recoverable `.git` backup;
2. preserved historical master `fca1a7b...` as `recovery/historical-master-fca1a7b`;
3. preserved remote master `ab4dfdf6...` as `recovery/remote-master-20261111`;
4. restored local `master`, `origin/master`, and `origin/HEAD` from the authoritative remote master;
5. removed only the irrecoverable missing stash pointer and normalized the repaired master reflog entry;
6. reran `git fsck --full`, which exits successfully.

The backup and recovery branches must remain until the pull request is merged and the repository owner confirms no dangling commit contains required work. A full-history secret scan is still required before release.

Verification evidence:

- `git fsck --full`: exit `0`;
- `git reflog show master`: readable and resolves to `ab4dfdf6...`;
- `refs/remotes/origin/HEAD`: resolves to `refs/remotes/origin/master`;
- the previous missing stash object was not recreated or fabricated;
- no dangling object was pruned or garbage-collected.

## Pilot go/no-go

The controlled pilot remains **NO-GO** until all genuine blockers in the sections above have named evidence. See `docs/launch-ops/LAUNCH_DAY_GO_NO_GO.md` for the final decision record.
