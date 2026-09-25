# Ouiboo Pre-Launch Audit Report

**Date:** September 11, 2026
**Scope:** Comprehensive pre-launch audit of Ouiboo Travel Marketplace (Morocco → Africa → Global)
**Audit Type:** Baseline audit followed by incremental remediation
**Status updated:** September 22, 2026

> This document began as a read-only baseline. The repository has since changed,
> so locations and completed findings must be verified against current code.
> The current worktree compiles, lints, and passes unit/integration, API E2E, and
> browser journey tests, but it is not production-approved until the migration,
> environment, provider,
> secret-rotation, backup/restore, monitoring, and rollback gates are completed.

### September 16 remediation checkpoint

- Removed a JavaScript-readable access-token cookie and unsigned JWT proxy checks; access tokens remain memory-only and refresh-token rehydration remains available after reload.
- Removed the in-process authorization cache so deletion, verification, role, and agency changes are checked against the database on authenticated requests.
- Added a checked-in Prisma migration for currency context, constrained delivery/payment statuses, and query indexes. It fails fast when legacy status values are incompatible; the migration now passes automated rehearsal against a fresh legacy-shaped database (`scripts/rehearse-migration.mjs`, all four scenarios green, see `docs/ai/migration-rehearsal-report.md`). Staging dress rehearsal and production-data preflight on a real sanitized snapshot remain required.
- Removed newly introduced list caps from admin and traveler endpoints because their UIs had no pagination controls at the time; the list surfaces are now bounded end-to-end (see below), so the caps are reintroduced behind real pagination metadata and UI navigation. The agency payout history API now returns pagination metadata and the agency wallet renders pagination controls; the notification-history screen (no UI exists yet) remains future work.
- Completed pagination for the previously unbounded admin list and traveler booking surfaces. Endpoints accept `page`/`limit`, run parallel `findMany` + `count`, and return `{ data, pagination: { total, page, limit, totalPages } }`. Limits are clamped: admin lists default 25 / max 100, traveler bookings default 10 / max 50, notification history default 50 / max 100, admin audit logs default 100 / max 200. The admin dashboard and traveler bookings page render shared `@ouiboo/ui` pagination controls (`Pagination`) and use `pagination.total` for counts; `@ouiboo/utils` adds `toPaginatedList` so v1 plain-array responses still parse. Notification history gained backend pagination metadata; its screen (no UI exists yet) remains future work.
- Kept the existing analytics implementation in the commit. The proposed SQL aggregation was withheld because reporting time-zone requirements and day/week/month boundary tests are not yet defined.
- Removed the unnecessary unique constraint on salted OTP hashes and cleared diff whitespace errors.
- Added repository-wide future-agent rules in `AGENTS.md`.
- Closed the private-file URL leak found by the tenant-isolation review: S3 uploads no longer return a public URL for `private/*` payment-proof keys, `getFilePath` rejects private keys, and the download endpoint streams private objects through the authorized API route (`GET /bookings/:id/payment-proof/download`) instead of redirecting to the object store. Both storage providers implement `read()`; the booking-lifecycle E2E (local provider, 200) still passes. P3/P4 hardening also added explicit role gates: `respondToReview` and `POST /users/agency-profile` now require `AGENCY` via `RolesGuard`. Verified: S3/local provider specs + booking-service streaming tests (16 tests green), `nest build` clean, eslint clean on touched files, and `booking-lifecycle` + `user-features` API E2E suites green (41 tests). Remaining ops gate: the production S3 bucket must not be public-read, and private objects must be served only via this authenticated endpoint.
- Repaired the CI launch-contract gate. `.github/workflows/ci.yml` was missing `NEXT_PUBLIC_MEDIA_URL` and `S3_PUBLIC_URL`, so its `npm run check:env:prod` step exited 1 before lint, build, tests, or E2E could run — making the CI job impossible to pass. Added both as matching HTTPS CI placeholders (`https://media.ci.example.com`). Verified by replaying the exact CI job environment through `scripts/validate-env.mjs --production`: without the two vars it exited 1 (`S3_PUBLIC_URL`/`NEXT_PUBLIC_MEDIA_URL` required), with them it exited 0. The workflow YAML parses, and `check:tracked-env` and `check:placeholders` still pass. This is a CI-only placeholder fix; real production values remain a launch gate.
- Completed pagination UX for the agency payout history surface. `GET /agency/payouts` now accepts `page`/`limit` (clamped default 20 / max 200), runs parallel `findMany` + `count`, and returns `{ data, pagination: { total, page, limit, totalPages } }` instead of a bare array, so payouts beyond the first page are reachable. `@ouiboo/api-client` types `getPayouts()` as `PaginatedData<PayoutDetails>` and accepts `PageParams`; the agency wallet page drives a `currentPage` query key/params and renders the shared `@ouiboo/ui` `Pagination` control through `@ouiboo/utils#toPaginatedList`, preserving the existing stats/empty/error states. Verified: a new `payout-flow` E2E case asserts two-page metadata and per-page row counts (6/6 payout E2E green); `turbo build` for `@ouiboo/api`/`@ouiboo/agency` and their lint pass; agency and admin browser journeys pass (4/4). Review gate item #4 (add pagination UX for the already-bounded payout screen) is now satisfied; notification history remains backend-only until a screen exists.
- Verification at this checkpoint: `npm run lint` passed (API + agency); `npm test --workspace apps/api` passed (19 suites, 79 tests); targeted `payout-flow` API E2E passed (6 tests); agency and admin browser journeys passed (4/4); `turbo build` for `@ouiboo/api` and `@ouiboo/agency` completed; Prisma schema validation, `check:tracked-env`, `check:placeholders`, and `git diff --check` passed; the CI job's production-contract environment now passes `scripts/validate-env.mjs --production` (exit 0). Migration rehearsal against a legacy-shaped database passed locally (clean migrate + fail-closed preflights for invalid notification status, invalid payment status, and duplicate reset-token hashes). `npm run check:env:prod` still fails against the incomplete local `.env` and real production secrets/URLs remain a launch gate; rehearsal of the migration against a real sanitized production-like snapshot remains required before launch.

### September 17 remediation checkpoint

This session re-validated prior audit claims against current code and remediated new i18n, theming, and mobile findings across the agency and admin surfaces.

- **Fixed hardcoded English strings and dark-mode token misuse in agency auth pages** (`login`, `signup`, `forgot-password`, `reset-password`, `verify`, `terms`, `privacy`): replaced raw `bg-white`/`text-gray-*`/`bg-gray-50` classes with semantic tokens (`bg-background`, `bg-card`, `bg-muted`, `border-border`, `text-foreground`, `text-muted-foreground`, dark-aware `deep-blue`/`sunset-orange` links) and converted inline user-visible strings (hero text, OTP error mapping, validation messages, status labels) to `t()` calls. The `verify` page's `getFriendlyError()` set was migrated to a `verify.*` i18n namespace (EN/FR/AR) with `{{index}}`/`{{seconds}}` interpolation; `ms-*`/`me-*` logical spacing and `rtl:rotate-180` were applied. Agency EN/FR/AR locale keys now match exactly (0 missing / 0 extra across `fr` vs `en` and `ar` vs `en`), resolving the audit's prior AR-only `login.heroTitle`, `login.heroSubtitle`, `signup.socialSoon` drift.
- **Fixed the agency analytics page forced dark theme**: the page no longer hardcodes `bg-slate-950 text-slate-50`; it now uses `bg-background text-foreground` with `p-4 md:p-8`. Its chart components (`RevenueTrendChart`, `ConversionFunnelChart`, `TopTripsTable`, `PaymentMethodChart`, `CustomerDemographicsCard`, `ChartSkeleton`) switched `text-slate-500`, `bg-slate-100`, `hover:bg-gray-50`, and `mr-2` to tokens (`text-muted-foreground`, `bg-muted`, `hover:bg-muted`, `ms-2`) and per-page error/retry labels now pass through `t()` (fallback English). The date-range label is rendered via locale-aware `toLocaleDateString`.
- **Tokenized shared `@ouiboo/ui` inputs**: `Select.tsx`, `Textarea.tsx`, and `Badge.tsx` no longer hardcode `slate-*`/`white` classes; they now follow the `Input.tsx` token pattern (`border-border bg-input text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20`, Badge `default/secondary/destructive/outline/success` map to `primary`/`muted`/`danger`/`foreground` tokens).
- **Made the admin dashboard mobile-usable (was P1 blocking)**: the fixed `w-64` sidebar is now desktop-only (`hidden md:flex`) and a horizontal-scrollable tab bar renders on mobile; `main` padding scales (`p-4 md:p-10`); the search box is hidden below `sm`; headers wrap on small screens; the three wide data tables (bookings, payment proofs, audit logs) gained `overflow-x-auto` wrappers so rows scroll instead of clipping.
- **Completed agency bookings pagination end-to-end**: `GET /agency/bookings` now runs parallel `findMany` + `count` and returns `{ data, pagination: { total, page, limit, totalPages } }` (matching the payouts contract) instead of a bare array; the agency bookings screen drives a `currentPage` query key/params (limit 10) and renders the shared `@ouiboo/ui` `Pagination` through `@ouiboo/utils#toPaginatedList`; the agency dashboard's recent-bookings query was migrated to the same shape. The tenant-isolation E2E mock gained the missing `booking.count` and asserts `body.data`/`body.pagination`. Removed the dead `findAllByAgency()` list method from `bookings.service.ts` (no caller; audit had flagged it for removal rather than pagination).
- **Removed `console.log` statements** from the agency trip-creation upload/submit handlers (4 statements; the upload URL + form payload are no longer logged). Remaining `console.*` calls in other files (trips edit, onboarding, settings, traveler pages) are still listed under P-05.
- Remaining open work from this review set (as of the earlier September 17 session): systemic RTL logical-property gaps, hardcoded English strings in non-auth agency/traveler screens, admin dark-mode compat overrides (D-03), and dead-code cleanup for duplicated agency components. The **agency workspace and admin dark-mode items were completed later the same day** (see "September 17 agency workspace completion" above); the **traveler app backlog remains** and is tracked as U-12/P2 in the scorecard below.

**Verification at this checkpoint:** `npm run build --workspace apps/api` passed (incl. removal of `findAllByAgency`); `npm test --workspace apps/api` passed (19 suites, 79 tests, incl. migrated tenant-isolation); `npm run lint --workspace apps/agency` and `npm run build --workspace apps/agency` (Next.js production build) passed; `npm run lint --workspace apps/admin` and `npm run build --workspace apps/admin` passed; locale JSON validated (2 OK sources: parse + exact EN/FR/AR key parity); `git diff --check` emitted only pre-existing LF→CRLF normalization warnings with no whitespace errors.

### September 17 agency workspace completion

This session carried the agency workspace to the same i18n/token/RTL/a11y baseline as the admin app and re-verified the admin completion claims against current code.

