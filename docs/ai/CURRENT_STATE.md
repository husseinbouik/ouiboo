# Ouiboo AI Current State

> Living handoff for AI-assisted development. Last verified: 2026-09-17.
>
> Update this file when a phase materially changes. Replace stale statements instead
> of appending a session diary. Permanent rules belong in `/AGENTS.md`; detailed
> findings and scorecards belong in `/PRE_LAUNCH_AUDIT.md`.

## Product objective

Prepare Ouiboo, a traveler/agency/admin travel marketplace, for a safe Morocco
launch while preserving a path to African and global expansion.

Priority order:

1. Launch correctness and stability
2. Security and data integrity
3. Traveler UX, accessibility, and trust
4. Branding and consistency
5. Maintainability and reuse
6. Performance
7. International scalability

## Current milestone

**Pre-launch hardening and evidence gathering.**

The large uncommitted worktree is substantially aligned with the product goal,
but it is not yet approved for production. Automated application checks are
mostly green. Production configuration, production-snapshot migration
rehearsal, provider integration, and operational readiness remain the main
gates.

## Completed and verified work

### Authentication and authorization

- Access tokens remain in memory; no access or refresh token is stored in
  `localStorage`, session storage, or a JavaScript-readable cookie.
- Refresh tokens remain server-managed through an HttpOnly cookie.
- Unsigned JWT-decoding proxy checks were removed from the web apps.
- JWT and WebSocket user lookups are database-authoritative; the unsafe
  in-process authorization cache was removed.
- Dormant WebSocket code was hardened so room joins and broadcasts are scoped to
  authorized users, agencies, and administrators. `WebSocketModule` is not
  currently registered in `AppModule`, so this is not an active launch feature.
- Missing JWT secrets fail closed instead of using fallback secrets.

### Security and tenant isolation

- Tenant/ownership checks were re-audited across API controllers and services;
  no confirmed cross-tenant IDOR was found (agency-scoped routes bind to
  `req.tenantId`, hand-over-scope mutation routes re-check ownership in the
  service).
- Private payment-proof files no longer get a public S3 URL. The S3 provider
  returns `url: ''` for `private/*` upload keys and rejects `getFilePath` for
  private keys; both S3 and local providers implement `read()`, and
  `GET /bookings/:id/payment-proof/download` streams private objects through the
  authorized API endpoint instead of redirecting to the object store.
- Explicit role gates were added where they were previously implied:
  `respondToReview` and `POST /users/agency-profile` require the `AGENCY` role
  via `RolesGuard`.
- Verified with new S3/local provider specs and booking streaming tests (target
  suites: 16 tests green), `nest build` clean, eslint clean on touched files,
  and `booking-lifecycle` + `user-features` API E2E green (41 tests). Remaining
  ops gate: the production S3 bucket must stay private-read; private objects are
  served only through the authenticated endpoint.

### Database and backend

- Password reset token hashes have a unique constraint; salted OTP hashes do not.
- OTP handling uses hashing and timing-safe comparison.
- Financial records gained explicit currency context where required.
- Notification and payment statuses use Prisma enums.
- Booking and review query indexes were added.
- Analytics still uses the existing in-memory grouping. The proposed SQL rewrite
  is withheld until the business reporting time zone and boundary tests are defined.
- (2026-09-17) `GET /agency/bookings` returns `{ data, pagination }` (parallel
  `findMany` + `count`, clamped limits) and the agency bookings screen renders
  the shared pagination control; the agency dashboard consumes the same shape.
  The dead `findAllByAgency()` branch was removed from `bookings.service.ts`
  and the tenant-isolation E2E was updated for the new shape.
- Helmet security headers and safer production behavior were added.
- A checked-in migration exists at:
  `packages/database/prisma/migrations/20260915133000_add_currency_status_enums_and_indexes/migration.sql`.
- The migration was rehearsed against a fresh legacy-shaped database with
  `scripts/rehearse-migration.mjs` (guarded `_test`/localhost-only by default).
  All four scenarios pass: clean legacy data migrates with correct currency
  backfill, enum casts, and indexes; invalid `NotificationLog.status`,
  invalid `PaymentTransaction.status`, and duplicate
  `passwordResetTokenHash` values all fail the fail-closed preflights before
  any DDL. Evidence is in `docs/ai/migration-rehearsal-report.md`. Running it
  against a real sanitized production-like snapshot remains a launch gate.

### Frontend, UX, and architecture

- Shared `auth`, `i18n`, `tokens`, UI, schemas, and utilities packages reduce
  cross-app duplication.
- Traveler, agency, admin, and landing apps consume shared design tokens.
- Tailwind v4 explicitly scans `packages/ui`, fixing missing shared-dialog layout
  utilities in production builds.
- Shared language/theme controls, booking status helpers, and auth schemas were
  introduced.
- Accessibility improvements include skip links, navigation labels, meaningful
  image alternatives, dialog behavior, and mobile-menu focus handling.
