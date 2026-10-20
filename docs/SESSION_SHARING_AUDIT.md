# Session Sharing Audit (#252)

**Date:** 2026-10-19
**Issue:** #252 — Extract shared BFF session package
**Scope:** Phase 1 — audit only. No code changes.

## 1. Background

Per #208, each Next.js portal (agency, traveler, admin) runs a BFF session layer because the API's
`refresh_token` cookie is HttpOnly and scoped to the API domain, so app proxies can never see it.
Each app maintains its own signed `ouiboo_session` cookie (HMAC-SHA256, Edge-runtime compatible),
validated by a `/api/auth/session` route and a `proxy.ts` auth gate.

Related hardening already landed and must be preserved by any extraction:
- #247 — stable error codes + safe logging (code + timestamp only, never tokens/cookies)
- #257 — portal role isolation (403 `SESSION_ROLE_MISMATCH`)
- #243 — `SESSION_SECRET` env validation (`scripts/validate-env.mjs`)

## 2. File inventory

| File | Agency | Traveler | Admin |
|---|---|---|---|
| `src/lib/session.ts` | 93 lines | 93 lines | 93 lines |
| `src/app/api/auth/session/route.ts` | 143 lines | 143 lines | 143 lines |
| `src/proxy.ts` | 56 lines | 76 lines | 56 lines |

Consumers of these files (imports of `signSession`/`verifySession`/`SESSION_COOKIE_NAME`
outside the files above): **none** — only `proxy.ts` and the session route use them.

## 3. What is identical (shareable as-is)

### 3.1 `src/lib/session.ts` — 100% identical across all three apps

`diff` returns no differences. Shareable verbatim:

- `SessionPayload` interface (`sub`, `role`, `exp`)
- `SESSION_COOKIE_NAME = 'ouiboo_session'`
- `SESSION_MAX_AGE_SECONDS = 15 * 60` (matches access-token lifetime)
- `signSession()` / `verifySession()` — HMAC-SHA256 via Web Crypto (Edge compatible)
- Fail-closed verification: bad signature, expiry, malformed, or missing secret → `null`
- Constant-time signature comparison
- base64url helpers

Security notes (per `AGENTS.md` non-negotiables): no tokens logged, secret from validated env,
no fallback secrets. Extraction must keep all of these properties.

### 3.2 `src/app/api/auth/session/route.ts` — identical except one constant

All three files are 143 lines; the **only** difference is:

```ts
const ALLOWED_ROLE = 'AGENCY';   // agency
const ALLOWED_ROLE = 'TRAVELER'; // traveler
const ALLOWED_ROLE = 'ADMIN';     // admin
```

Everything else is shared logic:

- `POST /api/auth/session` — validates `{ accessToken }` with `GET <API_URL>/users/me`,
  enforces `ALLOWED_ROLE` (403 `SESSION_ROLE_MISMATCH`), signs session cookie
