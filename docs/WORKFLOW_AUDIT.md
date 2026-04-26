# Ouiboo Workflow Audit

Date: April 24, 2026

This audit is workflow-first and launch-oriented. For each major area, it answers:

1. What is modeled in the data layer?
2. What is actually wired through API and UI?
3. What is truly functional end to end?

Ratings used in this document:

- `Functional`: usable through UI and API without manual DB intervention
- `Partial`: some combination of UI, API, and state transition exists, but the flow is inconsistent, incomplete, or not fully trustworthy
- `Present but misleading`: visible in the product or codebase, but the experience overstates what is actually operational

## Executive Summary

Ouiboo has a real marketplace core, not just a prototype shell. The reservation and payment domain is coherently modeled in Prisma, the API supports the main booking and payment transitions, and the traveler, agency, and admin apps all expose meaningful slices of those flows.

The strongest parts of the product today are:

- trip templates, sessions, and bookings
- manual payment proof upload and review
- gateway payment initiation and verification
- agency wallet and payout request flow
- admin approval, refund, payout, and audit tooling

The biggest launch risks are not missing schema or missing major services. They are workflow mismatches between UI claims and backend behavior:

- traveler discovery filters are only partially real
- agency public trip listings rely on unsupported filtering assumptions
- agency booking copy contradicts the API permissions it actually uses
- gateway payments have two real confirmation paths, and both must be treated as operational truth:
  - provider return plus `/payments/verify`
  - provider webhook plus automatic reconciliation

## Canonical Workflow Model

The canonical backend state model lives in `packages/database/prisma/schema.prisma`.

Core reservation and payment chain:

- `TripTemplate`
- `TripSession`
- `Booking`
- `PaymentProof`
- `PaymentTransaction`
- `Wallet`
- `PayoutRequest`

Canonical workflow enums:

- `TripStatus`: `ACTIVE`, `DRAFT`, `ARCHIVED`
- `SessionStatus`: `OPEN`, `FULL`, `CANCELLED`
- `BookingStatus`: `PENDING`, `AWAITING_VALIDATION`, `CONFIRMED`, `REJECTED`, `CANCELLED`, `COMPLETED`
- `BookingPaymentStatus`: `UNPAID`, `PAID`, `REFUNDED`, `FAILED`
- `RefundStatus`: `PENDING`, `PROCESSED`, `FAILED`
- `VerificationStatus`: `PENDING`, `VERIFIED`, `REJECTED`
- `PayoutStatus`: `PENDING`, `APPROVED`, `REJECTED`, `PAID`

What the backend actually implements:

- booking creation reserves seats
- manual payment proof upload moves booking to `AWAITING_VALIDATION`
- agency manual approval confirms the booking and credits the agency wallet
- admin payment-proof approval also confirms the booking and credits the wallet
- gateway success confirms the booking and credits the wallet
- gateway failure cancels the booking and releases seats
- refund marks the booking refunded and debits the agency wallet
- payout rejection restores the amount to the agency wallet

This is a strong foundation. The main gaps are in how consistently that behavior is surfaced and explained.

## Traveler Workflow Audit

### Discovery

| Flow | UI Route | API | Status | Notes |
| --- | --- | --- | --- | --- |
| Home and featured trips | `/`, `/trips/featured` | `GET /trips` | `Functional` | Featured trips page is real and falls back to popularity-based active trips. |
| Search and filtering | `/search` | `GET /trips` | `Partial` | UI sends `q`, `category`, and other filters, but the controller contract only exposes `featured`, `status`, price, duration, date, rating, availability, sort, page, and limit. |
| Public agency page | `/agency/[agencyId]` | `GET /agencies/:id/public`, `GET /trips?agencyId=...&status=ACTIVE` | `Partial` | Agency profile exists, but trip listing depends on `agencyId` filtering that the trips controller does not advertise. |
| Trip detail | `/trip/[id]` | `GET /trips/:id` | `Functional` | Detail page renders sessions, reviews, itinerary, and booking CTA. |

#### Discovery findings

What is modeled:

- trip templates, sessions, reviews, ratings, popularity, and public agency profile data

What is wired:

- broad browsing is real
- featured and active trip surfaces are real
- search UI builds a richer filter contract than the backend clearly supports

What is truly functional:

