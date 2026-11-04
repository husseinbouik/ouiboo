# Adapter Contract 0002: Channel-manager connectivity — normative contract

**Status:** Internal contract, **definition only**. No connector is built,
no provider is selected, no credential exists, and nothing in this document
enables synchronisation. It expands ADR 0001
(`docs/adr/0001-channel-manager-availability-contract.md`, delivered by PR
#763 for issue #757 criterion 1) into the normative adapter contract a
future single-provider pilot must implement.

**"Channel-manager-ready" — definition.** Ouiboo is channel-manager-ready
when (a) this contract and ADR 0001 are on file, (b) local inventory has a
single source of truth with versioned capacity (below), and (c) the Phase 2
entry gates in ADR 0001 are met. Readiness is a property of Ouiboo's
internal contract — it is **not** a claim that any channel manager is
connected, and no surface may describe Ouiboo as integrated with any
provider until a connector passes those gates.

## 1. Source of truth

- `TripSession` capacity in Ouiboo is the **only** writable source of truth
  for availability, at launch and after any connector ships.
- A channel manager is a **mirror and a command channel**, never a second
  writable inventory: external state is imported as *events to be decided
  by the application*, never as direct writes to sessions or bookings.
- If local and provider state disagree and cannot be reconciled by the
  rules in §6, **local state wins** and the disagreement becomes a drift
  record for human repair. A connector failure can therefore cost
  freshness, never correctness of the local book.
- An agency must not run an external calendar as a second writable source
  for the same Ouiboo session; onboarding states this (ADR 0001).

## 2. Product / session mapping

- Mapping is explicit, per agency, and created by the agency (or an admin
  on its behalf) before any event flows: provider connection → exactly one
  agency (`tenantId`); provider product → exactly one local trip template;
  provider session/date → exactly one local `TripSession`.
- Every lookup is **tenant-scoped**: a provider product ID alone never
  identifies a local session; the connection's agency is part of every
  query. An event whose mapping is missing, ambiguous, or belongs to
  another tenant is rejected and recorded for reconciliation (§6) — it is
  never applied.
- A mapping can be disabled at any time; disabling stops all inbound and
  outbound flow for that product immediately. Deleted, suspended, or
  unverified agencies, and agencies whose verification has lapsed, can
  never receive or publish availability through an adapter (ADR 0001).

## 3. Capacity holds and the booking state machine

Local states for an externally-originated reservation:
`NONE → HELD → CONFIRMED`, with `HELD → RELEASED` (expiry or cancel),
`CONFIRMED → CANCELLED`, `CONFIRMED → RESCHEDULED` (old session released,
new session held then confirmed as one operation), and `refund.recorded`
as an audit-only side event on a booking whose refund case completes
locally.

- **Hold (`reservation.hold`).** Input: tenant, local session, seats,
  idempotency key, correlation ID. The application — never the adapter —
  checks and decrements capacity inside the existing database
  transaction/capacity invariant. Result: hold reference + expiry (holds
  are short-lived; the exact TTL is set per provider at build time and
  recorded in the connection config), or an explicit rejection
  (insufficient capacity, ineligible agency, unmapped session). A provider
  timeout produces a **pending/reconciliation** state, never an assumed
  confirmation.
- **Confirm (`reservation.confirm`)** turns a live hold into a booking
  under the normal local booking lifecycle (terms snapshot, staged-payment
  parameters, seller block). An expired hold cannot be confirmed; it must
  be re-held.
- **Cancel (`reservation.cancel`)** releases capacity and follows the
  booking's own cancellation terms and refund floor — the connector never
  invents refund outcomes; any refund runs through the local RefundCase
  lifecycle and its evidence standard.
- **Reschedule (`reservation.reschedule`)** is hold-new + cancel-old with a
  single idempotency key for the pair; if the new hold fails, the old
  booking is untouched and the event is rejected explicitly.
- **Concurrent last seat** is decided by the local capacity invariant
  alone: exactly one of two competing holds wins; the loser receives an
  explicit rejection, and no oversell state is representable.

## 4. Idempotency keys

- Every command and event carries an `idempotencyKey` (sender-generated,
  unique per logical operation, retained on retry) plus a `correlationId`
  that ties hold → confirm → cancel/reschedule → refund records together.
- The receiver stores `(tenantId, idempotencyKey)` with a uniqueness
  constraint before applying anything. A replayed key returns the
  **original recorded result** without re-applying effects (no double hold,
  no double release, no double refund record).
- Keys are scoped per tenant and per provider connection; the same key
  from a different tenant is a different operation and also a security
  signal (§7).

## 5. Change versioning and ordering

- Every session's availability carries a monotonically increasing local
  `version`, incremented on every capacity-affecting change. Outbound
  `availability.changed` events carry the version they describe.
- Inbound events carry the provider's version/revision for the mapped
  session. An inbound event whose version is **older than the local
  version is rejected** (stale) and surfaced for reconciliation; equal
  version with different content is a conflict (drift record), never a
  silent overwrite; newer version is applied only through the state
  machine in §3.
- Out-of-order delivery is therefore safe by construction: order is
  resolved by version comparison, not arrival time.

## 6. Reconciliation

- At least daily, the connector compares provider vs local state for every
  mapped session: revision/version, available capacity, reservation state,
  cancellation state.
- A **drift record** contains only IDs, versions, and counts — no traveller
  PII, no payment data. Drift is surfaced to the agency (its own sessions)
  and to admin (all tenants).
- Repair is a **documented, human-chosen action** (accept local / re-push
  local to provider / manually adjust with an audit entry). There is **no
  automatic overwrite** of capacity or of a confirmed booking, in either
  direction.
- Alerts are required for: dead-letter deliveries (§7), repeated signature
  failures, unmapped products, stale reconciliation (no successful run in
  24h), and any potential oversell signal (provider shows more available
  than local for a mapped session).

## 7. Polling / webhook security

- **Webhooks are the primary channel; polling is the backstop** (the daily
  reconciliation in §6 doubles as the polling pass; a provider without
  webhooks is polled on the same cadence, never faster than the provider's
  published limits).
- Inbound webhooks must **authenticate before parsing**: documented
  signature verification over the raw body, a bounded timestamp tolerance,
  a bounded raw-body size, and an allow-list of event types. Verification
  failure → reject, record a security audit event (metadata only, no
  payload), and count toward the repeated-failure alert.
- **Replay protection:** the provider event ID is stored in an inbox table
  before acknowledgement; a redelivered event ID is acknowledged but not
  re-processed.
- **Durable delivery:** outbound events are persisted in an outbox with the
  local transaction before delivery; a worker retries with the **same
  idempotency key**; outcomes are terminally recorded as `SUCCEEDED`,
  `RETRYABLE_FAILURE`, or `DEAD_LETTER`. Raw provider secrets and traveller
  PII never enter logs or outbox payloads beyond the minimum identifiers.
- Credentials are server-side environment configuration only — never in a
  browser, a database audit payload, or a mapping record.

## 8. Operational ownership

| Responsibility | Owner |
| --- | --- |
| Connector availability, outbox/inbox health, dead letters, alerts | Platform operations owner (founder during the beta) |
| Mapping correctness (its products ↔ its sessions) | The agency, with admin visibility |
| Drift response for its own sessions | The agency, within one business day of notice; admin may pause the mapping if drift risks oversell |
| Provider selection, credentials, enable/disable per agency | Founder only, per the ADR 0001 Phase 2 gates |
| Kill switch | Admin can disable any connection or mapping instantly; disabling never alters local bookings |

## 9. Mapping to issue #757's acceptance criteria

| # | Criterion | Status |
| --- | --- | --- |
| 1 | ADR defines launch manual-inventory boundaries + Phase 2 contract, ownership, retry/reconciliation model | **Delivered by ADR 0001** (PR #763, merged to staging 2026-11-03). |
| 2 | Availability/capacity, reserve, confirm, cancel, reschedule, refund events have explicit idempotent semantics + correlation IDs | **Defined by this contract** (§§3–4). Enforcement ships with the Phase 2 connector build. |
| 3 | External updates cannot cross tenants, overwrite a newer local revision, or re-enable an ineligible/unverified agency | **Defined by this contract** (§§2, 5) + ADR 0001 eligibility rule. Enforcement + negative tests ship with the build. |
| 4 | Webhooks authenticate, verify signatures, record delivery/replay state, durable retry/dead-letter | **Defined by this contract** (§7). Implementation ships with the build. |
| 5 | Reconciliation surfaces drift to agency/admin with a safe repair workflow; alerts cover failed sync + oversell risk | **Defined by this contract** (§6). Implementation ships with the build. |
| 6 | Contract/API E2E tests cover duplicates, out-of-order events, timeout/retry, concurrent last seat, cancellation, tenant isolation | **Genuinely remaining** — tests can only exist against a built connector; they are Phase 2 entry-gate item 3 in ADR 0001. |

Nothing in this document selects a provider, creates credentials, exposes
a webhook, or changes inventory behaviour.
