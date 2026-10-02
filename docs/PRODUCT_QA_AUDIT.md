# Ouiboo Product QA Audit

Date: 2026-05-06

Scope: API, traveler app, agency app, admin app, and landing app. This audit covered live local smoke checks, backend API probes, browser-based UI/accessibility heuristics, code scans for design consistency, and build/test validation.

## Executive Summary

Ouiboo has the core marketplace skeleton working: auth, signup, admin login, protected role endpoints, agency dashboard APIs, traveler profile/wishlist/bookings APIs, currency, and public trip search all respond correctly in the local stack.

The biggest issues are not basic uptime. They are product-readiness issues:

- Sensitive user fields were exposed from `/api/users/me`. This was fixed during the audit.
- Arabic RTL works after hydration, but Arabic pages initially server-render as `lang="en"` and `dir="ltr"`, causing a brief incorrect direction and weaker accessibility/SEO.
- The UI design system migration is incomplete outside the traveler app. Landing, admin, and agency still contain many hardcoded `bg-white`, `text-gray-*`, and compatibility dark-mode hacks.
- Several important controls are not programmatically labeled, especially traveler search fields and landing waitlist fields.
- Search/home currently have no active trip data in the tested environment, which makes the product feel empty unless seed/demo content or stronger empty states are added.
- Some UI elements appear clickable but have no real behavior, especially social login buttons.

## Validation Completed

### Builds And Tests

- `npm.cmd run build --workspace @ouiboo/traveler`: passed.
- `npm.cmd run build --workspace @ouiboo/admin`: passed.
- `npm.cmd run build --workspace @ouiboo/api`: passed.
- `npm.cmd test --workspace @ouiboo/traveler -- --runInBand`: passed after updating the semantic status-token expectation.
- Earlier in this redesign pass, `@ouiboo/agency` and `@ouiboo/landing` builds also passed.

Known non-blocking warning:

- `baseline-browser-mapping` is more than two months old. It does not block builds, but it should be updated during dependency maintenance.

### Backend Functional Probes

Live API checks passed for:

- `GET /api/health`
- `GET /api/health/db`
- `GET /api/currency/supported`
- `GET /api/currency/convert?amount=100&target=USD`
- `GET /api/trips?status=ACTIVE&page=1&limit=5`
- Admin login with `admin/admin` through normalized email `admin@ouiboo.local`
- Admin protected reads: pending agencies, pending trips, pending payments, audit logs
- Traveler signup, `/api/users/me`, wishlist count, my bookings
- Agency signup, `/api/users/me`, agency stats, agency trips, agency bookings
- Expected security failures: wishlist without token returns `401`, invalid login returns `401`

Important data observation:

- Public active trip search returned an empty dataset in the tested environment: `{ data: [], pagination: { total: 0 } }`.

### Browser UI Checks

Focused browser checks confirmed:

- Traveler Arabic page hydrates to `lang="ar"` and `dir="rtl"`.
- Landing Arabic page hydrates to `lang="ar"` and `dir="rtl"`.
- Agency signup Arabic hydrates to `lang="ar"` and `dir="rtl"`.
- Admin login Arabic hydrates to `lang="ar"` and `dir="rtl"`.
- Key pages returned HTTP `200`.

Focused accessibility findings:

- Traveler home has an unnamed mobile menu button.
- Traveler home search fields rely on placeholders only.
- Traveler search has unlabeled search, date, and price fields.
- Landing waitlist fields rely on placeholders only, including the select.
- Agency signup has no `h1`.
- Admin login has no `<main>` landmark.

## Fixes Applied During Audit

### Backend Security

File: `apps/api/src/users/users.service.ts`

`/api/users/me` and profile update responses no longer expose:

- `password`
- `passwordResetTokenHash`
- `passwordResetExpiresAt`
- `passwordResetSentAt`
- `otp`
- `otpExpiresAt`
- `otpLastSentAt`

Live verification after restarting the API confirmed `/api/users/me` now returns only:

- `id`
- `name`
- `email`
- `role`
- `avatar`
- `isEmailVerified`
- `displayCurrency`
- `createdAt`
- `updatedAt`
- `agencyProfile`

### Traveler Status Tokens

Files:

- `apps/traveler/src/app/bookings/booking-status.ts`
- `apps/traveler/src/app/bookings/booking-status.test.ts`

Fixed an invalid generated class, `bg-success/100/10`, and aligned tests with semantic status tokens.

## Priority Findings

## P0: Security And Trust

### 1. Prevent Sensitive Field Leakage Everywhere

Status: fixed for `/api/users/me` and `updateUserProfile`.

Risk:

Returning password hashes, reset tokens, or OTP fields trains the backend into unsafe response patterns. Even hashed secrets should not be sent to clients.

Recommendation:

- Add a shared `sanitizeUser` or response DTO layer used by all user-returning endpoints.
- Add regression tests that assert user responses do not contain `password`, `otp`, or reset fields.
- Review admin, booking, agency, auth, message, and payment responses for nested `user` objects.

### 2. Fix Server-Side Language And Direction

Evidence:

Raw HTML for Arabic pages initially renders as `<html lang="en">`. Browser hydration later corrects this to Arabic.

Risk:

Screen readers, crawlers, and users on slow devices receive the wrong language/direction initially. This can produce layout flicker and poor RTL accessibility.

Recommendation:

- Derive `lang` and `dir` in app layouts from request query/cookie/server state.
- Persist language in a cookie, not only client-side i18n state.
- Apply `dir="rtl"` before first paint for Arabic.

## P1: Accessibility And UX Clarity

### 3. Add Programmatic Labels To Forms

Affected areas:

- Traveler home search inputs.
- Traveler search search/date/price inputs.
- Landing waitlist name/email/phone/user type fields.