- browsing active trips
- opening trip details
- public agency identity

What is only partial:

- text search
- category filtering
- agency-scoped trip listing from the public agency page

Coverage evidence:

- traveler browser E2E covers trip detail into checkout
- no dedicated E2E proves search/filter correctness end to end

### Reservation

| Flow | UI Route | API | Status | Notes |
| --- | --- | --- | --- | --- |
| Session selection | `/trip/[id]` | `GET /trips/:id` | `Functional` | Sessions are visible and selectable from trip detail. |
| Checkout form | `/checkout/[tripId]` | `POST /bookings` | `Functional` | Guest data is collected and normalized into booking creation. |
| Seat reservation | checkout flow | `POST /bookings` | `Functional` | Booking service performs duplicate checks and seat reservation atomically. |

#### Reservation findings

What is modeled:

- sessions carry seat counts, dates, and status
- bookings link traveler, session, guest count, payment method, and amount

What is wired:

- traveler selects a session and guest count
- traveler enters name, phone, and document number
- server creates `PENDING` bookings and reserves seats

What is truly functional:

- trip detail to checkout
- booking creation
- seat reservation and duplicate protection

Coverage evidence:

- traveler E2E covers trip detail into booking submission
- booking lifecycle and response mapping are covered in API tests

### Payment

| Flow | UI Route | API | Status | Notes |
| --- | --- | --- | --- | --- |
| Manual payment proof upload | `/checkout/[tripId]`, `/bookings`, `/booking/[id]` | `POST /bookings/:id/payment-proof` | `Functional` | Upload transitions booking to `AWAITING_VALIDATION`. |
| Proof file download | agency and admin proof surfaces | `GET /bookings/:id/payment-proof/download` | `Functional` | Review surfaces can inspect uploaded proof. |
| Gateway initiation | `/checkout/[tripId]` | `POST /payments/initiate` | `Functional` | CMI and CashPlus initiation are wired. |
| Gateway return verification | `/checkout/confirmation` | `POST /payments/verify` | `Functional` | Browser return path can verify payment outcome. |
| Gateway webhooks | none directly | `POST /payments/webhook/:provider` | `Functional` | Success and failure reconciliation exist independently from browser return. |
| Retry failed gateway payment | `/bookings`, `/booking/[id]`, `/checkout/[tripId]?retryBooking=...` | booking detail and payment APIs | `Functional` | Retry path rehydrates booking context back into checkout. |

#### Payment findings

What is modeled:

- payment method
- payment status
- payment proof
- refund status
- payment transactions and provider transaction identifiers

What is wired:

- manual proof can be uploaded at checkout or after booking
- gateway initiation validates amount on the server
- confirmation page can verify gateway returns
- webhooks can reconcile success or failure without the browser
- expired proof windows and failed gateway paths release seats

What is truly functional:

- manual payment proof flow
- gateway initiation
- provider return verification
- webhook reconciliation
- retry of eligible failed payments

What is workflow-sensitive:

- gateway truth exists in two places by design
- this is not wrong, but it must be documented and tested as two separate operational paths

Coverage evidence:

- traveler E2E covers checkout into confirmation
- payment security and lifecycle tests cover amount validation and state transitions
- no full browser E2E currently proves proof upload plus review plus confirmation end to end

### Post-booking

| Flow | UI Route | API | Status | Notes |
| --- | --- | --- | --- | --- |
| Bookings list | `/bookings` | `GET /bookings/my-bookings` | `Functional` | Shows booking, payment, proof, and refund state. |
| Booking detail | `/booking/[id]` | `GET /bookings/:id` | `Functional` | Dedicated detail page supports proof upload, retry, cancel, and review. |
| Cancellation | `/bookings`, `/booking/[id]` | `PATCH /bookings/:id/cancel` | `Functional` | Cancel action exists for eligible bookings. |
| Review submission | booking list and detail actions | `POST /bookings/:bookingId/review` | `Functional` | Completed bookings can submit reviews. |
| Wishlist | `/wishlist` | `POST/DELETE/GET /users/wishlist...` | `Functional` | Wishlist is real and count-aware. |
| Profile | `/profile` | `GET /users/me`, `PATCH /users/me` | `Functional` | Profile is editable and logged-out state is handled. |

#### Post-booking findings

What is modeled:

- bookings retain payment, refund, proof, and review eligibility state
- traveler profile and wishlist are first-class entities

What is wired:

- bookings list and booking details are now the main source of truth for traveler booking/payment/refund state
- review submission is reachable from completed bookings
- profile update is API-backed

What is truly functional:

- viewing booking state
- uploading proof later
- retrying failed payments
- cancelling eligible bookings
- reviewing completed trips
- using wishlist
- updating profile

Coverage evidence:

- booking helper tests exist
- profile update is covered by API smoke
- no dedicated E2E for wishlist add/remove or review creation

## Agency Workflow Audit

### Agency journey summary

| Flow | UI Route | API | Status | Notes |
| --- | --- | --- | --- | --- |
| Onboarding and compliance | `/dashboard/onboarding` | `POST /users/agency-profile` | `Functional` | Company and banking/compliance inputs are real. |
| Trip template creation and editing | `/dashboard/trips`, `/dashboard/trips/create`, `/dashboard/trips/[id]`, `/dashboard/trips/[id]/edit` | `POST /trips`, `PATCH /trips/:id`, `DELETE /trips/:id`, `GET /trips/:id` | `Functional` | Trip CRUD is real and ownership is enforced. |
| Session creation and scheduling | trip edit/detail, `/dashboard/bookings/schedule` | `POST /trips/:id/sessions`, `GET /trips/:id/sessions` | `Functional` | Scheduling exists and now has a real trip filter and links back to trip management. |
| Booking visibility and proof review | `/dashboard/bookings` | `GET /agency/bookings`, `PATCH /bookings/:id/verify-payment` | `Partial` | Data and proof actions exist, but the copy contradicts the permissions model. |
| Review management | `/dashboard/reviews` | `GET /agency/reviews`, `GET /agency/reviews/stats`, `POST /reviews/:reviewId/response` | `Functional` | Review response flow exists. |
| Analytics | `/dashboard/analytics` | `GET /analytics/revenue-trends`, `GET /analytics/conversion-funnel`, `GET /analytics/top-trips`, `GET /analytics/payment-methods`, `GET /analytics/customer-demographics` | `Functional` | API-backed and operator-useful. |
| Wallet and payout requests | `/dashboard/wallet`, `/dashboard/settings/billing` | `GET /agency/payouts`, `POST /agency/payouts`, `GET /agency/stats` | `Functional` | Wallet and payout readiness are real. |

### Onboarding and compliance

What the UI claims:

- agency can submit legal, banking, and profile information
- verification status is visible

What the API allows:

- create and update agency profile data
- lock verified agencies from resubmitting certain fields

What is truly functional without manual DB help:

- onboarding submission
- readiness visibility

Coverage evidence:

- no dedicated onboarding browser E2E

### Trip template creation and editing

What the UI claims:

- agency can create, edit, and manage trip templates

What the API allows:

- trip CRUD
- owner-scoped access
- itinerary persistence

What is truly functional without manual DB help:

- create trip
- edit trip
- delete trip
- inspect trip details

Coverage evidence:

- API CRUD evidence is strong
- no browser E2E covers full authoring flow

### Session creation and calendar scheduling

What the UI claims:

- agency can create sessions and use the schedule view to manage them

What the API allows:

- session creation and listing per trip

What is truly functional without manual DB help:

- create sessions
- view sessions in a schedule-like operator surface
- filter by trip and jump back into trip management

What is still thinner than the UI may imply:

- this is useful scheduling support, not a full operations scheduler with rich bulk controls

### Booking visibility and proof review

What the UI claims:

- page copy says agency access is read-only and that admin must verify funds

What the API allows:

- `GET /agency/bookings`
- `PATCH /bookings/:id/verify-payment`

What the operator can actually do without manual DB help:

- view bookings
- inspect booking, payment, and proof state
- open proof review UI
- call proof verification actions

Rating explanation:

- the flow is technically implemented
- the workflow is still `Partial` because the product narrative contradicts the permissions actually in use

This is a launch-facing inconsistency and should be treated as a real workflow bug, not just copy debt.

### Reviews

What the UI claims:

- agency can read customer reviews and respond

What the API allows:

- list reviews
- fetch review stats
- submit review responses

What is truly functional:

- review visibility
- stats
- agency response flow

### Analytics