- `GET /api/auth/session` — returns session status from cookie
- `DELETE /api/auth/session` — clears the cookie (`maxAge: 0`)
- Stable error codes (#247): `SESSION_MALFORMED` (400), `SESSION_INVALID_TOKEN` (401),
  `SESSION_ROLE_MISMATCH` (403), `SESSION_UPSTREAM_ERROR` (502), `SESSION_CONFIG_ERROR` (500)
- `sessionError()` + `logSessionError()` — safe logging (error code + timestamp only)
- `sessionCookieOptions()` — `httpOnly`, `secure` in production, `sameSite: 'lax'`,
  `path: '/'`, `maxAge: SESSION_MAX_AGE_SECONDS`
- Fail-fast on missing `SESSION_SECRET` before hitting the API (#243, #247)

### 3.3 `proxy.ts` — shared primitives

All three proxies share:

- Import of `verifySession` + `SESSION_COOKIE_NAME`
- Redirect-to-login-with-`redirect`-param pattern for unauthenticated users
- `matcher` config excluding `api`, `_next/static`, `_next/image`, `favicon.ico`

## 4. What is app-specific (must stay in the apps)

### 4.1 Session route

- **`ALLOWED_ROLE`** — `'AGENCY'` / `'TRAVELER'` / `'ADMIN'`. This is the one parameterization
  point. Everything else in the route is generic.

### 4.2 `proxy.ts` — auth-gate shape differs per portal

| Aspect | Agency | Admin | Traveler |
|---|---|---|---|
| Public paths | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify` | `/login` only | n/a (uses protected list instead) |
| Gate trigger | any non-public path under `/dashboard` | any non-public path (whole app) | explicit `TRAVELER_PROTECTED` list (`/messages`, `/notifications`, `/bookings`, `/wishlist`, `/profile`) |
| Role check in proxy | `session.role !== 'AGENCY'` → redirect | `session.role !== 'ADMIN'` → redirect | **none** — redirects on missing session only (role enforced at session creation in the route) |

Traveler is structurally different (protected-list vs public-list model), so the proxy's
gate logic cannot be collapsed into one generic function without losing clarity.

### 4.3 Non-session concerns embedded in `proxy.ts` (must NOT move to a session package)

- **Traveler i18n**: `lang` query/cookie normalization → `x-ouiboo-language` header,
  `i18nextLng` cookie management. Unrelated to sessions.
- **Traveler SEO**: `X-Robots-Tag: noindex, nofollow, noarchive` on private path prefixes.
  Unrelated to sessions.

A shared proxy helper should expose only a small `requireSession(request, { loginPath })`-style
primitive; path lists, i18n, and SEO headers stay in each app.

## 5. Proposed package structure (Phase 2)

New package **`packages/session`** (`@ouiboo/session`) — server/Edge-safe, zero runtime
dependencies (`next` types as peer only). Do **not** put this in `@ouiboo/auth`: that package
is `'use client'` (browser auth context) and mixing Edge-runtime server code into it would be wrong.

```
packages/session/
  package.json          # name: @ouiboo/session, main/types: index.ts
  index.ts              # re-exports
  signing.ts            # SessionPayload, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS,
                        # signSession(), verifySession()  (from lib/session.ts, verbatim)
  errors.ts             # SessionErrorCode, sessionError(), logSessionError()
  cookies.ts            # sessionCookieOptions()
  route.ts              # createSessionRoute({ allowedRole, apiUrl? }) -> { POST, GET, DELETE }
```

Migration per app (mechanical):

1. `apps/<app>/src/app/api/auth/session/route.ts` becomes ~10 lines:
   ```ts
   import { createSessionRoute } from '@ouiboo/session';
   export const { POST, GET, DELETE } = createSessionRoute({ allowedRole: 'AGENCY' });
   ```
2. Delete `apps/<app>/src/lib/session.ts`.
3. `proxy.ts`: change `@/lib/session` import to `@ouiboo/session`; keep all app-specific
   path/i18n/SEO logic untouched. Optionally adopt a tiny `requireSession()` helper if one
   is added — not required.

Conventions to follow (repo uses flat packages: `index.ts` at package root, e.g.
`packages/api-client`, `packages/utils`).

## 6. Risks and constraints for Phase 2

1. **Edge runtime safety** — the package must not import Node-only APIs. Current code uses
   only Web Crypto + `TextEncoder`/`atob`/`btoa`; keep it that way.
2. **`@/` alias removal** — `proxy.ts` and route files switch to the package import; verify
   `tsc` in all three apps after migration.
3. **No behavior change** — error codes, cookie options, logging shape, and role enforcement
   must be byte-for-byte behavior-identical. Add package unit tests (sign/verify roundtrip,
   tamper rejection, expiry, malformed) — none exist today for `lib/session.ts`.
4. **Env validation untouched** — `SESSION_SECRET` checks in `scripts/validate-env.mjs`
   (#243) and Vercel project env vars stay as-is.
5. **`AGENTS.md` security rules** — no unsigned-JWT checks (HMAC verification stays),
   fail closed, never log secrets. The audit confirms current code complies; the extraction
   must not regress it.

## 7. Recommendation

Proceed with Phase 2 as specified in §5. Estimated shape: 1 new package (~5 small files,
mostly moved verbatim), 3 route files reduced to factory calls, 3 `lib/session.ts` files
deleted, 3 import-line changes in `proxy.ts`. Low risk, high deduplication value (~520 lines
of near-identical code → ~180 in the package + thin app shims).
