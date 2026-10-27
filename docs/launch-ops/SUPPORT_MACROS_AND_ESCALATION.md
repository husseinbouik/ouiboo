# Support Macros And Escalation Matrix

These are launch-safe response templates for traveller, agency, and
internal escalation.

**The support operation these macros assume (#419).** Support is a
solo, founder-run operation — there is no support team, no finance
team, and no in-app chat. One monitored inbox (configured per
deployment via `NEXT_PUBLIC_SUPPORT_EMAIL`; never hardcode an address
into a reply). Two lanes only:

- **Normal lane — email, response within 48 hours**
  (`NORMAL_SUPPORT_RESPONSE_HOURS = 48`). This is the target for every
  macro below unless it says otherwise.
- **Active-trip emergency — agency first, Ouiboo escalation.** The
  agency's emergency contact (on the booking's trip-contacts card) is
  the traveller's first call. Ouiboo is the escalation, monitored
  during active trip periods only, via the founder escalation number
  (phone / WhatsApp, `NEXT_PUBLIC_SUPPORT_PHONE`). **Never promise
  24/7 cover.**

**Money model the macros must not contradict.** Travellers pay the
agency directly (bank transfer + payment proof at launch); Ouiboo
never holds traveller money, and there is no wallet or payout flow —
the pre-#419 payout macros were removed from this document for that
reason. An accepted payment proof is **not** settlement: only the
agency's bank confirmation settles a booking. Refunds are paid by the
agency directly, tracked as a `RefundCase` with a 7-day initiation
SLA (`REFUND_SLA_DAYS = 7`).

**Localisation status.** The macros in this document are the English
working copies. The traveller-facing support *pages* and the
transactional email system carry equivalent support copy in EN / FR /
AR (locale files and `apps/api/src/email/email-i18n.ts`, parity-tested).
These macros have **not** yet been translated into FR / AR in this
document: before replying to a traveller in French or Arabic, translate
the macro — do not send the English text as if it were the localised
version, and keep the 48-hour and agency-first facts identical in every
language.

## Traveller Macros

### 1. Booking Received

Subject: Your Ouiboo booking was received

Hello {{traveler_name}},

We received your booking for `{{trip_title}}`.
To confirm your booking, please complete the bank transfer using the payment instructions shown at checkout and upload your payment proof from your booking page. You pay the agency directly — Ouiboo does not take or hold your payment.

Booking reference: `{{booking_id}}`

Regards,
Ouiboo Support

### 2. Payment Proof Under Review

Subject: Your payment proof is under review

Hello {{traveler_name}},

We received your payment proof for booking `{{booking_id}}`.
The agency reviews the proof against its bank account, and your booking is confirmed once the agency confirms the transfer arrived. Accepting the proof alone does not settle the booking — the agency's bank confirmation does.

We reply to support email within 48 hours; if you have heard nothing from the agency by then, reply to this email and we will chase it for you.

Regards,
Ouiboo Support

> Replaces the pre-#419 version, which promised review by "our finance
> team" "within 1 business day". There is no finance team and no
> 1-business-day promise in the #419 support operation.

### 3. Payment Confirmed

Subject: Your booking is confirmed

Hello {{traveler_name}},

Your payment for booking `{{booking_id}}` has been confirmed by the agency.
Your trip is now confirmed for `{{trip_title}}`.

Regards,
Ouiboo Support

### 4. Payment Rejected

Subject: Action needed for your booking payment

Hello {{traveler_name}},

The agency could not approve the payment proof for booking `{{booking_id}}`.

Reason: `{{rejection_reason}}`

Please upload a corrected payment proof or contact support if you need help.

Regards,
Ouiboo Support

### 5. Refund Case Opened

Subject: Your refund case is open

Hello {{traveler_name}},

A refund case has been opened for booking `{{booking_id}}`.
Your payment went directly to {{agency_name}}, so your refund comes from them too — Ouiboo never holds your money. The agency has until `{{due_date}}` (7 days) to initiate your refund, and we chase it for you if it slips. You can follow the refund status any time in your bookings.

Regards,
Ouiboo Support

### 6. Refund Initiated

Subject: Your refund has been initiated

Hello {{traveler_name}},

{{agency_name}} has initiated your refund of `{{amount}} MAD` for booking `{{booking_id}}`.
We will update you once the refund is completed with the agency's bank evidence.

Regards,
Ouiboo Support

> Corrected from the pre-#419 version, which said Ouiboo had initiated
> the refund. Ouiboo initiates nothing: the agency pays, Ouiboo tracks
> the case and chases it (see the refund-chase macros below).

