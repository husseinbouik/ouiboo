# Threat model — Ouiboo platform (#338)

_Last updated: 2026-10-22. Living document — update when a surface changes._

## Assets

- Traveler + agency accounts (credentials, OTPs, sessions)
- Booking + payment data (payment proofs, wallet balances, payout RIBs)
- Agency verification documents and business identifiers (ICE, patente)
- Media (trip photos, avatars) in Backblaze B2
- Platform integrity: public catalog correctness, pricing, availability
- Money movement: agency wallets, payouts, subscription state

## Actors

- Opportunistic credential stuffers / brute-forcers (automated, high volume)
- Fraudulent agencies (fake listings, payout fraud)
- Fraudulent travelers (fake payment proofs, chargeback abuse)
- Copyright infringers uploading unlicensed media
- Scrapers / denial-of-service noise against public endpoints
- Malicious insiders are out of scope (single-operator platform today)

## Entry points

- Public web: traveler catalog/search/detail, landing + waitlist, signup/login
- Authenticated: agency dashboard (trips, wallet, payouts), admin console
- API: `/api/v1/*` (REST), file upload + `/media` serving, webhooks (Stripe),
  cron maintenance endpoint (secret-gated), email flows (OTP, reset)

## Controls in place (verified in code)

- **Auth**: bcrypt passwords; OTP-gated email verification; JWT access +
  rotating refresh tokens (hashed at rest); BFF session cookie
  (HttpOnly, Secure, SameSite) per portal with role checks.
- **Brute force**: Redis pre-bcrypt risk gate on login (#264) — fails fast
  with 429 before burning bcrypt CPU; fails open on Redis outage by design.
- **Authorization**: role guards (JwtAuthGuard + RolesGuard) on admin and
  agency surfaces; agency-scoped queries enforce ownership.
- **Marketplace integrity**: public catalog only serves trips from VERIFIED
  agencies with ACTIVE status (#182, #317); uploads are type-checked and
  served through the API's media route (no public bucket URLs).
- **Browser**: per-environment CSP whose connect-src is derived from the
  build's own API URL (#318); security headers via the shared config.
- **Compliance rails**: age gate at signup (#321); marketing-email
  suppression + signed unsubscribe (#322); copyright takedown workflow with
  admin deactivation (#325); audit log for admin actions.
- **Supply chain**: branch protection on master (required checks + review),
  Dependabot alerts + security updates (enabled 2026-10-22, #327),
  SonarCloud SAST in CI.
- **Cost/availability**: free-tier hard limits on Vercel/Neon/Upstash
  (#331); bounded, idempotent cron jobs; per-endpoint throttles on auth.

## Data retention (current state + gaps)

| Data | Stored | Retention |
| --- | --- | --- |
| Passwords | bcrypt hash | Life of account |
| OTP / reset tokens | Hashed, with expiry timestamps | Expire in minutes/hour; rows overwritten on reuse |
| Date of birth (#321) | User record | Life of account — purpose: age verification + booking contracts |
| Email suppressions (#322) | Email + reason + timestamp | Indefinite by design (legal duty not to re-market) |
| Copyright reports (#325) | Reporter contact + notice text | Keep with the resolution record; review after 24 months |
| Payment proofs | B2 via API media | Tied to booking record; no lifecycle rule yet — **gap** |
| Backups (Neon) | Provider-managed | Per plan point-in-time window |

## Top residual risks

1. **Backblaze egress has no platform hard cap** — owner action in #331.
2. **No WAF/rate-limit at the edge** for public catalog endpoints (API-level
   throttles only cover auth) — revisit with the Pro/spend-cap decision (#331).
3. **Payment-proof lifecycle** — no retention/deletion rule for uploaded
   proofs after booking completion; add to the #251 legal review.
4. **Admin actions rely on a single operator account** — production test
   identities (#259) and, longer term, a second admin + hardware-key 2FA.
5. **Session-replay** exists only on landing behind consent (#323) — keep
   it that way; any expansion needs a fresh entry in this document.