Recommendation:

- Add visible labels where space allows.
- Add `aria-label` for compact controls.
- Keep placeholders as examples, not as the only accessible name.

### 4. Name Icon-Only Buttons

Affected area:

- Traveler mobile menu button.

Recommendation:

- Add `aria-label="Open navigation menu"` and `aria-expanded`.
- Add `aria-controls` referencing the mobile drawer.

### 5. Normalize Page Structure

Findings:

- Agency signup lacks an `h1`.
- Admin login lacks a `<main>` landmark.
- Some dashboard pages rely on large div structures rather than semantic regions.

Recommendation:

- Use one `h1` per page.
- Wrap primary content in `<main>`.
- Use `<nav>`, `<aside>`, `<section>`, and headings consistently.

### 6. Search UX Needs Mobile And Filter Clarity

Findings:

- Traveler search uses a fixed sidebar layout that is likely awkward on narrow screens.
- Price chip text can read like `0-8 MAD`, which is confusing for real trip prices.
- Date fields have no explicit "from/to" labels.

Recommendation:

- Add a mobile filter drawer.
- Add labels: "Start date", "End date", "Minimum price", "Maximum price".
- Revisit price defaults and currency display.
- Add an empty-state CTA when no trips match filters.

## P1: Unified Design System

### 7. Complete Semantic Token Migration

Current state:

- Traveler is closest to the new visual language.
- Agency, admin, and landing still have many hardcoded white/gray/slate classes.
- Landing still includes broad dark-mode compatibility CSS such as `.dark .bg-white`.
- Admin dashboard has many hardcoded table/card surfaces.

Recommendation:

- Continue migrating app surfaces to `background`, `foreground`, `card`, `muted`, `border`, `input`, `primary`, `accent`, `success`, `warning`, and `danger`.
- Remove broad dark-mode CSS overrides once components use semantic classes.
- Use the shared `packages/ui` primitives for cards, panels, badges, page shells, stat cards, and action bars.

### 8. Bring Agency And Admin Up To Traveler Visual Quality

Agency needs:

- Auth pages migrated to semantic dark-safe tokens.
- Dashboard shell uses token surfaces instead of `bg-white dark:bg-slate-*`.
- Empty/loading/error states standardized.
- Operational tables and cards should use the same badge/status language as traveler.

Admin needs:

- Safer destructive/approval patterns.
- Better scan hierarchy for queues, payments, payouts, and audit logs.
- Semantic dark-mode coverage across the large dashboard page.
- Consistent confirmation modals for reject/refund/payout actions.

Landing needs:

- Remove legacy inline dark-mode compatibility hacks.
- Convert marketing sections to the same brand token system.
- Label waitlist fields.
- Confirm all CTA links point to the right app URLs in every environment.

## P1: Backend And Workflow Clarity

### 9. Add Regression Tests Around Auth And User Serialization

Recommendation:

- Test `/auth/login` success and failure.
- Test `/users/me` does not return secrets.
- Test role-protected admin/agency routes reject the wrong role.
- Test traveler cannot access agency/admin data.

### 10. Improve HTTP Error Logging

Observation:

The API log line for invalid login showed an error but still printed `POST /api/auth/login 201`, while the client correctly received `401`.

Risk:

Operational logs can mislead debugging and monitoring.

Recommendation:

- Adjust the HTTP logger/interceptor to record the actual final response status for thrown exceptions.

### 11. Add Seed Data For Product Testing

Observation:

Active trips returned empty in local testing.

Risk:

Home, search, trip detail, checkout, wishlist, and booking flows cannot be meaningfully tested without stable fixture data.

Recommendation:

- Add a `seed:demo` dataset with:
  - one verified agency
  - one pending agency
  - active trips with sessions
  - one manual-payment booking
  - one gateway-payment booking
  - one uploaded payment proof
  - one rejected proof
  - one review and agency response

## P2: Feature And Product Improvements

### 12. Make Social Login Buttons Honest

Finding:

Social login buttons exist on auth pages but appear to be inert.

Recommendation:

- Either wire OAuth, mark as "Coming soon", or remove them until functional.

### 13. Add Guidance For First-Time Users

Traveler:

- Explain payment proof states more clearly.
- Add "what happens next" after checkout.
- Add visible support/contact path on booking detail.

Agency:

- Add onboarding checklist progress.
- Explain what verification documents are needed and why.
- Add examples for trip creation fields.

Admin:

- Add queue guidance: what each status means, what happens after approval/rejection.
- Require rejection reasons for agency/trip/payment rejections.

### 14. Improve Performance Baselines

Observation:

Dev cold renders are slow because Next compiles routes on demand, which is expected in development. Production builds pass, but there is no automated performance baseline.

Recommendation:

- Run production-mode Lighthouse or Playwright tracing against `next start`.
- Replace remote Google font CSS imports with `next/font` or local font loading.
- Avoid external unsplash images in critical UI paths, or use stable optimized assets.
- Add route-level loading skeletons that do not shift layout.

## Suggested Next Implementation Order

1. Add regression tests for user serialization and role protection.
2. Finish server-side language/RTL handling.
3. Fix the accessibility items: labels, mobile menu naming, landmarks, headings.
4. Build a demo seed dataset so workflows are testable end-to-end.
5. Continue semantic-token migration for agency, admin, and landing.
6. Add a mobile filter drawer and stronger search empty states.
7. Add production Lighthouse/Playwright checks to CI.

## Evidence Files

Temporary audit outputs were generated under the OS temp directory:

- `ouiboo-api-audit.json`
- `ouiboo-focused-ui-audit.json`
- `ouiboo-ui-elements-audit.json`

These were not committed because they are environment-specific run artifacts.

