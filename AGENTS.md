# Ouiboo AI Agent Operating Rules

This file applies to the entire repository. Its purpose is to keep future AI work aligned with Ouiboo's pre-launch objective and to prevent broad refactors from quietly weakening security, behavior, or deployability.

## Product objective

Ouiboo is a three-sided travel marketplace for travelers, agencies, and administrators. It launches in Morocco, but its product language, design, data model, currencies, locales, addresses, phone formats, time zones, SEO, payments, and infrastructure must be able to expand to Africa and then global markets.

Work in this priority order:

1. Launch quality and correctness
2. Security and data integrity
3. Traveler UX, accessibility, and trust
4. Branding consistency
5. Maintainability and reuse
6. Performance
7. Scalability and international expansion

Prefer **stable → simple → beautiful → fast → reusable → scalable**. Do not redesign or re-platform merely to make the code look newer.

## Required working method

Before changing code:

1. Read this file completely.
2. Inspect `git status`, the relevant diff, existing tests, package boundaries, Prisma schema/migrations, CI workflows, and deployment configuration.
3. Read the latest pre-launch audit, but verify every claim against current code. Audit files can be stale.
4. State the problem, impact, exact location, recommendation, and priority before any major or cross-cutting change.
5. Make incremental changes that preserve proven business behavior and public/API contracts.

Never discard, reset, overwrite, or reformat unrelated uncommitted work. Do not commit, push, rewrite Git history, deploy, rotate secrets, or mutate production data unless the user explicitly authorizes that exact action.

## Non-negotiable security rules

- Never store access or refresh tokens in `localStorage`, session storage, or a JavaScript-readable cookie. Keep short-lived access tokens in memory and refresh tokens in `HttpOnly`, `Secure` production cookies with an appropriate `SameSite` policy.
- Do not add frontend middleware that merely decodes an unsigned JWT payload and calls that authentication. A route guard must validate a server-managed session or use a secure BFF/session design. It must also preserve refresh-token rehydration across reloads.
- Server authorization remains authoritative. Every traveler, agency, and admin endpoint must enforce role and ownership/tenant checks. An agency must never read or mutate another agency's private records.
- Never log passwords, OTPs, reset tokens, authorization headers, email bodies, bank details, identity documents, payment payloads, or other sensitive data.
- Secrets must come from validated environment configuration. No fallback signing secrets, committed credentials, or placeholder production credentials.
- Treat uploads as hostile: enforce authentication/ownership, size limits, magic-byte/MIME validation, safe generated names, and private/signed access where appropriate.
- Payment and wallet operations require authoritative server amounts, provider/booking binding, replay protection, atomic state transitions, and idempotency under concurrency.
- Security optimizations must fail closed. Caches must not extend deleted, disabled, unverified, or role-revoked access; document invalidation and multi-instance behavior.

## Database and API rules

- Every Prisma schema change requires a checked-in migration in the same change. A passing TypeScript build is not migration proof.
- Prefer additive, backward-compatible migrations. For constraints or enum conversions, include duplicate/invalid-data preflight checks and an explicit rollback/impact note. Never make destructive schema changes silently.
- Financial records must carry immutable currency context. Do not mix currencies inside one wallet or payout ledger without an explicit model and invariant.
- Preserve response shapes unless all consumers are migrated together. Pagination work is incomplete unless metadata or a documented cursor exists and the UI can navigate beyond the first page.
- Validate page, limit, filters, sort fields, dates, enums, money, and IDs at the DTO/boundary. Clamp limits and use deterministic ordering.
- Avoid N+1 queries and unbounded/deep payloads, but do not replace correct business logic with a faster query whose period, time-zone, status, or tenant semantics differ.
- Background jobs and webhook handlers must be safe to retry and safe under concurrent workers.

## Frontend, UX, brand, and internationalization rules

- Review traveler, agency, and admin experiences separately. The traveler surface receives the highest visual and conversion priority.
- Reuse focused shared components and tokens when behavior is truly common. Do not create generic abstractions that hide business meaning or couple all apps unnecessarily.
- Shared design tokens are the source of truth for color, typography, spacing, radii, shadows, and semantic states. Check light/dark contrast and RTL after token changes.
- Preserve keyboard navigation, visible focus, semantic landmarks, accessible labels, dialog focus management, loading/empty/error/success states, and `prefers-reduced-motion` behavior.
- Do not publish invented testimonials, partner names, usage counts, guarantees, pricing, or trust claims. Marketing statements must be verifiable.
- Do not hardcode Morocco, `MAD`, `+212`, city lists, dates, or locale formatting where product data/configuration should supply them. A Morocco default is acceptable only when explicit and replaceable.
- Public traveler pages need truthful metadata, canonical URLs, Open Graph, robots/sitemap behavior, semantic HTML, and useful structured data. Private pages must be `noindex`.
- Analytics and non-essential tracking load only after explicit consent and must support withdrawal.