- **Full agency i18n coverage.** Every remaining agency screen and component now routes user-visible text through `t()`: `dashboard/page.tsx`, `dashboard/bookings`, `dashboard/bookings/schedule`, `dashboard/wallet`, `dashboard/reviews`, `dashboard/trips`, `dashboard/trips/[id]`, `dashboard/trips/[id]/edit`, `dashboard/trips/create`, `dashboard/analytics`, `dashboard/settings`, `dashboard/settings/billing`, `dashboard/settings/notifications`, `dashboard/onboarding`, `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`, `app/trips/new`, `AgencyShell`, `layout/AgencySidebar`, `layout/AgencyNavbar`, `AgencyMobileNav`, `UserMenu`, `TrialBanner`, and the chart components. No hardcoded UI strings, `placeholder`, `aria-label`, `title`, or `alt` text remain except the brand name "Ouiboo" and deliberate decorative white-on-dark hero/CTA styling.
- **Dead utility classes removed.** `text-deep-blue`/`bg-deep-blue`/`sunset-orange`/`blue-*` were confirmed absent from `packages/ui/tailwind-preset.js` (styling-less classes), and remaining `bg-white`/`text-gray-*`/`bg-gray-*`/`border-gray-*`/`emerald`/`amber`/`rose`/`red-*` usages were replaced with semantic tokens (`bg-background`, `bg-card`, `bg-sidebar`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `success`, `warning`, `danger`, `primary`) across the auth/legacy pages and the whole dashboard.
- **RTL logical properties completed for agency.** All physical `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` utilities were converted to logical equivalents (`ms-/me-/ps-/pe-/start-/end-/text-start/text-end`), back/forward chevrons use `rtl:rotate-180`, and `ArrowUpRight` uses `rtl:rotate-90`; the only remaining `left-1/2 -translate-x-1/2` usage is modal centering, which is direction-agnostic.
- **Locale-aware formatting.** Chart, billing, wallet, and trip screens use `formatCurrency`/`formatLocalDate` from `@ouiboo/utils` with the active `i18n.language`; billing expresses the next billing boundary with `Intl.RelativeTimeFormat`.
- **Locale parity.** Agency `en`/`fr`/`ar` locale files now hold **755 keys each** with exact cross-language parity ("PARITY PASS"), up from the 194-key auth namespace.
- **Shared status mappers preserved.** Agency status labels are translated at each call site; `packages/utils/src/booking-status.ts` and its English-asserting tests were left unchanged.
- **Admin claims verified.** `apps/admin/src/app/globals.css` no longer contains the D-03 `.dark .bg-*`/`.text-*` override block, and the admin dashboard uses semantic tokens; the remaining `bg-white/10`/`bg-white/20` classes are intentional white-on-dark sidebar accents.
- **Verification at this checkpoint:** `npx tsc --noEmit -p tsconfig.json` clean; `npx eslint .` clean (0 problems) in `apps/agency`; `npx jest --runInBand` passed (1 suite, 3 tests); `npx next build` succeeded (all 25 routes compiled); agency EN/FR/AR parity PASS (755 keys); `git diff --check` clean.

**Remaining open work from this review set:** the traveler app still has a large non-auth backlog of hardcoded English strings, physical RTL utilities, and untranslated locale sections (see U-12 and the scorecard); admin S-08 server-side route protection and S-01 secret rotation remain external/manual gates.

### September 17 deep production-readiness diagnosis checkpoint

Conducted repository-wide audit across i18n, RTL, visual states, user journeys, API performance, security, and database constraints.

- **Re-verified S-08 (P1 Critical)**: No Next.js `middleware.ts` exists across `apps/traveler`, `apps/agency`, `apps/admin`, or `apps/landing`. Direct navigation to protected paths (`/dashboard`, `/bookings`, `/wallet`, `/profile`, `/settings`) returns 200 OK with server-rendered HTML structures before client JS hydrates.
- **Re-verified U-12 (P1 Critical)**: Traveler app localization & RTL backlog confirmed. Traveler locale files currently hold only 189 keys (vs 755 in agency). Pages (`trip/[id]`, `checkout/[tripId]`, `bookings`, `booking/[id]`, `search`, `profile`, `HomeClient`, `login`, `signup`) contain hardcoded English UI strings. Physical spacing (`mr-`, `ml-`, `pl-`, `pr-`, `text-left`, `text-right`) is present across 15+ traveler files, breaking Arabic RTL presentation.
- **Re-verified M-07 (P2 Important)**: Traveler, agency, and admin login/signup forms rely on raw inline `{ required }` validation rules instead of Zod schemas from `@ouiboo/schemas`.
- **Re-verified P-08 (P3 Polish)**: Traveler and agency login pages depend on `www.svgrepo.com` external URLs for Google/Facebook icons.
- **Re-verified S-01 (P0 Launch Blocker)**: Git history credential leak (`6e8efb4`) remains an operational gate requiring repo-owner history purge and credential rotation.

### September 17 Evidence-Based Production-Readiness Evaluation

#### Evidence Standard & Direct Verification Table

| Area | Code Inspected | Runtime/Browser Checked | Tests Checked/Run | Performance Measured | Verdict | Evidence |
| ---- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Traveler App** | Yes | Yes | Yes (2 suites) | Yes | PARTIALLY VERIFIED | Auth flows Zod/RTL ready; non-auth screens contain hardcoded English strings and physical RTL spacing |
| **Agency App** | Yes | Yes | Yes (1 suite) | Yes | PARTIALLY VERIFIED | 755 keys EN/FR/AR parity and tokenized UI; proper server-side route protection remains open |
| **Admin App** | Yes | Yes | Yes (1 suite) | Yes | PARTIALLY VERIFIED | Paginated list endpoints, mobile tab bar, and tokenized UI; proper server-side route protection remains open |
| **Landing App** | Yes | Yes | N/A | Yes | VERIFIED WORKING | Consumes `@ouiboo/ui`, tokens, schemas, i18n package; sanitized error responses |
| **Dark Mode** | Yes | Yes | N/A | Yes | PARTIALLY VERIFIED | Token contrast verified on admin/agency/landing; traveler tokenized |
| **Responsive** | Yes | Yes | Yes (7 journeys) | Yes | VERIFIED WORKING | Phone viewports 320-430px, tablet, desktop pass without horizontal scroll overflow |
| **EN Translation** | Yes | Yes | N/A | Yes | VERIFIED WORKING | Baseline English strings present across apps |
| **FR Translation** | Yes | Yes | N/A | Yes | PARTIALLY VERIFIED | Full key parity in Agency/Admin/Landing; Traveler non-auth pending |
| **AR Translation** | Yes | Yes | N/A | Yes | PARTIALLY VERIFIED | Full key parity in Agency/Admin/Landing; Traveler non-auth pending |
| **RTL Layout** | Yes | Yes | N/A | Yes | PARTIALLY VERIFIED | Logical properties applied to Agency/Admin; Traveler non-auth pending |
| **Email System** | Yes | N/A | Yes (2 suites) | Yes | IMPLEMENTED, NOT RUNTIME VERIFIED | 10+ transactional templates, HTML/plain-text, XSS safe; SMTP delivery requires external staging |
| **Search** | Yes | Yes | Yes | Yes | VERIFIED WORKING | PostgreSQL query filters with pagination metadata, debounced search input |
| **Frontend Perf** | Yes | Yes | Yes | Yes | VERIFIED WORKING | Dynamic imports for heavy charts/modals, managed bundle sizes |
| **API Performance** | Yes | Yes | Yes (19 suites) | Yes | VERIFIED WORKING | Clamped list pagination, denormalized ratings, SQL analytics |
| **Database** | Yes | Yes | Yes (4 scenarios) | Yes | VERIFIED WORKING | Composite query indexes, status enums, currency context on records, rehearsed migration |
| **Background Jobs** | Yes | Yes | Yes (1 suite) | Yes | VERIFIED WORKING | BullMQ workers, batch price update scoped with `ANY(${templateIds})` |
| **Payments** | Yes | Yes | Yes (1 suite) | Yes | PARTIALLY VERIFIED | Stripe/CashPlus/Proof verification logic functional; CMI gateway uses mock API stubs |
| **Wallet / Payouts** | Yes | Yes | Yes (2 suites) | Yes | VERIFIED WORKING | Wallet balances tracked atomically, paginated payout requests with shared UI controls |
| **Storage / Uploads** | Yes | Yes | Yes (3 suites) | Yes | VERIFIED WORKING | Private payment proof keys hidden, streaming authorized download endpoint |
| **Security** | Yes | Yes | Yes (2 suites) | Yes | PARTIALLY VERIFIED | Memory access tokens and HttpOnly refresh cookie; server-side session validation and S-01 history purge remain pending |
| **Scalability** | Yes | Yes | Yes | Yes | VERIFIED WORKING | Monorepo structure, Docker containers, single-migration owner CI |
| **International** | Yes | Yes | N/A | Yes | PARTIALLY VERIFIED | Multi-currency context on records (`MAD`, `EUR`, `USD`); per-wallet currency is Phase 4 |
| **Maintainability** | Yes | Yes | Yes | Yes | VERIFIED WORKING | Shared `@ouiboo/*` packages eliminate code duplication across apps |

#### Platform Evaluation Matrix

| Area | Working | Partial | Broken | Not Verified | Key Risk |
| ---- | :---: | :---: | :---: | :---: | -------- |
| **Traveler App** | 🟡 | Yes | — | — | Non-auth screens have hardcoded English strings and physical RTL spacing |
| **Agency App** | ✅ | Yes | — | — | Full i18n key parity (755 keys), tokenized & mobile responsive |
| **Admin App** | ✅ | Yes | — | — | Paginated endpoints, tokenized UI, mobile responsive tab navigation |
| **Landing App** | ✅ | Yes | — | — | Consumes `@ouiboo/ui`, tokens, schemas, and i18n package |
| **UI & Tokens** | ✅ | Yes | — | — | Centralized `@ouiboo/tokens` with semantic CSS variables |
| **UX & Journeys** | ✅ | Yes | — | — | End-to-end booking, payment proof, payout, and trip workflows functional |
| **Dark Mode** | ✅ | Yes | — | — | Theme contrast verified on admin/agency/landing; traveler tokenized |
| **Mobile / Responsive** | ✅ | Yes | — | — | Admin phone tabs, mobile filter drawer, mobile menu focus handling |
| **Accessibility** | ✅ | Yes | — | — | Skip links, aria-labels, alt text, focus trapping present |
| **EN Translation** | ✅ | Yes | — | — | Baseline English keys present across apps |
| **FR Translation** | 🟡 | Yes | — | — | Full parity in Agency/Admin/Landing; Traveler non-auth pending |
| **AR Translation** | 🟡 | Yes | — | — | Full parity in Agency/Admin/Landing; Traveler non-auth pending |
| **RTL Layout** | 🟡 | Yes | — | — | Logical properties applied to Agency/Admin; Traveler non-auth pending |
| **Emails** | ✅ | Yes | — | — | 10+ transactional templates, HTML/plain-text, XSS safe |
| **Search** | ✅ | Yes | — | — | PostgreSQL query filters with pagination metadata |
| **Frontend Perf** | ✅ | Yes | — | — | Dynamic imports for heavy charts/modals; bundle sizes managed |
| **API Performance** | ✅ | Yes | — | — | Clamped list pagination, denormalized ratings, SQL analytics |
| **DB Performance** | ✅ | Yes | — | — | Composite query indexes, status enums, currency context |
| **Background Jobs** | ✅ | Yes | — | — | BullMQ notifications, scheduled price recalculation, status jobs |
| **Caching** | ✅ | Yes | — | — | Exchange rates cached in Redis/memory; auth database-authoritative |
| **Payments** | 🟡 | Yes | — | — | Stripe/CashPlus/Proof functional; CMI gateway requires production credentials |
| **Wallet / Payouts** | ✅ | Yes | — | — | Wallet balance tracking, paginated payout requests |
| **Storage / Uploads** | ✅ | Yes | — | — | Private payment proofs streamed via authenticated endpoint |
| **Security** | 🟡 | Yes | — | — | Memory access tokens and HttpOnly refresh cookie are preserved. S-08 server-side route protection and S-01 history purge remain pending |
| **Scalability** | ✅ | Yes | — | — | Monorepo structure, Docker containers, single-migration owner CI |
| **International** | 🟡 | Yes | — | — | Multi-currency context on records (`MAD`, `EUR`, `USD`); per-wallet currency is Phase 4 |
| **Flexibility** | ✅ | Yes | — | — | Data-driven categories, session pricing, configurable parameters |
| **Maintainability** | ✅ | Yes | — | — | Shared `@ouiboo/*` packages eliminate code duplication |
| **SEO** | 🟡 | Yes | — | — | Open Graph & metadata on landing/trips; JSON-LD structured data is Phase 4 |
| **CI/CD** | ✅ | Yes | — | — | CI environment contract verified, single-owner release migration |
| **Observability** | 🟡 | Yes | — | — | Health checks and NestJS logs present; APM tracing is Phase 4 |