What the UI claims:

- agency can view revenue and customer analytics

What the API allows:

- revenue trends
- funnel
- top trips
- payment methods
- customer demographics

What is truly functional:

- analytics dashboard is API-backed and usable for operator insight

Launch note:

- analytics are useful and appear real, but they are lower-risk than reservations and payments

### Wallet and payout requests

What the UI claims:

- agency can view balances, understand payout readiness, and request payouts

What the API allows:

- list payouts
- request payout
- read agency stats

What is truly functional:

- wallet balances
- payout history
- payout request
- rejection/funds-restored explanation matches backend behavior

Coverage evidence:

- agency E2E covers payout readiness rendering
- backend and admin tooling cover resolution mechanics more strongly than browser flow

## Admin Workflow Audit

### Admin journey summary

| Flow | UI Surface | API | Status | Notes |
| --- | --- | --- | --- | --- |
| Agency approval and status management | pending queue and agency modal | `GET /admin/pending-agencies`, `POST /admin/agencies/:id/verify`, `PATCH /admin/agencies/:id/status` | `Functional` | Final-state disablement exists in UI. |
| Trip approval and moderation | pending queue | `GET /admin/pending-trips`, `POST /admin/trips/:id/verify` | `Functional` | Approval and archive/reject actions are real. |
| Payment-proof approval and rejection | payment proof table | `GET /admin/pending-payments`, `POST /admin/payments/:id/verify` | `Functional` | Status-aware actions and proof download are real. |
| Booking refund processing | bookings table | `POST /admin/bookings/:id/refund` | `Functional` | Refund is API-backed and guarded by payment state in UI. |
| Payout approval and rejection | payouts tab and detail panel | `GET /admin/payout-requests`, `POST /admin/payouts/:id/process` | `Functional` | Only pending payouts remain actionable; rejection restores funds. |
| Audit search, export, and pruning | audit tab | `GET /admin/audit-logs`, `GET /admin/audit-logs/export`, `POST /admin/audit-logs/retention` | `Functional` | Search, CSV export, and pruning are all exposed. |

### Agency approval and status management

What the UI claims:

- admin can approve, reject, activate, and deactivate agencies

What the API allows:

- verify agencies
- patch verification status
- log audit actions

What is truly functional:

- approval/rejection
- final-state button disablement
- agency status changes with audit trail

### Trip approval and moderation

What the UI claims:

- admin can review pending trips and decide their status

What the API allows:

- set trip status to `ACTIVE` or `ARCHIVED`
- audit moderation action

What is truly functional:

- approve trip
- reject/archive trip
- prevent re-running final-state approval buttons in the main review path

### Payment-proof approval and rejection

What the UI claims:

- admin can inspect proofs and decide whether to confirm or reject payment

What the API allows:

- verify payment proof
- require rejection reason when rejecting
- update booking and wallet state
- audit operator action

What is truly functional:

- download proof
- approve/reject proof
- propagate state into booking confirmation or rejection

### Booking refund processing

What the UI claims:

- admin can refund eligible paid gateway bookings

What the API allows:

- derive the provider and transaction context from booking history
- process refund
- debit wallet and audit the action

What is truly functional:

- refund paid gateway bookings that meet the UI eligibility rules

Launch note:

- refund execution is real
- the remaining open question is live-provider validation, not repo wiring

### Payout approval and rejection

What the UI claims:

- admin can inspect payout requests and resolve them

What the API allows:

- process pending payouts only
- reject payouts and restore funds
- audit payout processing

What is truly functional:

- review payout request
- mark as paid
- reject and restore wallet funds
- prevent reprocessing of already-resolved payouts in API and UI

### Audit search, export, and pruning

What the UI claims:

- admin can search operator activity, export records, and prune retained logs

What the API allows:

- list with date and text filters
- export CSV
- prune by retention window
- audit the export and prune actions themselves

What is truly functional:

- search
- export
- pruning

Coverage evidence:

- admin browser E2E covers audit visibility and pruning

## Reservation and Payment Subsystem Analysis

### Backend truth chain

Canonical domain flow:

- `TripTemplate -> TripSession -> Booking -> PaymentProof / PaymentTransaction -> Wallet -> PayoutRequest`

Implemented state transitions:

