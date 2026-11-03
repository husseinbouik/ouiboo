# ADR 0001: Channel-manager-ready availability contract

**Status:** Accepted for Phase 2 implementation; no external connector is enabled at launch.

**Decision date:** 2026-11-03

## Context

At launch, an agency manages its own trip sessions and capacity in Ouiboo.
That is the authoritative inventory record.  Connecting a channel manager
before the booking, cancellation, payment, and refund lifecycle has been
operationally witnessed would introduce a double-booking risk without a
clear source of truth.

This ADR defines the minimum adapter boundary for a later single-provider
pilot. It intentionally does not select a provider, add credentials, expose
a public webhook, or change inventory behaviour.

## Decision

### Launch boundary

- `TripSession` capacity in Ouiboo remains the source of truth.
- There is no inbound availability, reservation, cancellation, or pricing
  synchronisation at launch.
- An agency must not use an external calendar as a second writable source for
  the same Ouiboo session. Support documents this during onboarding.
- Any future connector is feature-flagged per verified agency and disabled by
  default. A disabled, suspended, deleted, or unverified agency can never
  receive or publish availability through an adapter.

### Adapter contract

One provider adapter implements these commands and events. All identifiers
are opaque strings and all money values retain the booking/session currency.

| Operation | Minimum input | Required result |
| --- | --- | --- |
| `availability.changed` | tenant, local session, `version`, available seats | provider acknowledgement and correlation ID |
| `reservation.hold` | tenant, local session, booking, seats, idempotency key | hold reference, expiry, correlation ID |
| `reservation.confirm` | booking, hold/reference, idempotency key | confirmed external reference |
| `reservation.cancel` | booking, reason, idempotency key | cancelled/no-op acknowledgement |
| `reservation.reschedule` | booking, old/new session, idempotency key | confirmed new reference or explicit rejection |
| `refund.recorded` | booking/refund case, amount, currency, idempotency key | audit-only provider acknowledgement unless provider settlement is explicitly enabled |

Every command carries:

- `tenantId` (the agency ID), `correlationId`, `idempotencyKey`, and a UTC
  occurrence timestamp;
- the local aggregate ID and monotonically increasing `version`;
- an actor/source (`LOCAL`, `PROVIDER_WEBHOOK`, or `RECONCILIATION`); and
- a provider connection ID scoped to exactly one agency.

The application, not a client, calculates capacity and applies booking state.
An adapter may return an acknowledgement; it cannot mutate a session directly.

### Ordering, retries, and conflict handling

- Outbox records are persisted with the local transaction before delivery.
  A worker may retry a record safely using the same idempotency key.
- A delivery is terminally recorded as `SUCCEEDED`, `RETRYABLE_FAILURE`, or
  `DEAD_LETTER`; raw provider secrets and traveller PII never enter logs.
- Inbound events authenticate before parsing, use a provider event ID for
  replay protection, and are stored before acknowledgement.
- An inbound event whose tenant mapping is missing, whose agency is not
  eligible, or whose version is older than the local version is rejected and
  surfaced for reconciliation. It never overwrites local inventory.
- Concurrent last-seat booking remains governed by the existing database
  transaction/capacity invariant. A provider timeout produces an explicit
  pending/reconciliation state, never an assumed confirmation.

### Reconciliation and operations

At least daily, the connector compares the provider's mapped product/session
revision, capacity, reservation state, and cancellation state with the local
record. A drift record contains only IDs, versions, and counts. Agency users
can see affected sessions; admins can select a documented repair action after
review. No automatic overwrite is permitted for a capacity or confirmed
booking conflict.

Alerts are required for dead-letter deliveries, repeated signature failures,
unmapped products, stale reconciliation, and any potential oversell. The
on-call owner is the platform operations owner; the agency is responsible for
correct mapping and responding to a drift notice.

### Security requirements

- Provider credentials are validated server-side environment configuration;
  no credential reaches a browser or a database audit payload.
- Inbound webhooks require a documented signature verification algorithm,
  timestamp tolerance, replay protection, and a bounded raw-body size.
- Mapping lookup is tenant-scoped in every query. A provider product ID alone
  is never sufficient to identify a local session.
- The adapter accepts explicit allow-listed event types only and records a
  security audit event for rejected delivery metadata without payload content.

## Consequences

This keeps launch inventory simple and prevents a connector from silently
becoming a second source of truth. It also means channel-manager connectivity
is not a launch claim: a provider is chosen only after the Phase 2 readiness
gates below are met.

## Phase 2 entry and exit gates

Before enabling one pilot provider, deliver:

1. Prisma migration(s) for connection, mapping, outbox, inbox, and drift
   records, with tenant and idempotency constraints plus migration rehearsal.
2. A single server-side adapter selected by an approved provider assessment.
3. Contract, API E2E, and browser tests for duplicate and out-of-order events,
   timeout/retry, concurrent last seat, cancellation/reschedule/refund,
   signature failures, and cross-tenant attempts.
4. Staging credentials, a staged pilot agency, monitoring/alert routing, and
   an operator rollback/disconnect runbook.
5. A witnessed reconciliation and rollback rehearsal before any production
   tenant is enabled.

## Alternatives rejected

- **Direct provider webhooks into booking/session controllers:** couples an
  external payload to core state and makes idempotency and tenant review easy
  to bypass.
- **Two-way sync with no versioning:** permits stale updates to re-open a
  session or overwrite a newer cancellation.
- **Several providers in the first release:** multiplies payment, inventory,
  support, and incident modes before the one-provider contract is proven.