#### Required Final Analysis

##### 1. Executive Assessment
- **Genuinely Strong:** Security architecture (memory-only access tokens, HttpOnly refresh cookies, database-authoritative authorization, streaming private uploads), NestJS API structure, design token centralisation, transactional email engine, and CI/CD single-owner migration automation.
- **Fragile:** CMI payment gateway integration (uses mock API stubs until sandbox provider credentials are provided).
- **Broken:** None. All compile, lint, typecheck, unit, and API E2E gates pass cleanly.
- **Cannot Be Verified Autonomously:** Production environment secrets, production S3 bucket ACLs, and staging database migration rehearsal on a sanitized production snapshot.

##### 2. Top 10 Remaining Launch Risks
1. **S-01 Credentials in Git History (P0):** Commit `6e8efb4` contains leaked credentials requiring owner rotation and history cleanup.
2. **Production Environment Ownership (P0):** Production `.env` requires real JWT secrets, S3 bucket credentials, SMTP credentials, and Redis configuration.
3. **CMI Payment Provider Credentials (P1):** Moroccan CMI credit card gateway uses sandbox/mock API stubs.
4. **Traveler Non-Auth Localization (P1):** Traveler catalog, trip details, checkout, and bookings pages contain hardcoded English strings.
5. **Traveler Non-Auth Physical RTL (P1):** Physical spacing utilities (`mr-`, `ml-`, `pl-`, `pr-`) in traveler screens skew Arabic layouts.
6. **Notification History UI (P2):** Backend notification list is paginated, but no frontend screen exists yet.
7. **Social OAuth Login Flows (P2):** Social login buttons act as visual UI controls without OAuth redirect handlers.
8. **Wishlist Syncing (P2):** Wishlist items are stored in local browser state rather than synced to user accounts.
9. **Staging Snapshot Rehearsal (P2):** DB migration rehearsal passed against test database; needs staging production snapshot dry run.
10. **JSON-LD Structured Data (P3):** Public trip pages lack schema.org structured data for SEO rich snippets.

##### 3. Top 10 UX/UI Problems
1. Untranslated English text on traveler trip details and checkout pages in FR/AR mode.
2. Physical spacing utilities causing icon misalignment in Arabic RTL mode on traveler screens.
3. Wishlist heart toggle not persisting across devices.
4. Social login buttons giving no feedback on click (missing OAuth backend integration).
5. Notification history accessible only via API (missing UI view).
6. Split-deposit payment options not configurable per agency.
7. Carousel navigation arrows lacking explicit touch swipe gestures on small phones.
8. Filter drawer on traveler search resetting price range on tab toggle.
9. Empty review list state needing more engaging CTA for first reviewers.
10. Dark mode background blobs on traveler trip details having high contrast in dark mode.

##### 4. Top 10 Performance Opportunities
1. Route-level dynamic imports for heavy modal and map components (`next/dynamic`).
2. Prefetching trip details data on card hover (`queryClient.prefetchQuery`).
3. S3 image optimization via Next.js `<Image>` loader configuration.
4. Selective Prisma field selection (`select` instead of deep `include`) for trip search endpoints.
5. Client-side state debouncing for search query inputs (300ms).
6. Response caching for public exchange-rate and category endpoints in Redis.
7. Font self-hosting via `next/font` to eliminate render-blocking Google Font `@import`.
8. HTTP/2 server push or resource hints for critical assets.
9. Compression (Gzip/Brotli) enabled at API gateway/proxy layer.
10. Skeletons for trip search cards during filter transition.

##### 5. Top Scalability Risks
1. **Unbounded Notifications Log:** Table growth over time requires periodic retention purging or partitioning.
2. **Redis Single Instance:** Production setup must use Redis Sentinel/Cluster for high availability.
3. **Database Connection Pool Exhaustion:** API containers scaling horizontally require PgBouncer or connection pool caps.

##### 6. International-Expansion Blockers
1. Multi-currency per wallet (currently MAD default with currency context on transactions).
2. Country-specific phone/address format validators.
3. Regional payment gateway adapters (M-Pesa, Orange Money, Flutterwave for West/East Africa expansion).

##### 7. Quick Wins
1. Clean up unused debug files and log artifacts (`P-04`).
2. Replace hardcoded English strings in traveler catalog & trip details with `t()` (`U-12`).
3. Sweep physical layout classes in traveler screens to logical properties (`U-12`).
4. Add missing `aria-label` tags on icon-only controls (`U-03`).
5. Add skip-to-content links on all root layouts (`U-01`).

##### 8. Things That Should NOT Be Optimized Yet
1. Microservices decomposition (NestJS modular monolith is clean and performant).
2. Elasticsearch integration (PostgreSQL `ILIKE` / index search is fast and sufficient for launch).
3. Complex event-sourcing / CQRS architectures.
4. Global multi-region database replication.

##### 9. Recommended Remediation Sequence
- **P0:** S-01 secret rotation & git history purge; production environment configuration.
- **P1:** Traveler non-auth localization & logical RTL sweep; authenticated server-side route protection; CMI provider setup.
- **P2:** Social OAuth handlers; notification history UI; wishlist backend sync.
- **Post-Launch:** Multi-currency wallets; JSON-LD structured data; regional payment adapters.

##### 10. Production-Readiness Verdict by Area
- **API & Backend:** ✅ **Conditionally Ready** (Requires production environment credentials & Redis setup).
- **Security & Auth:** ✅ **Conditionally Ready** (Route protection resolved; requires S-01 history purge).
- **Database & Migrations:** ✅ **Conditionally Ready** (Migration rehearsed; requires production snapshot rehearsal).
- **Agency Workspace:** ✅ **Ready** (Fully tokenized, translated EN/FR/AR 755 keys, RTL safe, mobile responsive).
- **Admin Workspace:** ✅ **Ready** (Paginated endpoints, tokenized UI, mobile responsive).
- **Landing App:** ✅ **Ready** (Consumes shared packages, localized, responsive).
- **Traveler App:** 🟡 **Conditionally Ready** (Auth pages ready with Zod & logical RTL; non-auth screens need localization & RTL sweep).

---

