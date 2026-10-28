# Beta Metrics — Interim Definitions Note (#432 / B21)

One page, adopted **before** the closed beta starts, so beta readouts are
never re-litigated. This is the interim note required by Council Session #2
item B21; it does **not** replace the full definitions book (#432, P1-06),
which remains due before public launch.

**Where the numbers come from:** `GET /admin/analytics/beta-metrics`
(admin role; optional `from`/`to` ISO dates, default = last 30 days).
Every number is derived from operational tables plus the B21 search-event
log. Anything that cannot be derived is returned as `derivable: false`
with the reason — never estimated.

## Definitions (the only ones used during the beta)

| Term | Definition |
| --- | --- |
| Search | One call to the public catalog search (`GET /trips`). Recorded server-side in `SearchEvent` (query text, allowlisted filters, result count, timestamp). No traveller id, no IP, no user agent, no cookie/session linkage — the log cannot be tied to a person. |
| Zero-result search | A search whose total result count is 0. Zero-result rate = zero-result searches ÷ all searches in the window. |
| Booking | A `Booking` row. "Created in window" counts rows by `createdAt`. |
| Completed booking | A booking in status `COMPLETED` (the trip ran and closed). Not "paid", not "confirmed". |
| Gross booking value | Sum of `totalAmount` over COMPLETED bookings. This is traveller money paid to **agencies**. It is **not** OuiBoo revenue. (The platform-metrics field formerly named `gmv` carried this sum; it is now `grossBookingValue`.) |
| Platform revenue | Money OuiBoo itself earned. No fee capture exists before the monetisation gate (#426), so during the free beta platform revenue is exactly **0** — reported explicitly as `platformRevenue: '0.00'`, never inferred from booking totals. |
| Agency revenue trends | The agency analytics chart sums that agency's COMPLETED bookings — the agency's own takings from travellers. Legitimate as agency revenue; never platform revenue. |
| Funnel "sessions created" | The first funnel stage counts `TripSession` rows the agency created (supply). It was previously labelled "views" — there is **no** traveller-view measurement anywhere in the product, and the label has been removed. The funnel rate is `completionRate` = completed ÷ booking attempts. |
| Refund case | A `RefundCase` row (money the agency/its provider owes a traveller; OuiBoo never holds it). |
| Refund SLA | For cases with `initiatedAt` set: initiated within 7 days of `requestedAt`. Percent = within-7-days ÷ all initiated cases in the window cohort (cohort = `requestedAt` in window). |
| Proof → bank-confirmation lag | For payments bank-confirmed in the window: `ExternalPayment.bankConfirmedAt` minus the booking's `PaymentProof.uploadedAt`, in hours (median + average). |
| Dispute | A refund case whose traveller disputed the completion (`disputedAt` set; #416 dispute path). Rate = disputes opened in window ÷ bookings created in window × 1,000. |
| Stuck state | (a) a booking in `PENDING` or `AWAITING_VALIDATION` whose `updatedAt` is more than 48h old, or (b) a refund case in an active status whose `refundDueAt` passed more than 48h ago. Point-in-time count, not windowed. |
| Duplicate booking | Within the window, non-cancelled/non-rejected bookings beyond the first for the same (traveller, session) pair. This is the #494 canary: with idempotency keys live, duplicates should tend to 0; any appearance means a path bypasses the key. Rate = duplicates ÷ bookings created. |
| Terms recorded | A booking whose `termsVersion` is non-null (B9 acceptance record). `nullTermsAllTime` is the pre-B9 legacy backlog and is expected to be non-zero; the exit criterion applies to new bookings only. |
| Sweep pause | An agency currently paused by the verification-expiry sweep (`AgencyProfile.verificationPausedAt` set). Point-in-time only — historical pause counts are **not derivable** (the field is overwritten on unpause; no pause-history table exists). |
| Admin intervention | An `AuditLog` row written by the #423 intervention service (`ADMIN_BOOKING_REPAIRED`, `ADMIN_GROUP_FORCE_CONFIRMED`, `ADMIN_GROUP_CLOSED`, `ADMIN_DEADLINE_EXTENDED`). Reported as a count and per 100 bookings created. |
| Support response (48h) | **Not derivable.** Platform support runs over email (support@ouiboo.com, #419 split); no ticket or response timestamps are stored. The endpoint returns `derivable: false` instead of a number. Measure manually from the mailbox during the beta. |

## Beta exit criteria (adopted)

| Criterion | Target | Metric key |
| --- | --- | --- |
| Zero-result search rate | ≤ 20% | `searches.zeroResultRate` |
| Refund SLA | ≥ 95% initiated ≤ 7 days | `refunds.sla.percentWithin7d` |
| Disputes | ≤ 30 per 1,000 bookings | `disputes.per1000Bookings` |
| Stuck states | 0 unresolved > 48h | `stuck.total` |
| Duplicate bookings | < 1% | `duplicates.rate` |
| Terms recorded | 100% of new bookings | `terms.recordedRate` |
| Fee capture (#431) | ≥ 98% of platform service fees captured | `feeCapture` — wired as a gate value in `BETA_EXIT_GATES`, **inactive** while the beta is free (no fee exists to capture); activates with the monetisation gate (#426) |

The endpoint returns each criterion with its measured value and a
`pass` flag (`null` when the window has no data to judge — an empty
window is not a pass).

## Notes

- Rates over an empty denominator are `null`, never 0%.
- The ≥10 agencies / ≥25 trips / zero-result ≤20% liquidity gate is a
  **public-launch** gate, not a beta exit criterion; only the zero-result
  measurement is shared between the two.
- Fee-capture reconciliation (the other half of #432) stays moot while
  the beta is free: there is no fee to capture. It activates with the
  monetisation gate (#426).