## Email rules

- Transactional email must use shared, escaped, mobile-responsive branded primitives and provide both HTML and plain text.
- Subjects, links, currencies, dates, and locale must come from trusted/configured data.
- Production delivery configuration must fail closed. Batch jobs must isolate per-recipient failures and be idempotent.

## CI/CD and deployment rules

- Keep one migration owner per release. Do not run migrations independently in every API container.
- Production artifacts must be immutable. Validate environment variables before migration/deployment, run smoke checks after deploy, and retain a documented rollback path.
- Do not claim launch readiness from unit tests alone. Production configuration, migrations, browser flows, provider callbacks, emails, storage, backups/restores, observability, and rollback need staging evidence.

## Verification required before handing off changes

Use the narrowest relevant checks while iterating, then run the broad gates appropriate to the touched scope:

```text
npm run lint
npm test
npm run build
npm run check:tracked-env
npm run check:placeholders
npm run check:env:prod   # with a complete safe validation environment
npm run test:e2e:api:prepare
npm run test:e2e:api
npm run test:e2e         # for affected browser journeys
```

Also run Prisma validation/generation and migration checks for database work. Report every command exactly as passed, failed, skipped, or blocked; never describe an interrupted or missing process as successful.

## Current uncommitted-diff review gates

Do not assume the current large working tree is safe merely because individual changes match an audit recommendation. Before it can be committed, future agents must resolve or explicitly reject these known review items:

1. Keep access tokens memory-only. The unsafe `ouiboo_access_token` cookie and unsigned JWT proxy checks were removed on September 15; do not reintroduce them without a proper server-session/BFF design.
2. Rehearse `20260915133000_add_currency_status_enums_and_indexes` on a production-like snapshot. Its preflight must pass before deployment, and rollback/locking impact must be documented.
3. Keep authorization checks database-authoritative unless a future cache has comprehensive invalidation and explicit multi-instance revocation behavior. The unsafe 45-second process cache was removed.
4. Do not add caps to previously unbounded admin/traveler lists until the endpoint returns pagination metadata and the UI provides navigation. Add pagination UX for the already-bounded payout and notification-history screens.
5. Weekly analytics currently preserves the existing Sunday-start label. Add explicit business-time-zone requirements and boundary tests before changing date semantics.
6. Confirm OTP hashing deployment compatibility for already-issued plaintext OTPs. Salted OTP hashes must not receive a uniqueness constraint.
7. Validate that shared auth/i18n/UI packages preserve each app's API client, login navigation, RTL, focus, and theme behavior.
8. Keep `git diff --check` clean and minimize formatting-only noise; the known whitespace errors were fixed on September 15.
9. Update the pre-launch audit so its findings, file counts, status, scores, and "changes made" section reflect the actual worktree rather than the source audit that inspired changes.
10. Lint, unit/integration tests, API E2E, browser E2E, Prisma validation, and production builds passed by September 16. Migration rehearsal against legacy-shaped production data and production configuration/operations gates remain required.

## Completion standard

The final pre-launch deliverable must contain:

- executive scores for UI, UX, branding, mobile, frontend, backend, database, performance, security, CI/CD, scalability, international readiness, and launch readiness;
- the top 10 remaining problems;
- quick wins;
- a realistic pre-launch checklist classified as Critical, High, Medium, or Enhancement;
- Phase 1 Launch, Phase 2 Stabilization, Phase 3 African expansion, and Phase 4 Global scalability;
- recommended monorepo/shared-package organization;
- the Ouiboo design system and visual language;
- an exact summary of changes made and verification evidence.

Do not call the app production-ready while external launch gates remain unverified, including secret rotation/history cleanup, production environment ownership, legal/privacy approval, provider credentials/webhooks, staging migration rehearsal, backup restore, monitoring/alerts, smoke tests, and rollback rehearsal.
