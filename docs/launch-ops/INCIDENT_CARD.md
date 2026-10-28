# Incident Card — beta (pin this)

One page. First actions only; the depth lives in the linked documents.
If two cards apply, work the traveller-facing one first. Owner for every
card during the capped beta is the founder (solo operation).

> ⚠️ **DO NOT USE `docs/PRODUCTION_DEPLOYMENT_RUNBOOK.md`** — it describes
> a Docker/workers architecture that is **not** the live system (Vercel
> serverless apps + Neon + Upstash + Backblaze). The governing release
> process is `docs/launch-ops/RELEASE_RUNBOOK.md`; monitoring truth is
> `docs/OPERATIONS_MONITORING.md`.

## 1. API down

*Signal: the uptime monitor fails, or travellers/agencies report errors.*

1. Vercel dashboard → API project → **Logs** (search `"http_error"`,
   `"status":500`) and the project's deployment list: is this a bad
   deploy, one route, or everything? Check whether production, staging,
   or both are affected (`/api/v1/health` must return `"database":"ok"`).
2. Bad deploy → roll back via the Release Runbook's Gate B rollback step.
   Never hot-fix `master` directly.
3. Escalate: production health failing > 30 minutes → notify anyone with
   an active trip today (card 2 posture) and answer support mail with the
   outage macro.

## 2. Agency unresponsive during an active trip

*Signal: a traveller escalates — the agency is not answering on trip day.*

1. The agency's emergency contact (on the booking's trip-contacts card)
   is the traveller's first call; if it has failed, you are the
   escalation. Phone/WhatsApp the agency owner directly — do not rely on
   email during an active trip.
2. Update the traveller with a named next step and a time ("I reach the
   agency by 15:00 or I call you back with the alternative"), then keep
   it.
3. Escalate: no agency response within 1 hour during the trip → decide
   the traveller remedy under the Agency Beta Agreement, and log every
   step on the booking.

## 3. Refund overdue

*Signal: a case sits in `REFUND_OVERDUE`, or a traveller asks where the
money is.*

1. Open the admin refunds queue. An overdue case already restricts the
   agency's **new** bookings automatically — confirm the restriction is
   showing on the agency.
2. Chase the agency the same day (template A in
   `BETA_OPS_CHECKLIST.md` §5) and send the traveller the day-3/day-7
   update (template B). Work the chase list daily; no automation sends
   these messages.
3. Never mark a case completed without attached evidence (bank reference
   + retained document) — the API refuses completion without qualifying
   evidence.
4. Escalate: 3 days past the SLA → direct call to the agency owner;
   record the outcome on the case.

## 4. Payment-proof dispute

*Signal: the traveller says they paid; the agency says nothing arrived.*

1. Freeze the state: do not confirm or reject the proof while the dispute
   is open. Ask the traveller for the bank transfer reference and the
   agency to check that exact reference; the booking's payment snapshot
   and proof record are the shared facts.
2. Remember the rule the whole flow is built on: an accepted proof is
   **not** settlement — only the agency's bank confirmation settles.
3. Escalate: a suspected forged proof → suspend the booking, keep every
   record untouched, and handle it under the Agency Beta Agreement.

## 5. Account lockout

*Signal: you (admin) are locked out, or an agency/traveller cannot sign
in.*

1. Admin: follow `docs/launch-ops/BREAK_GLASS_RUNBOOK.md` exactly —
   recovery code first, break-glass credential second. Every use is
   audited; there is deliberately no support-side reset.
2. Agency/traveller: verify identity against the account's own documents
   before any manual help; never reset access on a phone call alone.
3. Escalate: any break-glass use → same-day review of the admin Audit tab
   and replacement of the used credential.

---

*After any incident: write three lines — what happened, when, what fixed
it. If a runbook gap caused it, fix the card, not just the incident.*
