# Agency Onboarding Runbook + B18 Checklist Pack — closed beta (#633)

**Status: kit only. NO outreach is authorised by this document.**
Recruitment starts only after the legal gates close: the written Law 11-16
classification opinion is signed, the CNDP formalities are filed, and the
counsel-checked French beta agreement exists. Until then this runbook is
preparation, and the tracker (below) stays empty of contacted agencies.

**Cohort:** 3–5 verified ODV agencies, Tangier–Tétouan–Chefchaouen cluster,
hand-recruited from the founder's desk target list (held in the goal
workspace, not in this repo — it contains contact details and stays out of
the repository). Desk-list facts the operator works from: 18 candidates;
11 with Ministry of Tourism ODV directory evidence; 7 confirm-first (no
licence evidence sighted — confirm before onboarding). One recommended
candidate was **not** sighted in the Ministry directory excerpts and must
not be counted in the core cohort until its licence has been sighted at
onboarding like everyone else's.

**Verification wording:** the only public verification wording is
**"Checked before listing"**. No verification timeframe is promised to
agencies or travellers — in particular, never promise verification within
48 hours.

## Operating rules

1. **Documents before data goes live.** No bank details are shown to
   travellers, and no trip may publish, until the B18 pack below is complete
   and recorded. There is no partial onboarding.
2. **Sight, don't trust.** Every document is sighted by the operator
   (original or legible copy) and the sighting is recorded — a claim by the
   agency, a directory listing, or a website badge is evidence to check,
   not a verification.
3. **The agency is the seller.** Onboarding never describes Ouiboo as
   selling, organising, or guaranteeing trips. The agency sells and
   delivers its trips in its own name; Ouiboo provides technology and
   promotion.
4. **The beta is free.** No platform service fee, no subscription, no
   credits during the beta. Any paid phase afterwards requires a **separate
   signed agreement** — no price and no date for a paid phase exists, and
   none may be quoted (see `AGENCY_OBJECTION_FAQ.md`).
5. **Recruitment time is blocked, not ambient.** The founder works
   recruitment in one dedicated weekly block (set in his calendar before
   outreach starts); demos and onboarding calls happen inside that block
   only, so recruitment cannot sprawl across the week. Per-agency operator
   time after the demo: one document-review pass, one listing session, one
   go-live check — all inside the block or the beta ops routine.

## The runbook (per agency, in order)

### Step 0 — Pre-contact check (desk, 10 minutes)
- [ ] Candidate is in the cluster and sells trips matching the beta
      catalogue.
- [ ] Desk licence evidence noted (Ministry-listed / confirm-first) in the
      tracker. Confirm-first candidates are contacted only if the core
      cohort cannot be filled from Ministry-evidenced candidates.
- [ ] Tracker row created (template below) at stage `IDENTIFIED`.

### Step 1 — First conversation
- [ ] Use the demo script (`AGENCY_DEMO_SCRIPT.md`); objections answered
      from `AGENCY_OBJECTION_FAQ.md` only — no invented terms.
- [ ] State the three beta facts plainly: completely free; agency is the
      seller and is paid directly by travellers; documents are sighted
      before anything goes live.
- [ ] Tracker → `CONTACTED`, then `DEMO DONE`, with dates.

### Step 2 — Document collection (B18 pack requested)
Send the agency the B18 checklist (below) as the single request list — one
ask, not drip-fed requests. Tracker → `DOCUMENTS REQUESTED`.

### Step 3 — Verification pass (B18 pack sighted + recorded)
Work the checklist pack item by item. Every item ends in one of:
**recorded** (sighted, details entered, verification record filed),
**rejected** (reason recorded, agency told what to fix), or **expired**
(pause rules apply). Tracker → `VERIFIED` only when every item is recorded.

### Step 4 — Agreement + account setup
- [ ] Counsel-checked French beta agreement signed (the agreement is the
      only source of terms; this runbook quotes none of it).
- [ ] Agency account created; seller-identity block completed from the
      sighted documents (Step 3), not from the agency's marketing copy.
- [ ] Bank details entered by the agency and released to traveller view
      **only after** the bank attestation check in the pack has passed.
