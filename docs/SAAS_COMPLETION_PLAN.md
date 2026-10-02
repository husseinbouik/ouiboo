# Ouiboo SaaS Completion Plan

This roadmap turns Ouiboo from a broad prototype into a launchable SaaS. The phases are ordered around Launch MVP priorities: stabilize the platform first, complete revenue flow next, then finish operations, reliability, and launch controls.

## Delivery Status

- Phase 1: Completed
- Phase 2: In progress with shared contract reconciliation and launch-path cleanup
- Phase 3: In progress with booking, retry, refund, and payout state flows
- Phase 4: In progress with live agency dashboard and wallet surfaces
- Phase 5: In progress with traveler booking details, profile, featured trips, and review submission
- Phase 6: In progress with audit visibility, refunds, payouts, and review operations in admin
- Phase 7: In progress with environment validation, health endpoints, CI hardening, browser E2E, and release smoke workflows
- Phase 8: Pending

## Phase 1: Baseline Stability

Goal: make the monorepo deterministic and stop tooling from hiding real defects.

### Delivered

- Root `lint`, `build`, and `test` run successfully.
- Shared browser auth client logic was consolidated into `@ouiboo/api-client`.
- Next.js apps were moved onto flat ESLint configs and off deprecated lint commands.
- Missing shared UI exports were restored.
- API build, dependency, and Prisma-related compile issues were fixed.
- Generated artifacts and committed runtime files were removed from the normal source workflow.

### Exit Criteria

- Root quality gates pass reliably.
- Shared packages build in workspace order.
- Runtime artifacts no longer pollute everyday development.

## Phase 2: Contract Reconciliation And Frontend Quality

Goal: remove contract drift and frontend quality debt that would make feature work brittle.

### Delivered So Far

- Shared booking and payment contracts were expanded in `@ouiboo/types`.
- `@ouiboo/schemas` now validates the richer booking/payment shape used by the apps and API.
- Traveler checkout now uses typed booking and gateway flows instead of loose request payloads.
- Booking confirmation now reads real booking state instead of relying only on query params.
- A new authenticated booking details endpoint was added so traveler, agency, and admin surfaces can fetch the same booking state.

### Remaining Scope

- Audit remaining app and API uses of legacy values such as `CLOSED`, `PendingPayment`, or title-cased status strings.
- Reduce traveler and agency lint-warning debt where it reflects real typing, hydration, or state-flow problems.
- Normalize DTOs and API docs around booking, payment, payout, and verification states.
- Tighten shared package usage so app code stops inventing parallel response contracts.

### Exit Criteria

- Shared packages match Prisma-backed domain behavior.
- Frontends no longer send stale enum values.
- Agency and traveler warning backlogs are reduced to intentional low-priority UI warnings only.

## Phase 3: Revenue-Critical Booking Flow

Goal: make booking and payment functional end to end.

### Scope

- Complete traveler checkout: availability, passenger info, booking creation, payment selection, redirect and return handling, confirmation, and failed-payment recovery.
- Make payment proof review, manual approval and rejection, and payment status transitions consistent across traveler, agency, and admin.
- Complete payout request and payout review lifecycle so agency earnings move through a reliable workflow.
- Ensure booking state transitions are valid from reservation through confirmation, cancellation, and refund handling.

### Exit Criteria

- A traveler can book and pay successfully.
- Agencies and admins see the correct resulting payment and booking states.
- Payout requests can be created, reviewed, and resolved.

## Phase 4: Agency Product Completion

Goal: make the agency portal usable for day-to-day operation.

### Scope

- Replace remaining mock or static dashboard data with live API-backed analytics, bookings, payouts, reviews, and trip-management data.
- Finish trip and session CRUD, scheduling, booking review, wallet visibility, and review handling.
- Tighten agency auth and tenant boundaries and remove admin-only assumptions leaking into agency UX.

### Exit Criteria

- An agency can onboard, create and manage trips, review bookings, and track revenue without mock data.

## Phase 5: Traveler Product Completion

Goal: make the customer-facing product feel complete enough to launch.

### Scope

- Finish search, filter, sort, share, and save behaviors and align them with backend query capabilities.
- Complete trip detail, agency profile, bookings, wishlist, reviews, profile management, and checkout-adjacent UX.
- Finish notification and messaging surfaces if they are in MVP, or hide incomplete entry points cleanly.

### Exit Criteria

- Travelers can discover, compare, book, manage, and review trips without hitting dead ends.

## Phase 6: Admin And Platform Controls

Goal: give operators enough control to run the marketplace safely.

### Scope

- Complete admin review flows for agencies, trips, payment proofs, payouts, and audit visibility.
- Normalize moderation and approval states across admin UI and backend services.
- Expand admin analytics only to the level needed for launch operations.

### Exit Criteria

- Admin users can approve, reject, inspect, and audit all core marketplace flows.

## Phase 7: Reliability, Security, And CI/CD

Goal: turn the working product into a deployable SaaS.

### Scope

- Add staged deploy workflow, migration gates, smoke tests, and environment validation.
- Harden uploads, auth edges, rate limiting, error handling, logging, and secret or config handling.
- Add frontend integration coverage for critical flows and keep API unit and E2E coverage green.
- Define production health checks, rollback expectations, and minimum observability.

### Exit Criteria

- Staging and production deployments are repeatable, monitored, and safe enough for Launch MVP.

### Delivered So Far

- Production env validation runs in CI and API bootstrap.
- Health endpoints exist for the API and all frontend apps.
- Browser E2E coverage now exists for traveler, agency, and admin launch paths.
- Staging and production release workflows now run build, migration, and smoke verification steps.

## Phase 8: Launch Readiness

Goal: ship a controlled public release.

### Scope

- Run end-to-end QA across traveler, agency, and admin roles.
- Remove or hide unfinished non-MVP features from navigation and docs.
- Finalize onboarding text, empty states, recovery flows, seed or demo data strategy, and support or admin runbooks.

### Exit Criteria

- The product can be demonstrated, tested by real users, and operated without engineering help for routine tasks.

## Recommended Sequence

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 7
8. Phase 8

## Immediate Next Tickets

1. Finish the remaining enum drift audit across apps and API DTOs.
2. Replace stale booking and payment status assumptions in traveler and agency screens.
3. Normalize shared response shapes used by bookings, payouts, and dashboard analytics.
4. Update docs and API descriptions that still reference outdated states.
5. Start Phase 3 by wiring the full traveler booking and payment return flow end to end.
