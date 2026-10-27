# Beta Ops Checklist — support, escalation, alerting (Council B17, #399 residual)

The operating checklist for the capped closed beta: what has actually been
tested, what is only traced in code, and what only the founder can close.
Status words used below, strictly:

- **TESTED** — exercised, with the evidence recorded next to it.
- **CODE-VERIFIED** — traced in code/config/docs; not exercised live.
- **FOUNDER-CONFIRM** — only the founder can close this (his phone, his
  signature, his accounts).
- **BLOCKED** — a finding prevents the test; the fix is named.

## 1. Health-failure alerting (#399)

**How it works (CODE-VERIFIED).** `.github/workflows/uptime-monitor.yml`
(master) runs on a `*/15 * * * *` schedule plus manual dispatch. Ten checks:
production + staging API `GET /api/v1/health` (HTTP 200 **and** a body
containing `"database":"ok"`) and the five production + five staging
frontend URLs (HTTP 200). Every target gets 2 attempts (30s timeout, 10s
pause), so a cold start does not raise a false alarm. On any failure the run
exits 1, the run's step summary names the failing target(s), and GitHub
sends its failed-workflow notification to the workflow owner. There is no
paging service; acknowledgement is "a human saw the GitHub notification".
Full description: `docs/OPERATIONS_MONITORING.md`.

**Evidence recorded 2026-10-27.**

- TESTED (pass path): every retained run in the workflow's history is a
  success — 15 runs from 2026-10-25 to 2026-10-27, including one manual
  `workflow_dispatch` run (2026-10-25). Live probe on 2026-10-27 (~13:05
  UTC): all five staging targets returned HTTP 200, and the staging health
  body was `{"status":"ok","database":"ok","redis":"ok"}` — the exact
  payload the monitor asserts.
- TESTED (failure-branch logic): the monitor's own check script, unchanged,
  was executed against the real staging health URL (result: OK) and a
  deliberately nonexistent staging path (HTTP 404 on both attempts). The
  script printed the FAIL lines, wrote `- FAIL: **DRILL DEAD TARGET** …`
  to the step summary, and exited 1. (A live failing *run* could not be
  produced without editing the workflow on `master` or breaking a staging
  target; the drill workflow branch used in prep was deleted.)
- Cadence caveat (observed): the retained runs are spaced ~1.5–6 hours
  apart (median ≈ 4.8h), not 15 minutes — GitHub scheduled runs are
  best-effort. During the beta, treat alert latency as **hours, worst
  case**, not 15 minutes.

**FOUNDER-CONFIRM — still owed.** No run of this workflow has ever failed
(0 failure runs in its history), so a GitHub failure notification for this
workflow has never been generated, and receipt on the founder's phone is
unproven. Close it with the drill in Appendix A and record the run URL +
notification time here.

## 2. Errors visible in dashboard logs

**CODE-VERIFIED.** The API's global exception filter emits one structured
JSON line per error response — `{"event":"http_error", …}` with method,
path (query string stripped, so signed tokens never reach the logs),
status, exception class, and correlationId; 4xx at warn level, 5xx at
error; no bodies, headers, or personal data. Read them in the Vercel
dashboard → the API project → **Logs**, searching `"http_error"` or
`"status":500`. Logs live only in the dashboard on the free plan
(external drains are a Pro feature, declined 2026-10-23).

**Live sighting — not yet run.** Per `docs/OPERATIONS_MONITORING.md`
(Drill 5): call an unknown route and a bad login payload against staging,
then confirm both appear as `http_error` lines in the dashboard logs
within minutes. Run this in the staging verification pass and record
date/initials here: ______________

## 3. Support inbox — `support@ouiboo.com`

**BLOCKED — finding (2026-10-27).** The domain `ouiboo.com` returns
NXDOMAIN: it has no DNS delegation at all (verified via public
DNS-over-HTTPS with control domains passing). No MX record can exist, so
**mail addressed to `support@ouiboo.com` — the address the product
publishes as its support and escalation channel — cannot be received by
anyone today.** The same applies to `privacy@ouiboo.com`. The address is
the default in `apps/traveler/src/lib/support.ts` (overridable via
`NEXT_PUBLIC_SUPPORT_EMAIL`) and is presented to travellers as a
monitored inbox in the support pages and the booking trip-contacts card.