- [ ] Emergency contact recorded and the Law 09-08 Art. 5 notices given
      (pack items 6–7).
- Tracker → `SIGNED`.

### Step 5 — First listings (assisted)
- [ ] First trips prepared **with** the agency; nothing publishes until the
      agency has reviewed and approved the exact listing, and the approval
      is recorded.
- [ ] Listing check: prices in MAD, staged-payment parameters inside the
      platform standard (deposit cap, minimum-group deadline), no contact
      details directing travellers off-platform, seller block shown.
- Tracker → `LISTED`. The agency counts toward the beta cohort (and, later,
  the public-launch gate) only from this step.

### Step 6 — Go-live confirmation
- [ ] Traveller-side spot check: trip page, checkout seller block, booking
      confirmation, trip-contacts card (agency emergency contact first,
      Ouiboo escalation second).
- [ ] Support split confirmed with the agency: platform/booking questions
      are Ouiboo's lane (reply within 48 hours); trip-logistics questions
      and traveller messages about its trips are the agency's lane; during
      active trip dates the agency's emergency contact is the traveller's
      first call.

## B18 per-agency checklist pack

Complete one pack per agency. File the completed pack with the verification
record; it is the evidence behind the "Checked before listing" wording.

| # | Item | Sight + record |
| --- | --- | --- |
| 1 | **ODV licence** (Law 11-16, organisateur de voyages) | Sight the licence. Record: licence number, licence date, issuing authority, expiry date, legal name on the licence. Check the name matches the company record (item 3). Cross-check against the Ministry list where available and record the check date. |
| 2 | **RC (civil liability) insurance** | Sight the certificate. Record: insurer, policy number, insured name (must be the agency), coverage limit, validity dates. Expired or name-mismatched = rejected. |
| 3 | **Company identity** | Record: legal name (raison sociale), legal form, RC number, ICE, registered address, legal representative (name + capacity). Must match items 1–2. |
| 4 | **Bank attestation — before bank details go live** | Sight the bank attestation (relevé d'identité bancaire / attestation) in the agency's legal name. Only after this passes may the agency's bank details be entered and shown to travellers. Any later change of account repeats this item in full before the new details reach travellers. |
| 5 | **Seller-identity block data** | From items 1–3, assemble exactly what travellers see at checkout, on the trip page, and in the booking confirmation: legal name, licence type, licence number, licence date, issuing authority, registered address, RC insurance status. The agency confirms the block in writing before go-live. |
| 6 | **Emergency contact** | Record: named individual + phone number, reachable during the agency's active trip dates. Shown only to travellers holding a booking with the agency. |
| 7 | **Law 09-08 Art. 5 notices** | Give and record the Art. 5 information notices to (a) the legal representative and (b) the emergency-contact individual: their name (and, for the emergency contact, phone number) are processed on the platform, for what purpose, and shown to whom. Record the date each notice was given. |
| 8 | **Verification record** | One record per agency: each item above with sighted date, operator, document reference, and outcome. This record — not memory — is what "Checked before listing" stands on. Renewals: licence or insurance expiry pauses listings and new bookings automatically, with **no grace period**; renewed documents re-enter at item 1/2 and are re-recorded here. |

## Tracking discipline

- **One tracker, one row per agency**, updated the same day any stage
  changes. If it is not in the tracker, it did not happen.
- **Stages are facts, not hopes:** `IDENTIFIED → CONTACTED → DEMO DONE →
  DOCUMENTS REQUESTED → VERIFIED → SIGNED → LISTED`, plus `DECLINED` /
  `PAUSED` with a one-line reason. An agency is never counted in the cohort
  before `LISTED`, and never called "verified" before the full B18 pack is
  recorded.
- **No personal data in the repo.** The live tracker lives with the target
  list in the goal workspace (it holds business contact details). Only the
  template below lives here.
- **Weekly review** inside the recruitment block: rows stuck at one stage
  for two reviews get a decision — chase once, or mark `DECLINED`.

### Tracker template

| Agency (legal name) | City | Desk licence evidence | Stage | Stage date | B18 pack (x/8) | Next step | Next-step date | Reason if declined/paused |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  | Ministry-listed / confirm-first | IDENTIFIED |  | 0/8 |  |  |  |
