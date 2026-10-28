# Leakage Defences — Definitions Note (#444 / Council P2-05)

Adopted with the first leakage-defence build. The council premise:
**contact details and the agency RIB are exchanged at booking #1 by
design** — the traveller pays the agency directly, so it needs the
bank instructions, and the departure pack shows the agency emergency
contact. No defence in this note tries to prevent that exchange.
Leakage is what happens next: the pair books again off-platform, and
the platform service fee on every repeat trip is never captured.

## The three defences (all live in code)

| Defence | Where | What it does |
| --- | --- | --- |
| Pre-booking contact-exchange detection | `POST /messages` + `contact-exchange.util.ts` | A message sent before any live booking exists between the pair is scanned for strong leakage shapes (phone, e-mail, IBAN/RIB, off-platform links). Flagged messages are **delivered**; the response carries `contactExchange: { detected, phase: 'PRE_BOOKING', categories }` so the client can show the keep-it-on-Ouiboo nudge, and an `AuditLog` row (`MESSAGE_CONTACT_EXCHANGE_DETECTED`) records the **categories only** — never the matched text, which is contact/bank data and must not be copied into logs. Post-booking messages are never flagged: that exchange is by design. |
| Fee-capture detection | `GET /admin/analytics/leakage` (admin) + `leakage-detection.service.ts` | The report below. |
| Rebooking value | `GET /bookings/rebooking-suggestions` + the traveller My Bookings "Book again" section | Upcoming bookable sessions from agencies the traveller has a CONFIRMED/COMPLETED booking with, at most 2 per agency, excluding sessions the traveller already holds. The relationship (recorded cancellation terms, payment tracking, refund record, reviews) is the reason to book again on-platform, surfaced at the moment a new trip is due. |

## The leakage report — definitions

`GET /admin/analytics/leakage?from=<ISO>&to=<ISO>` (admin role;
default window = last 30 days). Every number is derived from
operational tables; nothing is estimated.

| Term | Definition |
| --- | --- |
| Billable booking | A booking with `paymentStatus = PAID` and `confirmedAt` in the window — the exact predicate the monthly invoice generator bills on. |
| Captured booking | A billable booking with an `InvoiceLineItem` row. |
| Capture rate | Captured / billable, percent. `null` when nothing was billable (an empty window is neither a pass nor a fail). |
| Capture target | **>= 98%** — the QA beta exit threshold for fee capture (Council P1-05). `meetsTarget` is `null` when the rate is `null`. |
| Uncaptured, closed period | Billable, not captured, and the booking's invoice period (the UTC calendar month of `confirmedAt`) has ended. This is the detection list: fee that should have been invoiced and was not. Capped at 50 rows, oldest first, with gross totals per currency. |
| Awaiting invoice | Billable, not captured, period still open (or monthly generation not yet run). Informational only — **not** a capture failure. |
| Pair | One (traveller, agency) combination over live bookings (status not CANCELLED/REJECTED) created up to `to`. |
| Repeat pair | A pair with >= 2 live bookings. Repeat-pair rate = repeat pairs / all pairs. |
| At-risk pair | A pair with exactly 1 live booking, that booking COMPLETED, whose session ended **> 90 days** ago, with no on-platform rebooking since. The pair holds the contacts and the RIB by design. Capped at 50, longest-since-trip first. |
| Flagged message | A pre-booking message recorded by the contact-exchange detection, tallied by category. |

## Honest limits (read before acting on the report)

- **Off-platform trips are not observable.** No row anywhere records
  a booking that never touched Ouiboo. The at-risk cohort is a
  prioritisation signal for rebooking value (and any future retention
  work), never proof that a specific pair travelled off-platform —
  the traveller may simply not have travelled again. Do not confront
  an agency or a traveller with an at-risk flag as evidence.
- **Detection is precision-first.** Spelled-out numbers, "name at
  gmail dot com", and images of business cards are not detected, by
  design: a false flag accuses an honest user. Landline (05) numbers
  and Ouiboo's own links never flag; sharing a trip page is a
  supported flow, not leakage.
- **While the closed beta is free there is no fee to capture**
  (monetisation gate #426). Until fees switch on, the fee-capture
  section is plumbing verification — it proves the reconciliation
  runs on the real tables and that the invoice generator leaves no
  billable booking behind once generation has run for a period.

## What is NOT in the code build (founder/council remainder)

- Whether flagged pairs get any consequence (warning letter, account
  review, contract clause enforcement) is a **policy** decision for
  the founder/council; the code only detects and reports.
- Rebooking incentives with monetary value (returning-traveller
  pricing, agency-funded loyalty) need the monetisation decisions in
  #426 and agency terms; the code surface (suggestions + the visible
  relationship count) is built so such an incentive can attach later
  without new plumbing.
- The council trigger ("once volume exists") applies to acting on
  these signals at scale; the detection and value surfaces above are
  volume-independent and safe to run from the first booking.