- `POST /bookings` creates a `PENDING` booking and reserves seats
- `POST /bookings/:id/payment-proof` uploads proof and moves the booking to `AWAITING_VALIDATION`
- `PATCH /bookings/:id/verify-payment` can confirm or reject manual payment from the agency path
- `POST /admin/payments/:id/verify` can confirm or reject manual payment from the admin path
- `POST /payments/initiate` creates gateway payment intent/transaction data
- `POST /payments/verify` handles provider return verification
- `POST /payments/webhook/:provider` handles asynchronous reconciliation
- gateway success confirms booking and credits wallet
- gateway failure cancels booking, marks payment failed, and releases seats
- `POST /admin/bookings/:id/refund` leads into payment refund handling and debits the agency wallet
- `POST /agency/payouts` moves wallet funds into payout request state
- `POST /admin/payouts/:id/process` resolves payout and rejection restores funds

### What is fully real

- booking creation with seat reservation
- booking duplicate prevention
- manual proof upload and proof re-upload
- proof verification by agency and by admin
- gateway payment initiation
- browser-based payment verification
- webhook-based payment reconciliation
- automatic seat release on failed or expired payment paths
- refund processing
- wallet credit/debit bookkeeping
- payout request creation and payout resolution
- audit logging for sensitive operator actions

### What is only partial or workflow-sensitive

- traveler search and filtering
- agency public trip listings
- agency booking verification messaging versus actual permissions
- real-world validation of gateway and webhook behavior with live providers

### Core mismatches to treat as launch issues

1. Discovery contract drift
- traveler search UI relies on `q` and `category`
- public agency page relies on `agencyId`
- trips API contract does not clearly support those filters

2. Agency proof-review contradiction
- agency dashboard says proof verification is admin-only
- agency dashboard also performs proof verification through `/bookings/:id/verify-payment`

3. Two payment truth paths
- browser return path and webhook path both confirm or fail bookings
- this is acceptable architecture, but it must be documented, tested, and monitored as two separate operational states

## Test and Evidence Matrix

### Browser E2E evidence

Traveler:

- signup and verify account
- trip detail to checkout to confirmation

Agency:

- wallet payout readiness state

Admin:

- audit visibility and pruning

These prove important happy paths, but they do not prove the full marketplace workflow.

### API and unit evidence

- booking response mapping
- payout response mapping
- booking service behavior
- payment security and amount validation
- tenant isolation
- MVP smoke coverage
- admin audit smoke

### Missing high-value proof

- search/filter correctness E2E
- agency public page trip-list correctness
- manual payment-proof upload and approval end to end in browser
- full payout request to admin resolution browser flow
- refund browser flow beyond admin action availability
- live provider environment validation for CMI, CashPlus, webhooks, and email delivery

## Functional Status Summary

### Strongly functional

- trip details and basic trip browsing
- booking creation and seat reservation
- manual payment proof flow
- gateway initiation and verification infrastructure
- traveler booking management
- agency trip/session management
- agency wallet and payout requests
- admin approvals, refunds, payouts, and audit controls

### Partial

- traveler search/filter accuracy
- agency public page trip listings
- agency proof-review workflow clarity
- end-to-end browser coverage for money flows

### Present but misleading

- any traveler or agency surface that implies search or agency filtering is fully supported by the trips API
- agency booking copy that says verification is admin-only while agency verification actions are live

## Prioritized Remediation Order

### P0: Launch-blocking workflow mismatches

1. Align discovery contracts
- either add `q`, `category`, and `agencyId` support to `/trips`
- or simplify the UI to expose only filters the backend truly supports

2. Resolve agency payment-proof ownership
- choose one true operator model:
  - agency verifies manual proof
  - admin verifies manual proof
- then align the copy, permissions, and audit expectations to that model

3. Validate gateway operations in real environments
- run CMI and CashPlus return flow against real credentials
- run webhook reconciliation against real callback infrastructure
- verify email delivery for confirmations and proof outcomes

### P1: Important but not immediate blockers

1. Expand browser E2E for:
- proof upload and review
- payout request and resolution
- refund state propagation
- search/filter correctness

2. Verify agency public profile browsing end to end
- especially active trip listings

3. Tighten operator guidance
- explain when bookings become available balance
- explain refund and payout side effects consistently across traveler, agency, and admin

### P2: Modeled but lower-risk for MVP