**CODE-VERIFIED (outbound is a separate path).** Transactional email
leaves through the API's nodemailer SMTP transport, configured purely by
environment (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`; the From
address is the `SMTP_USER` account). Outbound mail does not depend on the
`ouiboo.com` domain; inbound support mail does.

**Before the first invited traveller (founder-owned):**

- [ ] Register/activate the `ouiboo.com` domain and create a monitored
      mailbox (or alias/group) for `support@` — **or** set
      `NEXT_PUBLIC_SUPPORT_EMAIL` to an already-monitored inbox on every
      traveller deployment and make the published copy match reality. Do
      not invite travellers while the published address cannot receive
      mail.
- [ ] Send test: email the support address from an external account →
      confirm receipt in the monitored inbox → reply → confirm the reply
      arrives. Record the date and both message subjects here:
      ______________
- [ ] State the monitored hours and the 48-hour normal-lane commitment
      in the beta invite (see §4).

## 4. Beta escalation channel (active-trip emergencies)

The product split (#419, verified): the agency's emergency contact is
FIRST (shown on the booking's trip-contacts card); OuiBoo is the
escalation, monitored during active trip periods only — never a 24/7
promise. The normal lane is email with a 48-hour response commitment
(`NORMAL_SUPPORT_RESPONSE_HOURS = 48`).

**FOUNDER TO PROVIDE:** the escalation number —
`[FOUNDER TO PROVIDE: founder mobile / WhatsApp number for beta escalations]`.
It is deliberately not written here from any other context.

- [ ] The number appears in the beta invite **and** on the booking
      (trip-contacts card / booking confirmation), with the active-trip
      response expectation stated next to it.
- [ ] A test message is sent to the number and a reply received.
      **FOUNDER-CONFIRM:** record date + who replied here: ______________

## 5. Refund-chase checklist

Why this exists: the agency SLA is to initiate a refund within 7 days of
the case becoming due (`RefundCase.refundDueAt`; `REFUND_SLA_DAYS = 7`).
A daily cron backstop flips past-due cases to `REFUND_OVERDUE` and
restricts the agency's **new** bookings — but **no day-3 or day-7 message
to the traveller or the agency exists in code**. This daily human pass is
the control. (~5 minutes, founder, every day of the beta.)

- [ ] Open the admin refunds queue. List every case that is
      `REFUND_OVERDUE`, plus every uninitiated case within 2 days of its
      `refundDueAt`.
- [ ] For each, send or refresh the agency chase (template A) and note
      the chase date on the case.
- [ ] Day 3 after `refundDueAt` with no initiation: send the traveller
      the day-3 update (template B). Promise a new date only if the
      agency has given one.
- [ ] Day 7 (SLA breach): the case should now be `REFUND_OVERDUE` and the
      agency restricted from new bookings — confirm the restriction is
      showing, escalate to a direct call/WhatsApp to the agency owner,
      and update the traveller the same day.
- [ ] On completion: confirm the evidence is attached (bank reference +
      retained document) — since the #416 fix, the API refuses to
      complete a case without qualifying evidence.

**Template A — agency chase (email/WhatsApp):**

> Subject: Refund overdue — booking `{{booking_id}}`
>
> Hello {{agency_name}}, the refund of {{amount}} MAD for booking
> `{{booking_id}}` was due on {{due_date}} and has not been initiated.
> Please initiate it today and send the bank reference; unresolved
> overdue refunds restrict new bookings on your account. — OuiBoo

**Template B — traveller day-3 update:**

> Subject: Update on your refund — booking `{{booking_id}}`
>
> Hello {{traveler_name}}, your refund of {{amount}} MAD is still with
> {{agency_name}}, who pays refunds directly. It was due on {{due_date}};
> we have chased the agency today and will update you again by
> {{next_update_date}}. Your case stays open until the refund is
> completed with bank evidence. — OuiBoo Support

(Templates A and B are new; fold them into
`SUPPORT_MACROS_AND_ESCALATION.md` at its next revision.)

## 6. Restriction lift after an evidence-backed completion

**CODE-VERIFIED (traced 2026-10-27, `apps/api/src/refunds/refunds.service.ts`).**

- `RefundsService.complete()` — the only completion path, gated on
  qualifying evidence (the tier rules; an admin completion additionally
  requires a prior, separate admin-review record) — calls
  `refreshAgencyRestriction(agencyId)` immediately after its transaction
  commits.
- `refreshAgencyRestriction` recounts the agency's `REFUND_OVERDUE`
  cases. When the count reaches 0 and the restriction on file is the
  refund system's (reason `OVERDUE_REFUND`), it clears
  `newBookingsRestrictedAt` / `newBookingsRestrictionReason` in a
  transaction and writes a `REFUND_AGENCY_RESTRICTION_CLEARED` audit row.
  If another case is still overdue, the restriction correctly stays.
- The same recompute also runs after `initiate()`, after `fail()`, and
  inside the overdue sweep (`markOverdueCases`, driven by the daily cron
  backstop), so the flag re-derives daily even if one call were missed.
- Unit coverage (`refunds.service.spec.ts`): "overdue sweep flips
  past-due cases and restricts NEW bookings without touching existing
  bookings" and "restriction clears once no overdue cases remain".

**Not live-tested.** No staging case has yet been driven
overdue → restricted → completed → lifted end-to-end. Run it once in the
staging verification pass with a seeded past-due case and record the run
here: ______________

## Appendix A — failure-alert drill (founder-approved, ~10 minutes)

1. In a PR against `master`, temporarily point ONE `check_url` line in
   `.github/workflows/uptime-monitor.yml` at a nonexistent path on a
   staging URL.
2. Actions → Uptime Monitor → Run workflow. Expected: the run fails, the
   step summary names the dead target, and GitHub notifies the workflow
   owner.
3. The founder confirms the notification reached his phone (GitHub app /
   email) and records the run URL + time in §1.
4. Revert the line in a second PR.