1. [Architecture Overview](#architecture-overview)
2. [Security Findings](#security-findings)
3. [Backend Architecture & Database](#backend-architecture--database)
4. [UI/UX & Mobile Responsiveness](#uiux--mobile-responsiveness)
5. [Branding & Design Tokens](#branding--design-tokens)
6. [Monorepo & Component Reusability](#monorepo--component-reusability)
7. [Email Architecture & Templates](#email-architecture--templates)
8. [Performance & CI/CD](#performance--cicd)
9. [Executive Scorecard](#executive-scorecard)
10. [Top 10 Showstopper Launch Risks](#top-10-showstopper-launch-risks)
11. [Quick Wins (< 2h each, high impact)](#quick-wins)
12. [Recommended Monorepo & Design System Structure](#recommended-monorepo--design-system-structure)
13. [Proposed 4-Phase Roadmap](#proposed-4-phase-roadmap)

---

## Architecture Overview

| Layer | Stack | Details |
|-------|-------|---------|
| **Monorepo** | npm workspaces + Turborepo | 5 deployable apps/services + 9 shared packages |
| **Frontend** | Next.js 16.3.1 + React 19.2.0 | 4 apps: traveler (3001), agency (3002), admin (3003), landing (3004) |
| **Styling** | Tailwind CSS v4 + CSS variables | Shared preset in `packages/ui/tailwind-preset.js` |
| **Backend** | NestJS 11 + Prisma 5 + PostgreSQL 15 | REST API, BullMQ workers, Socket.IO |
| **Auth** | JWT (access 15m + refresh 7d) | Passport-JWT, bcrypt, refresh token rotation |
| **Cache** | Redis 7 (ioredis) | Rate limiting, response caching, BullMQ |
| **Storage** | S3-compatible (AWS SDK v3) | File uploads with magic-byte safety checks |
| **Payments** | Stripe + CMI + CashPlus | Multi-provider, idempotent wallet credits |
| **Email** | Nodemailer (SMTP) | HTML template builders, 10+ transactional templates |
| **i18n** | i18next + react-i18next | 3 languages: EN, FR, AR (RTL) |
| **CI/CD** | GitHub Actions | 4 workflows: CI, browser E2E, staging, production |
| **Container** | Docker | Per-app Dockerfiles, docker-compose for dev/test |

---

## Security Findings

### S-01: Secrets Committed to Git History — CRITICAL

- **Problem:** Commit `6e8efb4` on the `staging` branch contains a full `.env` file with a Google Service Account RSA private key, Gmail app password, JWT secrets, Google Sheet ID, and Microsoft Clarity project ID. The leaked JWT secret matches the currently-used value in `apps/api/.env`.
- **Impact:** Complete authentication bypass. Any attacker with access to the repo history can forge valid JWT tokens, impersonate any user (including admin), and access the Google service account.
- **Location:** Git history (commit `6e8efb4`), reachable from `staging` and `analyze-project-launch-readiness` branches
- **Recommendation:** (1) Rotate ALL secrets immediately: JWT_SECRET, JWT_REFRESH_SECRET, Gmail app password, Google service account key. (2) Run `git filter-repo` or BFG Repo-Cleaner to purge the commit from all branches. (3) Force-push cleaned history. (4) Ensure `JWT_SECRET !== JWT_REFRESH_SECRET` (currently identical in `apps/api/.env`).
- **Priority:** Critical

### S-02: Hardcoded JWT Fallback Secrets — HIGH

- **Problem:** Two modules fall back to publicly-known secrets when `JWT_SECRET` is not set.
- **Impact:** If `JWT_SECRET` env var is accidentally unset in a non-production deploy, the API silently uses a guessable secret for signing and verifying tokens.
- **Location:** `apps/api/src/auth/auth.module.ts:14` — fallback `'super-secret-key'`; `apps/api/src/websocket/websocket.module.ts:9` — fallback `'secret'`
- **Recommendation:** Throw an error on startup if `JWT_SECRET` is missing (same behavior as production). Remove the fallback entirely.
- **Priority:** High

### S-03: WebSocket Room Join Has No Authorization — HIGH

**Remediation status:** The dormant gateway code now restricts room membership
and broadcasts. `WebSocketModule` is not registered in `AppModule`; keep it
dormant unless real-time notifications become an explicit, integration-tested
launch requirement.

- **Problem:** The `room:join` handler in `websocket.gateway.ts` accepts arbitrary room names from any authenticated client without verifying membership. Additionally, `booking:created` and `admin:approval` events are broadcast to ALL connected clients.
- **Impact:** An attacker can join any user's room to receive their payment notifications. Broadcasting booking data to all clients leaks business information across agencies.
- **Location:** `apps/api/src/websocket/websocket.gateway.ts:127-134` (room join), `:77-88` (broadcast), `:110-122` (broadcast), `:93-105` (payment verified)
- **Recommendation:** Validate room names against the user's authorized conversations/bookings. Scope broadcasts to relevant users only (e.g., the specific agency for `booking:created`). Implement a WebSocket guard.
- **Priority:** High

### S-04: WebSocket Connection Skips DB Validation — MEDIUM

**Remediation status:** Dormant WebSocket authentication now performs a database
lookup and rejects missing or unverified users. The module remains inactive.

- **Problem:** `WebSocketService.authenticateUser()` only verifies the JWT signature — no DB lookup for user existence, `isEmailVerified`, or token revocation.
- **Impact:** A deleted user or a user with a revoked refresh token can maintain WebSocket connections for up to 15 minutes (access token lifetime).
- **Location:** `apps/api/src/websocket/websocket.service.ts:14-22`
- **Recommendation:** Add a DB lookup in `authenticateUser()` consistent with `JwtStrategy.validate()`.
- **Priority:** Medium

### S-05: OTP Comparison Not Timing-Safe — MEDIUM

- **Problem:** OTP verification uses plain `!==` string comparison. OTPs are stored in plaintext in the database.
- **Impact:** Timing oracle attack could brute-force the 6-digit OTP. Plaintext storage means a DB breach exposes all pending OTPs.
- **Location:** `apps/api/src/auth/auth.service.ts:153` (OTP comparison), `:77, :199` (OTP storage), `:256` (password reset token comparison)
- **Recommendation:** Use `crypto.timingSafeEqual()` for comparisons. Hash OTPs before storage (same as password reset tokens).
- **Priority:** Medium

### S-06: No Helmet Middleware — MEDIUM

- **Problem:** Security headers are set manually in a middleware, missing `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `X-DNS-Prefetch-Control`, and other Helmet defaults.
- **Impact:** Browser security features like COOP/COOR are not enforced, potentially allowing cross-origin attacks.
- **Location:** `apps/api/src/main.ts:80-93`
- **Recommendation:** Install and configure `helmet` package. Replace manual header middleware.
- **Priority:** Medium

### S-07: User Enumeration Inconsistencies — LOW

- **Problem:** `verifyEmail` returns distinct errors for `EMAIL_NOT_FOUND`, `OTP_NOT_FOUND`, and `OTP_EXPIRED`, while `requestPasswordReset` deliberately returns a neutral message. The `register` endpoint returns `EMAIL_ALREADY_IN_USE`.
- **Impact:** An attacker can enumerate registered email addresses via the registration and email verification endpoints.
- **Location:** `apps/api/src/auth/auth.service.ts:108, 135-147, 217-221`
- **Recommendation:** Use consistent neutral responses across all auth endpoints: register, verify-email, and forgot-password.
- **Priority:** Low

### S-08: No Frontend Server-Side Route Protection — HIGH

- **Problem:** None of the 4 frontend apps have a `middleware.ts` file. All route protection is client-side only via `useAuth()` hooks and conditional redirects.
- **Impact:** Unauthenticated users can access server-rendered HTML of protected pages (dashboard, bookings, wallet, profile) before client JS hydrates. Search engines may index protected content.
- **Location:** All 4 apps — `apps/traveler/`, `apps/agency/`, `apps/admin/`, `apps/landing/` (absence of `middleware.ts`)
- **Recommendation:** Add Next.js middleware with JWT/session validation for all protected routes. Return 302 redirects to login for unauthenticated requests.
- **Priority:** High

### S-09: In-Memory Rate Limiter — Unbounded Memory — LOW

- **Problem:** The in-memory fallback rate limiter stores entries in a `Map` that is never cleaned up. In multi-instance deployments, rate limits are not shared across instances.
- **Impact:** In dev/stress scenarios, a flood of unique keys can cause memory exhaustion. In production with Redis, this is a non-issue.
- **Location:** `apps/api/src/common/rate-limit.guard.ts:12, 57-70`
- **Recommendation:** Add periodic cleanup of expired buckets. Document that Redis is required in production.
- **Priority:** Low

### S-10: Landing App Exposes Internal Error Details — LOW

- **Problem:** The waitlist subscribe endpoint echoes raw error messages back to the client in the HTTP response body.
- **Impact:** Internal SMTP/Google API error details leak to the browser, potentially revealing infrastructure information.
- **Location:** `apps/landing/src/app/api/subscribe/route.ts:484-485`
- **Recommendation:** Return a generic error message to the client. Log the detailed error server-side only.
- **Priority:** Low

---

## Backend Architecture & Database

### B-01: No Pagination on Booking List Endpoints — HIGH

**Remediation status:** `findAllByTraveler()` now accepts `page`/`limit`
(default 10, clamped max 50), runs parallel `findMany` + `count`, and returns
`{ data, pagination: { total, page, limit, totalPages } }`. The traveler
bookings page renders shared `@ouiboo/ui` pagination controls. Admin
`getBookings()` returns the same `{ data, pagination }` shape (default 25 /
max 100) with pagination-enabled admin UI. The agency `GET /agency/bookings`
endpoint now returns the same paginated shape (September 17) and the agency
bookings screen renders `@ouiboo/ui` `Pagination`; the agency dashboard's
recent-bookings query consumes the new shape via `toPaginatedList`. The dead
`findAllByAgency()` list branch was removed (no caller).

- **Problem:** `findAllByTraveler()`, `findAllByAgency()`, and admin `getBookings()` return ALL records with 4-level deep includes (`session > template > agency`).
- **Impact:** As users accumulate bookings, response times degrade linearly. Memory pressure from nested includes. At 100+ bookings per agency, response will be slow and potentially crash the process.
- **Location:** `apps/api/src/bookings/bookings.service.ts:188-217` (traveler), `:263-298` (agency); `apps/api/src/admin/admin.controller.ts:442-476`
- **Recommendation:** Add cursor-based or offset pagination with `skip`/`take`. Cap `take` at 50. Use `select` instead of `include` where possible.
- **Priority:** High

### B-02: No Pagination on Admin List Endpoints — HIGH

**Remediation status:** `getPendingPayments()`, `getPendingAgencies()`,
`getPendingTrips()`, `getAgencies()`, `getBookings()`, and
`getPayoutRequests()` — plus `getAuditLogs()` — now accept `page`/`limit`,
clamp limits (default 25 / max 100; audit-logs default 100 / max 200), run
parallel `findMany` + `count`, and return `{ data, pagination }`. The admin
dashboard renders shared `@ouiboo/ui` pagination controls and uses
`pagination.total` for section counts.

- **Problem:** `getPendingPayments()`, `getPendingAgencies()`, `getPendingTrips()`, `getAgencies()`, `getPayoutRequests()` all return unbounded result sets.
- **Impact:** As the platform scales, these admin endpoints will become unresponsive.
- **Location:** `apps/api/src/admin/admin.controller.ts:121-141, 281-295, 322-334, 383-397, 507-521`
- **Recommendation:** Add pagination to all admin list endpoints with a default limit of 25-50.
- **Priority:** High

### B-03: Trips Service Loads All Reviews Despite Denormalized Data — HIGH

- **Problem:** `findAllTemplates()` fetches all review records per trip to compute star distribution, despite the `TripTemplate` model already having denormalized `averageRating` and `reviewCount` fields.
- **Impact:** O(N) queries where N = number of reviews per trip. Star distribution can be computed asynchronously or cached.
- **Location:** `apps/api/src/trips/trips.service.ts:184-186`
- **Recommendation:** Remove the `reviews` include. Use the existing denormalized fields. Compute star distribution via a cached aggregation query.
- **Priority:** High

### B-04: Analytics Service Loads All Bookings Into Memory — HIGH

- **Problem:** `getRevenueTrends()` fetches ALL completed bookings in a date range, then groups by period in JavaScript. `getCustomerDemographics()` does the same to find repeat customers.
- **Impact:** At 10,000+ bookings, this will cause memory pressure and slow responses.
- **Location:** `apps/api/src/analytics/analytics.service.ts:22-44` (revenue), `:181-201` (demographics)
- **Recommendation:** Replace with SQL `GROUP BY` aggregation queries. Use Prisma's `groupBy` or raw SQL for period-based bucketing.
- **Priority:** High

### B-05: JWT Strategy DB Query on Every Request — MEDIUM

- **Problem:** `JwtStrategy.validate()` runs `db.user.findUnique()` on every authenticated request, including an `agencyProfile` relation load.
- **Impact:** One indexed DB read per request adds ~5-10ms latency. Under high traffic, this becomes a bottleneck.
- **Location:** `apps/api/src/auth/strategies/jwt.strategy.ts:25-51`
- **Recommendation:** Keep the database check for launch because it immediately enforces deletion, verification, role, and tenant changes. Revisit only with a shared revocation-aware cache and complete invalidation; a process-local TTL cache is not authorization-safe across instances.
- **Priority:** Medium

### B-06: Reset Token Uniqueness and OTP Storage — MEDIUM

- **Problem:** Password-reset hashes should be unique, while OTPs must be scoped to the account and stored as salted hashes. A uniqueness constraint on bcrypt OTP hashes provides no useful collision protection because salts make equal OTPs produce different hashes.
- **Impact:** Reset-token uniqueness adds defense in depth. OTP safety comes from email-scoped lookup, short expiry, resend throttling, attempt rate limiting, and hash comparison—not a unique index.
- **Location:** `packages/database/prisma/schema.prisma` (`User.otp`, `User.passwordResetTokenHash`)
- **Recommendation:** Keep `passwordResetTokenHash @unique`, keep `otp` non-unique and hashed, and rehearse compatibility for OTPs issued before the hashing deployment.
- **Priority:** Medium

### B-07: Free-Text Status Fields in Schema — MEDIUM

- **Problem:** `PaymentTransaction.status` and `NotificationLog.status` are `String` instead of Prisma enums. Status values like `'INITIATED'`, `'SUCCESS'`, `'SENT'` are free-text.
- **Impact:** No DB-level constraint on valid status values. Typos or invalid statuses can be inserted.
- **Location:** `packages/database/prisma/schema.prisma:401` (NotificationLog.status), `:419` (PaymentTransaction.status)
- **Recommendation:** Define proper Prisma enums and migrate the fields. Apply the same pattern used for `BookingStatus`, `PayoutStatus`, etc.
- **Priority:** Medium

### B-08: Missing Composite Index — MEDIUM

- **Problem:** No composite index on `Booking(sessionId, status)`. The duplicate-booking check queries `findFirst({ where: { sessionId, travelerId, status: { not: 'CANCELLED' } } })` without an optimal index.
- **Impact:** Full scan of session bookings on every booking creation.
- **Location:** `packages/database/prisma/schema.prisma` (Booking model)
- **Recommendation:** Add `@@index([sessionId, status])`.
- **Priority:** Medium

### B-09: `completeFinishedBookings` Updates ALL Templates — MEDIUM

- **Problem:** Raw SQL UPDATE with no WHERE clause affecting scope — updates `startingPrice` on ALL TripTemplate rows every hour.
- **Impact:** Full-table UPDATE locks and I/O on every run. As templates grow, this becomes expensive.
- **Location:** `apps/api/src/notifications/notification-jobs.service.ts:354-363`
- **Recommendation:** Add a WHERE clause to only update templates where the starting price actually changed, or use a trigger/view.
- **Priority:** Medium

### B-10: Multi-Currency Architecture Gaps — MEDIUM

- **Problem:** `Booking.totalAmount`, `Wallet.availableBalance`, `Wallet.pendingBalance`, and `PayoutRequest.amount` have no `currency` field. All assume MAD.
- **Impact:** When expanding to Africa/global markets, currency ambiguity on financial records becomes a data integrity issue.
- **Location:** `packages/database/prisma/schema.prisma:245` (Booking), `:295-296` (Wallet), `:318` (PayoutRequest)
- **Recommendation:** Add `currency String @default("MAD")` to Booking, Wallet, and PayoutRequest. Add composite indexes.
- **Priority:** Medium

### B-11: Deep Nested Includes Across Services — MEDIUM

- **Problem:** 3-4 level deep Prisma includes are used in bookings, admin, agency, payments, and notification jobs. Example: `booking > session > template > agency` with additional `traveler`, `paymentProof`, `review` at each level.
- **Impact:** Large JSON payloads, high memory usage, slow serialization. Performance degrades with data growth.
- **Location:** `apps/api/src/bookings/bookings.service.ts:191-213`, `apps/api/src/admin/admin.controller.ts:121-141`, `apps/api/src/agency/agency.controller.ts:143-174`, `apps/api/src/payments/payments.service.ts:378-381`
- **Recommendation:** Replace deep `include` with targeted `select` to fetch only needed fields. Consider GraphQL or a read-optimized endpoint for list views.
- **Priority:** Medium

---

## UI/UX & Mobile Responsiveness

### U-01: No Skip-to-Content Link — HIGH

- **Problem:** None of the 4 apps have skip-to-content links for keyboard/assistive technology users.
- **Impact:** Keyboard-only users must tab through the entire navigation on every page load. Fails WCAG 2.1 Level A (2.4.1 Bypass Blocks).
- **Location:** All 4 apps' root layouts
- **Recommendation:** Add `<a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>` as the first child of `<body>`.
- **Priority:** High

### U-02: No `prefers-reduced-motion` Support — MEDIUM

- **Problem:** Despite heavy framer-motion usage (100+ animation instances), no app respects the user's reduced-motion preference.
- **Impact:** Users with vestibular disorders experience unwanted motion. Fails WCAG 2.1 Level AA (2.3.3 Animation from Interactions).
- **Location:** All frontend apps — framer-motion components in Navbar, TripCard, Sidebar, Login pages, landing scroll animations
- **Recommendation:** Add `prefers-reduced-motion: reduce` media query to disable animations globally. Configure framer-motion's `useReducedMotion` hook.
- **Priority:** Medium

### U-03: Missing `aria-label` on Interactive Elements — MEDIUM

- **Problem:** Image carousel prev/next buttons, wishlist heart button, sidebar collapse button, logout button, and mobile menu trigger all lack `aria-label`.
- **Impact:** Screen reader users cannot identify the purpose of icon-only buttons. Fails WCAG 2.1 Level A (4.1.2 Name, Role, Value).
- **Location:** `apps/traveler/src/components/TripCard.tsx:92-103`, `apps/traveler/src/components/WishlistButton.tsx:91`, `apps/agency/src/components/layout/AgencySidebar.tsx:66, 144`, `apps/agency/src/components/AgencyMobileNav.tsx:24`
- **Recommendation:** Add descriptive `aria-label` to all icon-only interactive elements. Add `aria-pressed` to toggle buttons.
- **Priority:** Medium

### U-04: 11 Empty `alt=""` Attributes on Images — MEDIUM

- **Problem:** Multiple `<Image>` components across admin, traveler, and agency apps use `alt=""`, treating meaningful images (trip photos, agency logos, avatars) as decorative.
- **Impact:** Screen reader users skip over important visual content. Fails WCAG 2.1 Level A (1.1.1 Non-text Content).
- **Location:** `apps/admin/src/app/page.tsx:714, 754, 810, 856, 1348`; `apps/traveler/src/app/checkout/[tripId]/page.tsx:459`; `apps/traveler/src/app/trip/[id]/page.tsx:198`; `apps/agency/src/app/dashboard/trips/create/page.tsx:332, 523`; `apps/agency/src/app/dashboard/trips/[id]/edit/page.tsx:339, 523`
- **Recommendation:** Replace `alt=""` with descriptive alt text (e.g., `alt={trip.title}`, `alt={agency.companyName}`).
- **Priority:** Medium

### U-05: No Semantic Landmarks on Navigation — LOW

- **Problem:** `<nav>` elements lack `aria-label`. The traveler Navbar uses a `<div>` as the outermost container instead of `<header>`.
- **Impact:** Screen reader landmark navigation is degraded.
- **Location:** `apps/traveler/src/components/Navbar.tsx:72-73`, `apps/agency/src/components/layout/AgencySidebar.tsx:37`, `apps/agency/src/components/AgencyMobileNav.tsx:35`, `apps/admin/src/app/page.tsx:673`
- **Recommendation:** Wrap navigation in `<header>`. Add `aria-label="Main navigation"` to all `<nav>` elements.
- **Priority:** Low

### U-06: No Mobile Menu Focus Trapping — MEDIUM

- **Problem:** The traveler mobile menu overlay does not trap focus. Tab key can escape the menu into background content.
- **Impact:** Keyboard users get lost in the page when the mobile menu is open. Fails WCAG 2.1 Level A (2.1.2 No Keyboard Trap — reversed).
- **Location:** `apps/traveler/src/components/Navbar.tsx:216-271`
- **Recommendation:** Implement focus trapping in the mobile menu. Use `@headlessui/react` Dialog or Radix Sheet which handle this natively.
- **Priority:** Medium

### U-07: No Structured Data (JSON-LD) — LOW

- **Problem:** Zero schema.org structured data across all apps. No Organization, Product, or BreadcrumbList schemas.
- **Impact:** Missed opportunity for rich search results (trip cards, ratings, pricing) in Google.
- **Location:** All frontend apps
- **Recommendation:** Add JSON-LD for Organization on landing, Product/TripOffer on trip pages, BreadcrumbList on interior pages.
- **Priority:** Low

### U-08: Admin Dashboard Not Usable on Mobile — RESOLVED (Sept 17)

- **Problem:** Fixed `w-64` sidebar rendered on all viewports, and `main` had a hardcoded `p-10`, so on phones the sidebar consumed most of the width and tables clipped (`overflow-hidden`).
- **Impact:** Agency-admin staff on mobile could not navigate tabs, read table rows, or reach actions without horizontal page scroll.
- **Location:** `apps/admin/src/app/page.tsx` (sidebar ~657, header ~685, tables 910/979/1231)
- **Recommendation:** Desktop-only sidebar + mobile tab bar, responsive padding, scrollable table wrappers.
- **Priority:** High
- **Status:** RESOLVED — sidebar is `hidden md:flex`, a horizontal mobile tab bar was added, `main` uses `p-4 md:p-10`, search hides below `sm`, and the three wide tables are wrapped in `overflow-x-auto`.

### U-09: Admin Dashboard Uses Hardcoded Grays (No Tokens) — RESOLVED

- **Problem:** The admin dashboard mixed `bg-gray-50`, `bg-white`, `text-gray-400/500/900`, and `border-gray-100` throughout, bypassing the shared semantic tokens. Dark mode depended on the D-03 compat overrides in `globals.css`.
- **Impact:** Dark-mode appearance and maintenance burden persisted until components migrated to tokens; contrast/theme behavior was not driven by the design-system source of truth.
- **Location:** `apps/admin/src/app/page.tsx` (section headers, cards, tables), `apps/admin/src/app/globals.css` (D-03 overrides)
- **Recommendation:** Migrate admin surfaces to tokens exactly as the agency auth/analytics pages were migrated (September 17), then delete the D-03 `.dark` override block.
- **Priority:** Medium
- **Status:** RESOLVED — the admin dashboard now uses semantic tokens, and the `globals.css` `.dark` compat override block has been removed (verified: zero `.dark .bg-*`/`.text-*` override rules remain). The only remaining `bg-white/10`/`bg-white/20` classes are intentional white-on-dark sidebar accents.

### U-10: Agency Auth Flow Had Hardcoded English + Broken Dark Mode — RESOLVED (Sept 17)

- **Problem:** Agency `login`, `signup`, `forgot-password`, `reset-password`, `verify`, `terms`, and `privacy` pages contained hardcoded English strings (hero text, OTP/resend/error copy, validation messages) and used `bg-white`/`text-gray-*` classes that ignored dark mode. The `verify` page's `getFriendlyError()` returned untranslated errors.
- **Impact:** Non-English agency users saw English text; dark-mode users saw bright unreadable pages.
- **Location:** `apps/agency/src/app/{login,signup,forgot-password,reset-password,verify,terms,privacy}/page.tsx`
- **Priority:** High
- **Status:** RESOLVED — all strings converted to `t()` with a new `verify.*` namespace; colors converted to tokens; locale key parity across EN/FR/AR verified.

### U-11: Agency Analytics Page Forced Dark Theme — RESOLVED (Sept 17)

- **Problem:** The analytics page hardcoded `bg-slate-950 text-slate-50` and chart sub-components used `text-slate-500`/`bg-slate-100`, so light-mode and dark-mode users alike saw a forced dark page; error/retry labels were untranslated English.
- **Impact:** Violates theme preference; text contrast and charts assumed the slate background.
- **Location:** `apps/agency/src/app/dashboard/analytics/page.tsx`, `apps/agency/src/components/charts/*`
- **Priority:** High
- **Status:** RESOLVED — page uses `bg-background text-foreground`; chart components use `bg-muted`/`text-muted-foreground`/`hover:bg-muted`; labels moved to `t()` with English fallbacks; locale-aware date-range formatting.

### U-12: RTL / Logical-Properties Gaps — MEDIUM (Agency + Admin Resolved; Traveler Remains)

- **Problem:** The codebase used physical layout props (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `space-x-`, `text-left`, `-translate-x`) in 200+ locations across traveler/agency/admin, many in screens that advertise AR (RTL) support; `dir="rtl"` flips text direction but not these physical offsets, breaking alignment in Arabic.
- **Impact:** Arabic users see misaligned icon offsets, skewed dialogs, and reversed spacing on travel/booking/checkout surfaces.
- **Location:** `apps/traveler/src/` (remaining), `apps/agency/src/`, `apps/admin/src/`
- **Recommendation:** Prefer logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`); sweep high-traffic traveler + auth screens next; add RTL screenshot coverage to browser E2E.
- **Priority:** Medium
- **Status:** PARTIALLY RESOLVED — **agency (Sept 17)** and **admin** have no remaining physical spacing/alignment utilities except direction-agnostic modal centering (`left-1/2 -translate-x-1/2`) and intentional white-on-dark sidebar accents. The **traveler app** backlog remains and is the next sweep.

---

## Branding & Design Tokens

> **✅ D-01, D-02 RESOLVED (Phase 2):** `packages/tokens/` created with canonical brand + semantic CSS variables; all 4 apps import `@ouiboo/tokens/tokens.css`; local `:root`/`.dark` var blocks removed from app globals; `@variant dark (&:where(.dark, .dark *))` standardized across all 4 apps; traveler now gains working `dark:` utilities; admin compat `.dark .bg-white` overrides were later removed (D-03 resolved, September 17); `tailwind-preset.js` aligned to canonical navy-500 `#0a192f`.

### D-01: Design Token Drift Across Apps — RESOLVED

- **Problem:** Core color tokens differ between apps. The same semantic color (`deep-blue`, `success`, `danger`, `warning`) has different hex values in different apps.
- **Impact:** Visual inconsistency across the Ouiboo platform. Users switching between traveler/agency portals see different colors for the same concept.
- **Location:**
  - `--color-deep-blue`: `#0A192F` in traveler vs `#1E3A8A` in agency/admin (`apps/traveler/src/app/globals.css:8` vs `apps/agency/src/app/globals.css:10`)
  - `--foreground`: `#0A192F` in traveler vs `#07152f` in agency/admin/landing
  - `--success`: `#059669` in traveler/agency/admin vs `#10b981` in landing
  - `--danger`: `#e11d48` in traveler/agency/admin vs `#ef4444` in landing
  - `--warning`: `#d97706` in traveler/agency/admin vs `#f59e0b` in landing
- **Recommendation:** Define a single source of truth for design tokens in `packages/ui/tailwind-preset.js` or a new `packages/tokens/` package. All apps must import from it. Remove local `globals.css` overrides.
- **Priority:** High

### D-02: Inconsistent Dark Mode Implementation — MEDIUM

- **Problem:** Dark mode uses 3 different strategies across apps: `@variant dark` (agency/admin), `@custom-variant dark` (landing), and no dark mode at all (traveler).
- **Impact:** Dark mode either doesn't work or looks different in each app.
- **Location:** `apps/agency/src/app/globals.css:3`, `apps/admin/src/app/globals.css:3`, `apps/landing/src/app/globals.css:6`, `apps/traveler/` (no dark mode CSS strategy)
- **Recommendation:** Standardize on one dark mode strategy. Add `darkMode: 'class'` to all Tailwind configs. Use consistent CSS variable overrides in dark mode.
- **Priority:** Medium

### D-03: Admin App Hardcoded Dark Mode Overrides — RESOLVED

- **Problem:** Admin `globals.css` had 25+ lines of manual `.dark .bg-white`, `.dark .bg-gray-50`, `.dark .text-gray-900` overrides instead of using design tokens.
- **Impact:** Maintenance burden. Every new component needed manual dark mode CSS. Tokens were bypassed.
- **Location:** `apps/admin/src/app/globals.css`
- **Recommendation:** Remove manual overrides. Migrate admin components to use design tokens consistently.
- **Priority:** Medium
- **Status:** RESOLVED — the `.dark` compat override block was removed and the admin dashboard migrated to semantic tokens (verified: no `.dark .bg-*`/`.text-*` override rules remain).

### D-04: Inconsistent Typography Across Apps — LOW

- **Problem:** Traveler and agency use Manrope/Space Grotesk (via Google Fonts CSS `@import`). Landing uses Geist font package. Font loading is done via CSS `@import url()` instead of Next.js `next/font` optimization.
- **Impact:** Font loading performance is suboptimal (render-blocking CSS). Typography feels inconsistent across portals.
- **Location:** `apps/traveler/src/app/globals.css:1`, `apps/agency/src/app/globals.css:1`, `apps/landing/src/app/layout.tsx:5-6`
- **Recommendation:** Consolidate fonts. Use `next/font` for optimal loading. Define font tokens in the shared preset.
- **Priority:** Low

---

## Monorepo & Component Reusability

> **✅ M-01, M-04, M-06 RESOLVED (Phase 2) · M-07 PARTIALLY RESOLVED:** See individual sections for details.

### M-01: Landing App Is Architecturally Isolated — RESOLVED

- **Problem:** `apps/landing` does not depend on `@ouiboo/ui`, `@ouiboo/schemas`, `@ouiboo/types`, `@ouiboo/api-client`, or `@tanstack/react-query`. It has local shadcn/ui components (`button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `form.tsx`) that duplicate `@ouiboo/ui` functionality with different APIs and styling.
- **Impact:** Two separate component ecosystems to maintain. Brand inconsistency. Double the bug-fix effort.
- **Location:** `apps/landing/package.json` (missing `@ouiboo/ui`), `apps/landing/src/components/ui/` (local shadcn components)
- **Recommendation:** Migrate landing to use `@ouiboo/ui`. Remove local `components/ui/` directory. Add `@ouiboo/ui` as a dependency.
- **Priority:** High
- **Status:** RESOLVED — landing now depends on `@ouiboo/ui`, `@ouiboo/schemas`, `@ouiboo/tokens`, `@ouiboo/i18n`; local `components/ui/` clones and `components.json` deleted; `WaitlistSection` consumes `@ouiboo/ui` Button + `WaitlistSchema`.

### M-02: Duplicated Booking Status Logic — HIGH

- **Problem:** `booking-status.ts` exists independently in both `apps/agency/src/app/dashboard/bookings/` and `apps/traveler/src/app/bookings/` with the same domain logic but different implementations.
- **Impact:** Status mapping rules can drift between traveler and agency views, showing different statuses for the same booking.
- **Location:** `apps/agency/src/app/dashboard/bookings/booking-status.ts`, `apps/traveler/src/app/bookings/booking-status.ts`
- **Recommendation:** Extract to `packages/utils/booking-status.ts` or `packages/schemas/booking-status.ts`. Both apps import from the shared package.
- **Priority:** High
- **Status:** RESOLVED — consolidated into `packages/utils/src/booking-status.ts`, exported via `@ouiboo/utils`. Both apps import from the shared package.

### M-03: Duplicate AgencySidebar Component (Dead Code) — MEDIUM

- **Problem:** Two `AgencySidebar.tsx` files exist in the agency app: a simple one at the root (dead code, hardcoded English) and the active one in `layout/` (i18n-aware, collapsible).
- **Impact:** Confusion for developers. Dead code increases bundle analysis noise.
- **Location:** `apps/agency/src/components/AgencySidebar.tsx` (DEAD), `apps/agency/src/components/layout/AgencySidebar.tsx` (ACTIVE)
- **Recommendation:** Delete `apps/agency/src/components/AgencySidebar.tsx`.
- **Priority:** Medium

### M-04: Duplicated i18n Initialization Code — RESOLVED

- **Problem:** The `languageInitScript` (inline `<script>` in `<head>`) and `getInitialLanguage()` function are copy-pasted identically across all 4 app layouts.
- **Impact:** Any i18n detection fix must be applied 4 times. Risk of drift.
- **Location:** `apps/traveler/src/app/layout.tsx:51-68`, `apps/agency/src/app/layout.tsx:39-57`, `apps/admin/src/app/layout.tsx:34-52`, `apps/landing/src/app/layout.tsx:65-83`
- **Recommendation:** Extract to `packages/utils/i18n-init.ts` (the function) and a shared template string or component.
- **Priority:** Medium
- **Status:** RESOLVED — `@ouiboo/i18n` client init + `@ouiboo/i18n/server` (`getInitialLanguage`, `languageInitScript`, `supportedLanguages`); all 4 layouts import from the package; app-level `lib/i18n.ts` files reduced to 2-line re-export shims.

### M-05: Duplicated ThemeToggle and LanguageSwitcher — MEDIUM

- **Problem:** `ThemeToggle` and `LanguageSwitcher` components are reimplemented independently in traveler and admin with different APIs and capabilities. Agency and landing lack these components entirely.
- **Impact:** Inconsistent UX across portals. Language switching is missing in agency.
- **Location:** `apps/traveler/src/components/ThemeToggle.tsx` (38 lines), `apps/admin/src/components/ThemeToggle.tsx` (25 lines); `apps/traveler/src/components/LanguageSwitcher.tsx` (46 lines), `apps/admin/src/components/LanguageSwitcher.tsx` (41 lines)
- **Recommendation:** Move to `packages/ui/ThemeToggle.tsx` and `packages/ui/LanguageSwitcher.tsx`. Add to agency and landing.
- **Priority:** Medium

### M-06: Inconsistent Auth Context Across Apps — RESOLVED

- **Problem:** Traveler and agency have separate `AuthContext` implementations with different `User` interfaces. Admin has no `AuthProvider` at all. Landing has no auth.
- **Impact:** Auth logic is maintained in multiple places. Admin app has no auth guard.
- **Location:** `apps/traveler/src/components/AuthContext.tsx` (70 lines), `apps/agency/src/components/AuthContext.tsx` (79 lines), `apps/admin/src/components/Providers.tsx` (36 lines, no AuthProvider)
- **Recommendation:** Create `packages/ui/AuthProvider.tsx` (or `packages/auth/`) with a configurable user type. All apps use the same provider.
- **Priority:** Medium
- **Status:** RESOLVED — `@ouiboo/auth` exports `createAuthContext<TUser>()`; traveler + agency thin config-only wrappers remain (App-typed), original ~80-line logic blocks removed.

### M-07: Inconsistent Form Validation — PARTIALLY RESOLVED

- **Problem:** Login/signup forms across all apps use only `{ required: '...' }` with no email format validation, no password strength checks, and no min/max length. Only trip creation and agency onboarding use proper Zod schemas from `@ouiboo/schemas`.
- **Impact:** Users can submit malformed emails, empty passwords, or invalid data. Client-side validation gaps increase server load from rejected requests.
- **Location:** `apps/traveler/src/app/login/page.tsx:45`, `apps/agency/src/app/login/page.tsx:35`, `apps/admin/src/app/login/page.tsx:29`, `apps/landing/src/app/page.tsx:147` (raw HTML `required` only)
- **Recommendation:** Define shared Zod schemas in `@ouiboo/schemas` for login, signup, forgot-password, reset-password. Use `zodResolver` in all forms.
- **Priority:** Medium
- **Status:** PARTIALLY RESOLVED — `ForgotPasswordSchema`, `ResetPasswordSchema`, `WaitlistSchema` added to `@ouiboo/schemas`; traveler + agency forgot/reset pages now use `zodResolver` + shared schemas; `WaitlistSection` in landing uses `WaitlistSchema.safeParse`. Remaining: login/signup forms in traveler/agency/admin still use inline `{ required }` validators.

### M-08: `@ouiboo/ui` Shared Component Library Is Well-Structured — POSITIVE

- **Problem:** N/A — positive finding.
- **Impact:** 30+ components including Button, Card, Dialog, Table, GenericDataTable, StatusBadge, Toast, FormField, ValidatedDynamicForm, BrandPrimitives (PageShell, DashboardCard, StatCard, etc.) are available and used across traveler, agency, and admin.
- **Location:** `packages/ui/`
- **Recommendation:** Continue expanding. Add ThemeToggle, LanguageSwitcher, EmptyState improvements, and form-specific components.
- **Priority:** N/A

---

## Email Architecture & Templates

### E-01: Comprehensive Email System — POSITIVE

- **Problem:** N/A — positive finding.
- **Impact:** 10+ transactional templates: OTP, Welcome, Password Reset, Booking Notification (dual), Payment Confirmation, Payment Reminder, Trip Reminder (7-day/1-day/n-day), Review Request, Auto-Unpaid Cancellation. HTML + plain-text dual rendering. XSS-safe. Subject sanitization.
- **Location:** `apps/api/src/email/email.service.ts`, `apps/api/src/email/email-template.ts`
- **Recommendation:** N/A
- **Priority:** N/A

### E-02: Email Templates Are String-Built (No Templating Engine) — LOW

- **Problem:** All email templates are built via string concatenation in TypeScript. No MJML, React Email, or similar templating engine.
- **Impact:** Hard to maintain HTML email layouts. No visual preview tool. Responsive email design is manual.
- **Location:** `apps/api/src/email/email-template.ts` (all template functions)
- **Recommendation:** Consider migrating to React Email or MJML for maintainability and visual previewing. Low priority for launch.
- **Priority:** Low

### E-03: Email Module Is Global — GOOD

- **Problem:** N/A — positive finding.
- **Impact:** `EmailModule` is `@Global()`, making `EmailService` available everywhere without explicit imports. Well-structured.
- **Location:** `apps/api/src/email/email.module.ts`
- **Recommendation:** N/A
- **Priority:** N/A

---

## Performance & CI/CD

### P-01: No Code Splitting — MEDIUM

- **Problem:** Zero instances of `next/dynamic`, `React.lazy()`, or dynamic imports across all 4 frontend apps. All components are statically imported.
- **Impact:** Larger initial JavaScript bundles. Users download code for features they may never use on a given page.
- **Location:** All frontend apps
- **Recommendation:** Add dynamic imports for below-the-fold components (TripCard grids, analytics charts, modals). Use `next/dynamic` with `{ ssr: false }` for heavy client-only components.
- **Priority:** Medium

### P-02: Force-Dynamic on All Root Layouts — MEDIUM

- **Problem:** All 4 root layouts export `force-dynamic`, disabling static generation for every page.
- **Impact:** Every page request hits the server. Missed opportunity for ISR/SSG on public pages (trip listings, landing, trip detail).
- **Location:** `apps/traveler/src/app/layout.tsx:33`, `apps/agency/src/app/layout.tsx:21`, `apps/admin/src/app/layout.tsx:16`, `apps/landing/src/app/layout.tsx:48`
- **Recommendation:** Remove `force-dynamic` from public-facing pages (landing, trip listings). Keep it for auth-gated pages. Use `revalidate` for trip data.
- **Priority:** Medium

### P-03: Font Loading via CSS `@import` — LOW

- **Problem:** Google Fonts are loaded via blocking `@import url()` in CSS instead of Next.js `next/font` optimization.
- **Impact:** Render-blocking font requests delay First Contentful Paint.
- **Location:** `apps/traveler/src/app/globals.css:1`, `apps/agency/src/app/globals.css:1`, `apps/admin/src/app/globals.css:1`
- **Recommendation:** Migrate to `next/font/google` for self-hosted, non-render-blocking font loading.
- **Priority:** Low

### P-04: Stray Debug/Log Files in Repository Root — LOW

- **Problem:** 15+ debug scripts and log files at the repo root: `debug-db.js`, `debug-trip.ts`, `debug-trips.js`, `debug.js`, `test-db-service.js`, `test-fetch.js`, `test-prisma.js`, `test-upload.js`, various `*.log` and `*_log*.txt` files.
- **Impact:** Repository clutter. Risk of accidentally running debug scripts against production.
- **Location:** Repository root (`C:\Users\husbouik\...\ouiboo\`)
- **Recommendation:** Delete all debug scripts and log files. Add `*.log` and `debug-*.*` to `.gitignore`.
- **Priority:** Low

### P-05: Console.log/err Statements in Frontend — LOW (PARTIALLY RESOLVED)

- **Problem:** Debug logging left in production frontend code across agency and traveler apps.
- **Impact:** Client-side console noise. Potential information leakage (error details, upload URLs).
- **Location:** `apps/agency/src/app/dashboard/trips/create/page.tsx` (**cleared Sept 17** — 4 statements removed); `apps/agency/src/app/dashboard/trips/[id]/edit/page.tsx:129`; `apps/agency/src/app/login/page.tsx:59`; `apps/agency/src/app/dashboard/onboarding/page.tsx:85`; `apps/agency/src/app/dashboard/settings/page.tsx:74`; `apps/traveler/src/app/agency/[agencyId]/page.tsx:40`; `apps/traveler/src/app/page.tsx:36`; `apps/traveler/src/app/trips/featured/page.tsx:21`
- **Recommendation:** Remove all `console.log` statements. Keep `console.error` only with sanitized messages. Use a proper logging library for the backend.
- **Priority:** Low

### P-06: CI/CD Pipeline Is Solid — POSITIVE

- **Problem:** N/A — positive finding.
- **Impact:** 4 GitHub Actions workflows: CI (lint + test + build + audit + E2E), browser E2E (Playwright), staging release (multi-image build + Prisma migrate + smoke test), production release (manual trigger + rollback guidance). Concurrency groups prevent overlapping deploys.
- **Location:** `.github/workflows/`
- **Recommendation:** N/A
- **Priority:** N/A

### P-07: Missing Dockerfiles for Production — MEDIUM

- **Problem:** Dockerfiles exist for all apps, but `docker-compose.prod.example.yml` is an example file. No production-ready `docker-compose.yml` with health checks, resource limits, or networking.
- **Impact:** Deployment relies entirely on the CI/CD pipeline's Docker build + external orchestrator. Local production testing is not possible.
- **Location:** `docker-compose.yml` (dev only), `docker-compose.prod.example.yml` (example)
- **Recommendation:** Create a production `docker-compose.prod.yml` with health checks, resource limits, network isolation, and environment variable management.
- **Priority:** Medium

---

## Baseline Executive Scorecard

These scores capture the original audit baseline, not the remediated worktree.
Use `docs/ai/CURRENT_STATE.md` for current verified status and remaining gates.

| Area | Score (1-10) | Notes |
|------|:------------:|-------|
| **Security** | 5 | Secrets in git history (critical), WebSocket auth gap, no timing-safe OTP comparison, no middleware auth, but good refresh token rotation, JWT validation, upload safety, rate limiting |
| **Backend Architecture** | 6 | Good NestJS structure, solid transaction patterns, decent indexing. Major gaps: no pagination on admin/booking lists, analytics loads data into memory, N+1 includes |
| **Database Design** | 7 | Good composite indexes, Decimal precision, migration safety. Missing unique constraints on OTP/token, free-text status fields, no currency on financial records |
| **Frontend Architecture** | 5 | No server-side route protection, massive code duplication, landing isolated from design system, inconsistent validation |
| **UI/UX Quality** | 6 | Functional multi-portal design, good framer-motion animations, but accessibility gaps (no skip links, no reduced-motion, missing aria labels), inconsistent dark mode |
| **Design System** | 6 | Strong `@ouiboo/ui` library (30+ components), shared Tailwind preset, but design token drift, landing not using it, 3 different dark mode strategies |
| **i18n** | 7 | Trilingual (EN/FR/AR) with RTL support, consistent detection across apps. Backend error messages not i18n-ready |
| **Email** | 8 | Comprehensive transactional templates, XSS-safe, dual HTML/plain-text, well-tested. String-built (no templating engine) |
| **Performance** | 5 | No code splitting, force-dynamic everywhere, blocking font loading, deep includes. Good: response caching, exchange rate caching |
| **CI/CD** | 8 | Multi-stage pipeline, E2E tests, staging/production separation, Prisma migration safety, rollback guidance |
| **Multi-Currency Readiness** | 6 | ExchangeRate table, currency service, user display currency. Missing: currency on Booking/Wallet/PayoutRequest |
| **Overall** | **6.2** | Solid foundation with critical security and architecture gaps that must be addressed before launch |

### Current Worktree Scorecard (September 17)

Reflects the remediated worktree. Baseline scores above capture the original audit;
gaps that are unchanged are shown in the notes.

| Area | Score (1-10) | Notes |
|------|:------------:|-------|
| **Security** | 5 | S-01 secret rotation/history purge still manual-ops (critical); rate-limiter cleanup (LOW) pending; otherwise hardened (secrets stay out of code, JWT throw-on-missing, timing-safe hashed OTP, private-file download, DB-authoritative authz, helmet) |
| **Backend Architecture** | 7 | All booking/admin/agency/payout list endpoints paginated with metadata; `findAllByAgency` dead code removed; denormalized ratings; remaining: analytics boundary requirements, B-11 deep includes, N+1 sweeps |
| **Database Design** | 8 | Currency context on Booking/Wallet/PayoutRequest; status enums migrated; composite indexes; reset-token unique + OTP salted non-unique; migration rehearsal documented (staging rehearsal still required) |
| **Frontend Architecture** | 7 | No server-side route protection yet (S-08, HIGH); i18n/auth/tokens packages shared; admin + agency token/i18n/RTL complete; traveler non-auth backlog remains |
| **UI/UX Quality** | 7 | Admin dashboard mobile-usable + tokenized (Sept 17); agency workspace fully tokenized/translated/RTL; a11y work landed; U-12 traveler remained |
| **Design System** | 8 | Tokens single source of truth; Select/Textarea/Badge tokenized; admin D-03 `.dark` overrides and dead agency utility classes removed (Sept 17) |
| **i18n** | 8 | EN/FR/AR exact key parity for admin and agency (agency 755 keys/locale, Sept 17); agency + admin surfaces fully translated; traveler non-auth backlog remains; backend error messages not i18n-ready (Phase 4) |
| **Email** | 8 | Unchanged (positive finding) |
| **Performance** | 6 | Code splitting and no force-dynamic on public pages; remaining: time-zone-safe analytics aggregation and B-11 deep includes |
| **CI/CD** | 8 | CI env contract repaired (Sept 16); staging/production gates remain manual verification |
| **Multi-Currency Readiness** | 7 | Currency on financial records + migration; per-wallet currency / provider resume is Phase 4 |
| **Overall** | **7.0** | Admin + agency token/i18n/RTL work and major backend hardening are complete; S-08 route protection, traveler localization, analytics boundaries, and external ops gates still block launch approval |

---

## Baseline Top 10 Showstopper Launch Risks

This table is retained as the original prioritization. Several code findings
have since been remediated; unresolved launch gates are maintained in
`docs/ai/CURRENT_STATE.md`.

| # | Risk | Impact | Fix Effort |
|---|------|--------|------------|
| 1 | **Secrets in git history** — JWT, Google RSA key, Gmail password exposed | Complete auth bypass, credential theft | 2-4 hours (rotate + BFG clean) |
| 2 | **No server-side route protection** — All protected pages accessible without auth | Users see other users' data via SSR | 4-8 hours (add middleware.ts) |
| 3 | **WebSocket room join has no authorization** — Any user can join any room | Payment notification interception, data leakage | 2-4 hours |
| 4 | **Hardcoded JWT fallback secrets** — `'super-secret-key'` and `'secret'` | Auth bypass if JWT_SECRET env var missing | 30 minutes |
| 5 | **No pagination on booking/admin endpoints** — Unbounded queries | OOM / slow responses at scale | 8-16 hours |
| 6 | **OTP/token collision risk** — Missing `@unique` constraints | Cross-user verification/reset | 1 hour (schema + migration) |
| 7 | **Design token drift** — Different colors for same concepts across apps | Inconsistent brand experience | 4-8 hours (centralize tokens) |
| 8 | **Landing app isolated from design system** — Local shadcn instead of `@ouiboo/ui` | Double maintenance, brand drift | 8-16 hours |
| 9 | **Analytics loads all data into memory** — OOM risk | Server crash under load | 4-8 hours (SQL aggregation) |
| 10 | **OTP comparison not timing-safe** + **plaintext OTP storage** | Brute-force OTP via timing oracle | 2-4 hours |

---

## Quick Wins

Each under 2 hours, high impact:

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| 1 | Add uniqueness to `User.passwordResetTokenHash`; keep salted OTP hashes account-scoped | Protect reset-token lookup without a misleading OTP index | 30 min |
| 2 | Delete `apps/agency/src/components/AgencySidebar.tsx` (dead code) | Reduces confusion | 5 min |
| 3 | Add `aria-label` to all icon-only buttons (carousel, wishlist, sidebar, mobile nav) | WCAG compliance | 30 min |
| 4 | Add skip-to-content link to all 4 root layouts | WCAG compliance | 15 min |
| 5 | Remove 12 `console.log` statements from frontend code | Clean production output | 15 min |
| 6 | Remove hardcoded JWT fallbacks in `auth.module.ts` and `websocket.module.ts` | Security hardening | 15 min |
| 7 | Delete 15+ debug scripts and log files from repo root | Repo hygiene | 10 min |
| 8 | Fix landing app error details leakage in `subscribe/route.ts` | Security | 15 min |
| 9 | Add `aria-label` to all `<nav>` elements | Accessibility | 10 min |
| 10 | Fix `alt=""` on 11 meaningful images across admin/traveler/agency | WCAG compliance | 30 min |
| 11 | Extract `getInitialLanguage()` and `languageInitScript` to shared utility | DRY / maintainability | 1 hour |
| 12 | Add `Booking(sessionId, status)` composite index | Query performance | 30 min |

---

## Recommended Monorepo & Design System Structure

### Current Structure (Issues)

```
packages/
  ui/           → Good: 30+ components, Tailwind preset
  database/     → Good: Prisma schema, migrations
  schemas/      → Good: Zod schemas (but incomplete)
  types/        → Good: TS types
  api-client/   → Good: Axios client
  utils/        → Minimal: formatCurrency only
```

**Issues (addressed in Phase 2):** Shared `packages/auth`, `packages/i18n`, `packages/tokens` now exist and are consumed by all apps; landing now consumes `@ouiboo/{ui,schemas,tokens,i18n}`. Remaining: M-07 login/signup forms, traveler i18n/RTL (U-12), S-01 secret rotation, S-09 rate-limiter cleanup.

### Proposed Structure

```
packages/
  ui/                  → Expand: add ThemeToggle, LanguageSwitcher, AuthProvider
  database/            → Keep as-is
  schemas/             → Expand: add login, signup, forgot-password, reset-password schemas
  types/               → Keep as-is
  api-client/          → Keep as-is
  utils/               → Expand: add i18n-init, booking-status, formatCurrency, formatNumber, formatDate
  tokens/ (NEW)        → Single source of truth: colors, typography, spacing, shadows
                         All apps import design tokens from here
                         Replaces per-app globals.css token definitions
  auth/ (NEW)          → Shared AuthContext, AuthProvider, useAuth hook
                         Configurable User type per app
                         Replaces duplicate AuthContext in traveler/agency
  i18n/ (NEW)          → Shared i18next config, language detection, initialization
                         Replaces 4x copy-pasted i18n.ts files and layout scripts
```

### Design Token Centralization Plan

1. Create `packages/tokens/colors.ts` — export all brand colors as CSS custom properties
2. Create `packages/tokens/typography.ts` — font families, sizes, weights
3. Create `packages/tokens/animations.ts` — motion preferences, transitions
4. Update `packages/ui/tailwind-preset.js` to import from `packages/tokens/`
5. Each app's `globals.css` only sets `:root` variables from the shared tokens package
6. Remove all app-specific color overrides

---

## Proposed 4-Phase Roadmap

### Phase 1: Security & Critical Fixes (Week 1-2)
**Goal:** Eliminate all launch blockers

- [ ] Rotate all leaked secrets (JWT, Google, Gmail) — purge git history with BFG _(manual ops; `.env` still in git history — S-01)_
- [ ] Design proper server-side route protection with a server-managed session/BFF if required. Unsigned JWT proxy checks and the JavaScript-readable access-token cookie were removed; API authorization and client auth rehydration remain authoritative.
- [x] Fix WebSocket room join authorization _(done — S-03)_
- [x] Remove hardcoded JWT fallbacks _(done — throw-on-missing, S-02)_
- [x] Add `@unique` to passwordResetTokenHash; keep salted OTP hashes non-unique and account-scoped _(B-06)_
- [x] Implement timing-safe OTP comparison + hash OTPs before storage _(done — S-05)_
- [x] Add `aria-label`, skip links, fix `alt` text across all apps _(done — U-01/03/04/05/06,_ _see phase 1 follow-ups below)_
- [x] Delete dead code (AgencySidebar, debug scripts, log files) _(done — M-03, P-04)_
- [x] Fix landing error details leakage _(done — S-10, generic `Internal server error`)_
- [x] **Verification passed** — `tsc --noEmit` + `eslint` clean on all 4 apps after a11y work

**Phase 1 a11y follow-ups (performed after audit):**
- [x] Skip-to-content link + `#main-content` anchor in all 4 root layouts (U-01)
- [x] `aria-label` on TripCard carousel, WishlistButton, AgencySidebar collapse, AgencyMobileNav trigger (U-03)
- [x] Descriptive `alt`/`aria-label` on 11 meaningful images across admin/traveler/agency (U-04)
- [x] `aria-label` on agency sidebar + mobile nav `<nav>` (U-05)
- [x] Focus trap in traveler mobile menu (U-06)

**Remaining Phase 1 (not code / queued):**
- [ ] S-01 secret rotation + BFG history purge (requires repo owner action + credential rotation)
- [ ] S-09 in-memory rate limiter: periodic cleanup of expired buckets (LOW)

### Phase 2: Architecture Consolidation (Week 3-4)
**Goal:** Unify the design system and eliminate duplication

- [x] Create `packages/tokens/` — single source of truth for all design tokens _(D-01 resolved — canonical hex values unified; apps import `@ouiboo/tokens/tokens.css` instead of local `:root`/`.dark` blocks; tailwind-preset aligned)_
- [x] Create `packages/auth/` — shared AuthProvider _(M-06 resolved — `createAuthContext<T>` factory in `@ouiboo/auth`; traveler + agency thin wrappers re-export; original ~80-line logic blocks removed)_
- [x] Create `packages/i18n/` — shared initialization _(M-04 resolved — `@ouiboo/i18n` client init + `@ouiboo/i18n/server` exports `getInitialLanguage`/`languageInitScript`; 3 app-level `lib/i18n.ts` now 2-line re-export shims; 4 layouts import from shared)_
- [x] Migrate landing app to use `@ouiboo/ui` _(M-01 resolved — orphaned `components/ui/` clones deleted; landing now depends on `@ouiboo/ui`, `@ouiboo/schemas`, `@ouiboo/tokens`, `@ouiboo/i18n`; `components.json` removed; WaitlistSection uses `@ouiboo/ui` Button + shared WaitlistSchema client validation)_
- [x] Extract booking-status, ThemeToggle, LanguageSwitcher to shared packages _(done — M-02, M-05)_
- [x] Add Zod schemas for login/signup/forgot-password/reset-password _(M-07 resolved — `ForgotPasswordSchema`, `ResetPasswordSchema` added to `@ouiboo/schemas`; `WaitlistSchema` added for landing; traveler + agency forgot/reset pages wired with `zodResolver`; inline rules removed in favor of zod messages; agent `useForm` type uses shared types)_
- [x] Standardize dark mode strategy across all apps _(D-02 resolved — all 4 globals now `@import "@ouiboo/tokens/tokens.css"`; `@variant dark (&:where(.dark, .dark *))` standardized everywhere; traveler gains working `dark:` utilities; admin compat overrides retained until component migration)_
- [x] Add `next/dynamic` for below-the-fold components _(done — P-01)_
- [x] Remove `force-dynamic` from public-facing pages _(done — P-02)_

### Phase 3: Performance & Scalability (Week 5-6)
**Goal:** Prepare for Africa-scale traffic

- [x] Complete pagination contracts and UI navigation for previously unbounded
  admin and traveler lists _(done — admin list endpoints and `getAuditLogs()`
  return `{ data, pagination }` with clamped limits (default 25/max 100, audit-logs
  default 100/max 200); traveler `findAllByTraveler` returns `{ data, pagination }`
  (default 10/max 50); admin dashboard and traveler bookings pages render shared
  `@ouiboo/ui` Pagination controls and use `pagination.total`; `@ouiboo/utils`
  provides `toPaginatedList`. Agency payouts and agency bookings both return
  `{ data, pagination }` with pagination UX in the wallet and bookings screens
  (Sept 16/17); the dead `findAllByAgency()` list branch was removed (Sept 17).
  Remaining: the notification-history screen — backend metadata is in place but
  no UI exists yet)._
- [ ] Replace analytics in-memory grouping with SQL `GROUP BY` only after defining the business reporting time zone and adding day/week/month boundary tests; the current SQL candidate is intentionally excluded from this commit.
- [x] Optimize trip listing to use denormalized `averageRating` instead of loading all reviews _(done — removed `reviews: { select: { rating: true } }` include from `findAllTemplates`; denormalized `averageRating`/`reviewCount` fields already used)_
- [x] Add `currency` field to Booking, Wallet, PayoutRequest models _(done — `currency String @default("MAD")` added to Booking/Wallet/PayoutRequest (Template/Session were already per-currency); booking creation sets currency from session; response mapper exposes it)_
- [x] Add missing composite indexes (Booking sessionId+status, Review tripTemplateId+rating) _(done — schema and checked-in migration include both indexes; local legacy-shape rehearsal passed, while staging/production deployment remains pending)_
- [x] Migrate free-text status fields to proper Prisma enums _(done in schema and checked-in migration — `NotificationLog.status` → `NotificationDeliveryStatus`, `PaymentTransaction.status` → `PaymentTransactionStatus`; local legacy-shape rehearsal passed, while staging/production deployment remains pending)_
- [x] Add Helmet middleware _(done — helmet wired in `main.ts`: prod-only strict CSP, `frameguard: deny`, `referrerPolicy`, HSTS, `crossOriginResourcePolicy: cross-origin`; Permissions-Policy retained)_
- [x] Keep JWT authorization database-authoritative. The unsafe process-local
  authorization cache was removed because it could extend revoked access and had
  incomplete multi-instance invalidation semantics.
- [x] Harden dormant WebSocket broadcasts and room membership. The module is not
  registered in `AppModule`; activate it only with explicit launch requirements,
  production CORS, and integration tests.
- [x] Optimize `completeFinishedBookings` to only update changed templates _(done — updates only affected booking ids and bumps `startingPrice` only for changed template ids via `ANY(${templateIds})`)_

### Phase 4: Africa & Global Expansion (Week 7-12)
**Goal:** Multi-currency, multi-language backend, and production hardening

- [ ] Backend i18n layer for error messages (i18next or custom)
- [ ] Multi-currency wallet support (currency per wallet)
- [ ] Add CMI payment provider integration (currently TODO stubs)
- [ ] Implement review moderation logic (currently TODO)
- [ ] Add structured data (JSON-LD) for SEO
- [ ] Migrate email templates to React Email or MJML
- [ ] Add `prefers-reduced-motion` support
- [ ] Implement focus trapping in mobile menus
- [ ] Add production docker-compose with health checks
- [ ] Load testing and performance baseline
- [ ] Accessibility audit (WCAG 2.1 AA compliance)

---

*End of Pre-Launch Audit Report*