### 7. Refund Completed

Subject: Your refund is complete

Hello {{traveler_name}},

Your refund for booking `{{booking_id}}` has been completed by {{agency_name}}.
If you do not see the funds yet, please allow for your bank processing time.

Regards,
Ouiboo Support

### 8. Service Problem (outage acknowledgement)

Subject: We are aware of a problem with Ouiboo

Hello {{traveler_name}},

We are aware of a problem affecting Ouiboo and we are working on it. We will update you by email when it is resolved.
If you are travelling today, your agency's emergency contact — on your booking's trip-contacts card — remains your first call.

Regards,
Ouiboo Support

## Agency Macros

### 1. Verification Pending

Hello {{agency_name}},

Your agency profile is under review.
We will notify you once verification is complete or if we need additional information.

Regards,
Ouiboo Team

### 2. Refund Chase (agency)

Folded in from `BETA_OPS_CHECKLIST.md` §5, template A — send or refresh
this chase for every overdue or near-due refund case in the daily
refund-chase pass:

> Subject: Refund overdue — booking `{{booking_id}}`
>
> Hello {{agency_name}}, the refund of {{amount}} MAD for booking
> `{{booking_id}}` was due on {{due_date}} and has not been initiated.
> Please initiate it today and send the bank reference; unresolved
> overdue refunds restrict new bookings on your account. — Ouiboo

### 3. Traveller Day-3 Refund Update

Folded in from `BETA_OPS_CHECKLIST.md` §5, template B — send on day 3
after `refundDueAt` with no initiation:

> Subject: Update on your refund — booking `{{booking_id}}`
>
> Hello {{traveler_name}}, your refund of {{amount}} MAD is still with
> {{agency_name}}, who pays refunds directly. It was due on {{due_date}};
> we have chased the agency today and will update you again by
> {{next_update_date}}. Your case stays open until the refund is
> completed with bank evidence. — Ouiboo Support

> The wallet/payout agency macros that used to sit here ("Payout
> Requested / Approved / Rejected", "the amount remains available in
> your wallet balance") were removed: there is no wallet or payout
> flow in the launch money model — agencies are paid directly by
> travellers.

## Escalation Matrix

Support is solo: the founder is the primary **and** only backup for
every row during the beta. There is no deputy — if the founder is
unreachable, an active-trip traveller's first call remains the agency's
emergency contact, per the #419 split.

### Finance / payment-proof issue

- Examples: unclear proof, missing transfer, amount mismatch
- Primary owner: `Founder`
- Backup owner: `Founder` (no deputy in the beta)
- Response target: `within 48 hours (normal lane)`; a proof dispute is
  frozen — neither confirmed nor rejected — while it is open
  (see `INCIDENT_CARD.md` card 4)

### Booking dispute

- Examples: traveller says they paid, booking still pending, wrong session claim
- Primary owner: `Founder`
- Backup owner: `Founder` (no deputy in the beta)
- Response target: `within 48 hours (normal lane)`; if the trip is
  active, the active-trip emergency lane applies instead

### Refund exception

- Examples: urgent refund, partial refund request, disputed refund
- Primary owner: `Founder`
- Backup owner: `Founder` (no deputy in the beta)
- Response target: `traveller answered within 48 hours (normal lane)`;
  overdue cases are chased with the agency the same day they are
  identified, in the daily refund-chase pass
  (`BETA_OPS_CHECKLIST.md` §5)

### Direct-payment exception

- Examples: agency bank details mismatch, refund transfer sent but not received, missing funds on a direct agency payment
- Primary owner: `Founder`
- Backup owner: `Founder` (no deputy in the beta)
- Response target: `within 48 hours (normal lane)`

> This row replaces the pre-#419 "Payout exception" row. There are no
> Ouiboo payouts to except: payments move traveller ↔ agency directly.

## Launch Support Coverage

The beta operation, filled in honestly — solo founder cover, no rota:

- Traveller support owner: `Founder`
- Proof review owner: `the agency reviews its own bookings' proofs; Founder handles disputes and chases`
- Agency support owner: `Founder`
- Technical incident owner: `Founder`
- Weekend or after-hours fallback: `Founder only — no separate cover. The 48-hour normal-lane target applies seven days a week; outside active trip periods there is no staffed after-hours service and no 24/7 promise. During an active trip, the agency's emergency contact is the traveller's first call and the Founder is the Ouiboo escalation.`

*Updated 2026-10-27 — Council Session #3 item P2-11 / Support F10 (#581).*
