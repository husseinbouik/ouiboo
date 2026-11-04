# Traveller funnel measurement — event taxonomy & privacy contract (#756)

Status: adopted for the closed beta (2026-11-04). Owner: Product (founder)
with Engineering as data steward. This document is the named taxonomy the
code must match: if an event or field is not named here, it is not
collected.

## Purpose

Distinguish, with aggregate numbers only, where the traveller funnel
loses people: traffic failure vs search failure vs checkout abandonment
vs proof-review delay vs payment failure — so marketing spend and
product work can be prioritised without invasive tracking.

## Privacy contract (binding)

1. **Aggregate-first.** Funnel readouts are counts and rates over a time
   window. No per-traveller funnel record is built, stored, or exposed.
2. **Consented.** Non-essential analytics (any future client-side
   pageview/event tooling) load only after affirmative consent and stop
   on withdrawal (the landing `AnalyticsConsent` pattern). Essential
   operational telemetry — the server facts in §2, derived from records
   the platform must keep to run bookings at all — is documented
   separately here and needs no additional consent gate, because it
   collects nothing new: it counts existing operational rows.
3. **Prohibited fields — never recorded in any analytics payload:**
   raw search text in new events, credentials or tokens of any kind,
   payment details (card/bank data, transfer references), payment-proof
   images or file keys, identity documents, message content, free-text
   form content, precise location, and any direct identifier bundled
   with behavioural data.
4. **Linkage.** Anonymous discovery and an authenticated booking are
   never joined into a person-level journey. Server facts are joined
   only in aggregate (counts over the same window), never by identity.
5. **Legacy exception, flagged:** the #432 `SearchEvent` log stores the
   traveller's capped search string with no identity attached (it powers
   the beta zero-result-rate gate in `docs/launch-ops/BETA_METRICS.md`).
   Raw search text is PROHIBITED for any new event; whether the legacy
   column is retained, hashed, or dropped is a founder/privacy decision
   to settle before public launch — it is not extended by this work.
6. **Retention.** Server facts inherit the retention of their source
   operational tables (bookings, payments, refund cases). SearchEvent
   rows: retained for the beta measurement window; review at beta exit.
   Any future client-side tooling must state its own retention here
   before it is enabled.

## 1. Funnel steps (named events)

| # | Step / event name | Where observed | Status |
|---|---|---|---|
| 1 | `search_performed` | Server: `SearchEvent` row per public catalogue search (allowlisted filters only) | LIVE (#432) |
| 2 | `search_zero_result` | Server: `SearchEvent.resultCount = 0` | LIVE (#432) |
| 3 | `trip_detail_viewed` | Client-side only — NOT collected until a consented tool is chosen (see §4) | DEFERRED |
| 4 | `session_selected` | Client-side only — same deferral | DEFERRED |
| 5 | `checkout_started` | Client-side only — same deferral. The server cannot truthfully observe a checkout that never submits, and must not pretend otherwise | DEFERRED |
| 6 | `booking_created` | Server fact: `Booking` row created | LIVE (readout) |
| 7 | `payment_proof_submitted` | Server fact: booking carries a payment proof | LIVE (readout) |
| 8 | `proof_bank_confirmed` | Server fact: an `ExternalPayment` for the booking is bank-confirmed by the agency (#422) | LIVE (readout) |
| 9 | `booking_confirmed` | Server fact: booking `confirmedAt` stamped | LIVE (readout) |
| 10 | `booking_completed` | Server fact: booking status `COMPLETED` | LIVE (readout) |
| 11 | `booking_cancelled` | Server fact: booking status `CANCELLED` | LIVE (readout) |
| 12 | `refund_outcome` | Server fact: `RefundCase` status mix for cases requested in the window | LIVE (readout) |

Owner per event: Product owns definitions; Engineering owns the
derivation code (`apps/api/src/analytics/`); the readout is
`GET /admin/analytics/funnel` (admin-only), implemented by
`FunnelMetricsService`. Lawful basis / consent category: steps 1–2 and
6–12 are essential operational telemetry (contract performance /
legitimate interest in running the marketplace); steps 3–5 will be
consent-based analytics if ever enabled.

Idempotency/dedup: server facts are derived from operational rows, so
they are idempotent by construction — re-running the readout can never
double-count an event, and a booking's state transitions are recorded
once by the booking machine itself.

## 2. Readout shape

Counts per step for the window, bookings-by-status, refund cases by
status, and step-to-step conversion percentages (null when the
denominator is zero). No identifiers, no free text, no money amounts —
money lives in the beta-metrics readout, not the funnel.

Breakdowns by acquisition source / locale / device are NOT available
from server facts and are explicitly not fabricated: they arrive only
with the deferred consented client tooling (§4), if it is ever adopted.

## 3. Experiment guardrails

No experimentation framework is built. When an experiment is proposed,
it must be written down (in the PR or issue that ships it) with:

- **Hypothesis + single primary success metric** from the taxonomy
  above (a named step conversion), fixed before launch.
- **Exposure rule:** who is in, who is out, and how assignment is made;
  assignment must not use prohibited fields.
- **Guardrail metrics:** refund rate, dispute rate, proof-review lag,
  and error rate must not regress beyond a stated threshold; breaching
  a guardrail stops the experiment, not the analysis.
- **Pricing/payment experiments stay server-authoritative:** a variant
  may change presentation, never the money math — amounts are always
  computed by the server from stored prices/rules (#695/#778/#755), and
  no variant may show a traveller a price the server would not charge.
- **Rollback:** a named kill switch (feature flag or revert) and the
  person who can pull it; results are recorded against this taxonomy's
  event names so they stay comparable after rollback.

## 4. Deferred (explicitly not built)

Client-side pageview/event tooling selection (steps 3–5), acquisition
attribution, and per-source/locale/device breakdowns — deferred by the
issue's privacy-first ordering: taxonomy and server facts first, tooling
choice only after the consent design is reviewed. Remainder is tracked
on #756.