- (2026-09-17) Agency auth flow is now token-based and translated end-to-end:
  `login`, `signup`, `forgot-password`, `reset-password`, `verify`, `terms`,
  and `privacy` pages use semantic tokens and `t()` calls (new `verify.*`
  namespace), and the agency EN/FR/AR locale keys match exactly across
  languages.
- (2026-09-17) The agency analytics page no longer forces a dark theme; the
  page and its chart components use semantic tokens, and date-range labels are
  locale-aware.
- (2026-09-17) The admin dashboard is usable on mobile: the fixed sidebar is
  desktop-only, a horizontal tab bar appears on phones, main padding scales,
  and the wide tables scroll horizontally. Three shared UI inputs
  (`Select`, `Textarea`, `Badge`) were converted from hardcoded slate colors
  to tokens.
- (2026-09-22) Proposed Next.js middleware that checked only for the presence of a refresh-cookie name was rejected from the commit. Cookie-name presence is not authenticated server-side session validation and would not resolve S-08. API authorization remains authoritative while a server-managed session/BFF route-guard design is still required.
- (2026-09-17) Traveler login and signup pages migrated to type-safe Zod schema validation (`zodResolver` with `LoginSchema` and `TravelerSignupSchema`), converted physical spacing utilities (`ml-`, `mr-`, `pl-`, `pr-`) to logical RTL equivalents (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`), and replaced external image requests to `www.svgrepo.com` with inline SVG vectors.
- (2026-09-17) The agency workspace is translated and token-complete end to end.
  Dashboard, bookings, schedule, wallet, reviews, trips (list, create, detail,
  edit, legacy redirect), analytics and its chart components, settings, billing,
  notifications, onboarding, error/loading/not-found states, and auth pages all
  use `t()` with no hardcoded UI strings, placeholders, or aria-labels. Dead
  utility classes (`deep-blue`, `sunset-orange`, `blue-*`, `gray-*`, `red-*`,
  `emerald`, `amber`) were replaced with semantic tokens, and RTL-safe spacing,
  alignment, and directional-icon classes were applied. The agency EN/FR/AR
  locale files hold 755 keys each with exact cross-language parity. Locale-aware
  currency and date formatting uses `formatCurrency`/`formatLocalDate` from
  `@ouiboo/utils`. Agency status labels are translated at each call site so the
  shared `@ouiboo/utils` mappers and their tests keep their English contract.
- Landing UI duplication was reduced and shared components are used where the
  behavior is genuinely common.
- Traveler build-time featured-trip failures now log concise fallback messages.

### Browser and API behavior

- Playwright mocks and journeys were aligned with current auth responses and the
  memory-only token design.
- Confirmation dialogs are exercised explicitly in browser tests.
- Test trip dates and URL matching are deterministic.

### CI/CD and deployment

- The CI launch-contract gate was repaired: `.github/workflows/ci.yml` was
  missing `NEXT_PUBLIC_MEDIA_URL` and `S3_PUBLIC_URL`, so `npm run check:env:prod`
  failed before lint/build/test/E2E and the CI job could never pass. Both are now
  supplied as matching HTTPS CI placeholders. Verified by replaying the exact CI
  environment through `scripts/validate-env.mjs --production` (pre-fix exit 1,
  post-fix exit 0).
- The API container does not run migrations at startup (`apps/api/Dockerfile`
  CMD is `node dist/apps/api/src/main`; bootstrap only validates required env
  vars and fails closed). Migrations run once in the release workflows'
  `verify-and-migrate` job, matching the single-migration-owner rule.
- The release workflows already set both media vars from the same platform
  variable, so the production/staging contract is unaffected by the CI fix.

## Verification evidence

The following results were captured successfully after the current remediation:

| Gate | Result |
|---|---|
| `npm run lint` | Passed (5 tasks) |
| `npm test` | Passed: 22 suites, 84 tests |
| `npm run test:e2e:api` | Passed: 8 suites, 103 tests |
| `npm run test:e2e` | Passed: 7 browser journeys |
| Prisma schema validation | Passed |
| `npm run check:tracked-env` | Passed; no environment files tracked |
| `npm run check:placeholders` | Passed |
| `npm run check:env:prod` | Expected failure against the incomplete local `.env`; production configuration is incomplete |
| CI contract replay (`validate-env.mjs --production` with `.github/workflows/ci.yml` env) | Passed: exit 0 (pre-fix exit 1 on missing `S3_PUBLIC_URL`/`NEXT_PUBLIC_MEDIA_URL`) |
| `npm run build` | Passed: 7 build tasks; exit code 0 |
| Auth compatibility E2E | Passed: 1 suite, 5 tests, including legacy OTP transition |

Do not convert an interrupted command into a passing result. Rerun the affected
gate after subsequent code changes or before a release decision.

## Critical launch blockers

1. **Production environment ownership and validation**
   - Supply strong JWT secrets, production URLs/CORS, S3-compatible storage,
     Redis, trusted proxy settings, email delivery, and OAuth/provider settings.
   - Run `npm run check:env:prod` only with safe production-like values; never
     commit or print the secrets.

2. **Migration rehearsal**
   - The checked-in target migration now passes rehearsal against a fresh
     legacy-shaped schema (`scripts/rehearse-migration.mjs`, all four
     scenarios green; see `docs/ai/migration-rehearsal-report.md`).
   - Still required before launch: rehearse on a recent, sanitized
     production-like snapshot and record preflight results, duration/locking
     impact, backup, owner, rollback, and post-migration verification.
   - Existing API test preparation uses `prisma db push`; that still does not
     prove the checked-in migration SQL works against real legacy data.

3. **Historical secret incident response**
   - Confirm whether credentials in Git history were real.
   - Repository owners must rotate affected credentials and approve any history
     rewrite. Agents must not perform either action implicitly.

4. **Staging provider evidence**
   - Verify payment callbacks/webhooks, SMTP delivery, object storage and signed
     access, OAuth, Redis behavior, and email rendering with real staging services.
   - Private uploads are now code-enforced (no public URL, authorized streaming
     download endpoint), but the staging S3 bucket ACLs and credentials must be
     verified to keep `private/*` objects world-unreadable.

5. **Operational readiness**
   - Demonstrate backup restore, monitoring and alerting, health checks, staging
     smoke tests, single-owner migration execution, and rollback rehearsal.

6. **Legal and trust readiness**
   - Obtain human approval for privacy, terms, consent, retention, refund, and
     customer-support flows before public launch.

## High-priority engineering follow-ups

- Decide whether real-time WebSocket notifications are required for launch. If
  they are, register and integration-test `WebSocketModule` with production CORS;
  otherwise keep the unused module dormant or remove it in a later cleanup.
- OTP verification includes a timing-safe compatibility path for still-valid
  plaintext OTPs issued before hashing; resends replace them with hashes and
  successful verification clears them. Remove the fallback after the maximum
  pre-deployment OTP lifetime has elapsed.
- Admin list endpoints, admin audit logs, traveler booking history, and the agency
  payout history now return `{ data, pagination }` with clamped limits and render
  shared `@ouiboo/ui` pagination controls. Complete pagination UX for the
  remaining already-bounded notification-history view (backend metadata exists;
  no screen exists yet).
- Define the business reporting time zone and add day/week/month boundary tests
  before changing analytics date semantics.
- Decide whether Playwright should launch Next standalone artifacts directly;
  current tests pass but warn that `next start` is incompatible with
  `output: standalone`.
- Remove test dependence on external avatar/image hosts to avoid certificate and
  availability noise.
- Decide whether public traveler build-time API fetching should remain fallback
  based or move to an explicit dynamic/revalidation strategy.
- Tenant-isolation review is done and its confirmed gaps are fixed (private-file
  URL leak + implicit role gates). Future IDOR work should focus on any new
  mutation routes and negative E2E coverage for agency/admin ownership across
  uploads, payouts, and payment transactions.

## Safe next phase

1. Bring the **traveler app** to the admin/agency baseline: add the missing
   locale sections (search, trip detail, checkout, bookings, booking detail,
   profile, wishlist, reviews, agency profile, verify, auth modal) to EN/FR/AR
   with exact parity, replace remaining hardcoded English strings with `t()`,
   finish the RTL logical-property sweep (U-12), and use
   `formatCurrency`/`formatLocalDate` for locale-aware output.
2. Keep WebSocket code dormant unless real-time notifications are explicitly
   accepted as a launch requirement and integration-tested.
3. Keep `PRE_LAUNCH_AUDIT.md` verification totals and remaining blockers
   match this file and the current worktree.
4. Inspect the final uncommitted diff for behavioral regressions and formatting
   noise; do not commit it automatically.
5. Migration rehearsal runbook exists (`scripts/rehearse-migration.mjs`).
   Execute it only against an explicitly approved, non-production snapshot and
   record the evidence in `docs/ai/migration-rehearsal-report.md`.

## Working-tree warning

The repository contains a large, mixed, uncommitted change set across all apps,
shared packages, tests, documentation, and Prisma. Preserve it. Do not reset,
discard, mass-format, commit, push, deploy, rewrite history, rotate credentials,
or mutate production data without explicit authorization.

## Handoff rules

Before acting, every agent must:

1. Read `/AGENTS.md` completely.
2. Read this file and verify relevant statements against code and command output.
3. Inspect `git status` and the relevant diff.
4. Work on one bounded blocker or phase at a time.
5. Use targeted checks while iterating and broad gates once per completed phase.
6. Update this document only when the verified state materially changes.

## Definition of production-ready

Ouiboo is production-ready only when automated checks pass **and** staging proves
production configuration, the exact migration path, tenant isolation, provider
callbacks, email delivery, storage, backup restore, monitoring, smoke tests, and
rollback. Until then, report the application as pre-launch rather than ready.