1. Messaging flows
- backend exists, but this audit was focused on reservations and payments

2. Notification preferences
- data model exists, but MVP currently treats essential notifications as operational defaults

3. Deeper analytics confidence
- analytics are present and useful, but not core launch blockers compared with reservation and payment accuracy

## Final Assessment

Ouiboo already contains a real reservation and payment engine. The most important launch question is no longer "does the app have booking and payment features?" The answer to that is yes.

The launch question is now: "Are the visible workflows and backend contracts aligned enough that users and operators can trust what the app says?"

Current answer:

- reservations, payment proof, refunds, payouts, and admin operations are mostly real
- discovery and a few operator narratives still need alignment
- real environment validation is the remaining non-repo proof required before launch

## Repo vs Non-Repo Launch Split

This section turns the audit into a practical handoff.

### Repo tasks still worth finishing before launch

These are still software tasks inside the codebase:

1. Align discovery contracts
- either implement `q`, `category`, and `agencyId` support in `/trips`
- or simplify the traveler discovery UI to match the backend contract exactly

2. Resolve payment-proof ownership
- choose whether agencies or admins verify manual payment proofs
- then align the agency bookings UI copy, allowed actions, and audit expectations to that choice

3. Expand launch-path browser coverage
- proof upload plus review
- payout request plus admin resolution
- refund state propagation
- search and agency public-page correctness

4. Keep the traveler booking surfaces as the booking truth layer
- `/checkout/confirmation`
- `/bookings`
- `/booking/[id]`

5. Keep payment providers behind an explicit rollout strategy
- avoid exposing UI options that are not approved and deployable yet

### Non-repo launch tasks

These are now mostly operational, commercial, or environment tasks outside the codebase:

1. Payment partner approvals
- CMI merchant approval
- CashPlus or Wafacash approval and onboarding

2. Real environment validation
- staging and production secrets
- live callback URLs
- webhook reachability
- email delivery validation
- bank account settlement validation

3. Operations and support preparation
- support script for manual proof review
- payout handling playbook
- refund escalation policy
- reconciliation checklist between booking state, proof state, wallet balance, and bank receipts

4. Legal and banking readiness
- business banking setup
- payout receiving account verification
- provider contract and settlement terms review

## Morocco Payment Rollout Recommendation

Based on your launch constraints, the safest rollout is:

### Launch payment method

Use bank transfer and manual payment proof as the primary launch payment method.

Why this fits the current product and market constraints:

- the repo already supports manual payment proof well
- booking state transitions for manual proof are real
- agency and admin review tooling already exists
- this avoids blocking launch on third-party approval lead times

Recommended launch behavior:

- keep traveler booking available
- show bank transfer instructions clearly at checkout
- require payment proof upload
- make approval ownership explicit in product copy
- keep refund and payout handling operationally documented

### Near-term payment providers

Keep CMI and CashPlus code paths in the repo as implementation-ready integrations, but do not treat them as launch-critical until approvals are granted and live credentials are tested.

Current repo truth:

- `CMI` provider exists in code, but still contains TODO-level integration assumptions and needs real-provider validation
- `CashPlus` provider exists in code and mirrors the intended gateway shape, but still needs real credentials and live callback testing
- `Stripe` exists in code, but it should be treated as non-priority for Morocco launch
- `Wafacash` is not currently implemented as a provider in the repo and should be treated as a future integration, not an approval-only toggle

### Recommended commercial and technical sequence

1. Launch with bank transfer and manual proof
2. Keep CMI and CashPlus hidden or disabled in production until approvals and live tests are complete
3. Complete real callback, webhook, refund, and reconciliation testing with CMI first if it becomes the primary card channel
4. Add Wafacash only after commercial approval and a dedicated provider implementation are both complete

## Updated Launch Readiness Conclusion

If you adopt the Morocco-first rollout above, the launch question becomes simpler:

- repo-critical launch path: manual reservation plus bank transfer proof flow
- non-repo critical launch path: banking instructions, ops process, reviewer workflow, and provider approvals

Under that model, the most important unfinished software risks are no longer "do payments work?" but:

- is discovery behavior honest and consistent?
- is manual proof ownership clear?
- are traveler, agency, and admin operators all seeing the same payment truth?

That is a much more manageable final launch scope.
