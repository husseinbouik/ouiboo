# Ouiboo Roadmap

## Decision: Serverless on Vercel

The platform stays on **Vercel serverless** for the API and all frontends. No Docker/container migration planned.

**Implications:**
- BullMQ background workers do not run reliably on serverless. Maintenance jobs move to Vercel Cron or manual triggers.
- WebSockets do not work on serverless. Real-time notifications (booking created, payment verified, admin approval) use polling (30s interval) until Phase 2.
- File uploads use S3-compatible storage (Backblaze B2). Never local disk.
- Database migrations have a single owner: GitHub Actions release pipeline (see #184).

---

## Phase 1 — Launch (current)

Ship the marketplace to production in Morocco.

**Launch blockers:**
- #182 — Public trips must filter by agency verification status
- #183 — Admin API must not leak credential hashes
- #184 — Single migration owner (remove `prisma migrate deploy` from Vercel build)
- #179 — Image optimizer remote patterns (done)

**Security hardening:**
- #185 — Next.js middleware for server-side route protection
- #186 — NPM vulnerability audit and CI gate

**Traveler bugs:** #120, #122, #131, #133, #139

## Phase 2 — Stabilization & Growth

Triggered when: paying agencies onboarded, or realtime/background jobs become business-critical.

### Infrastructure
- [ ] **Evaluate long-running containers** (Railway/Render/Fly.io) for the API if WebSocket realtime or BullMQ workloads outgrow polling/cron. Decision point, not a foregone conclusion.
- [ ] **CDN for public images** — serve trip photos directly from Backblaze B2 (or Cloudflare in front) instead of proxying through the API. Reduces API bandwidth and latency.
- [ ] **PostgreSQL full-text/trigram search** — replace naive title/location matching with proper indexed search as catalog grows.
- [ ] **Cursor pagination** — replace offset pagination on large datasets (trips, bookings).

### Performance (incremental SSR/SSG)
Priority order by SEO/conversion impact. Dashboards stay client-side.

1. [ ] **Landing page → SSG.** Marketing content rarely changes. Biggest SEO win.
2. [ ] **Trip detail pages → ISR.** Product pages Google should index. Revalidate on trip update.
3. [ ] **Search/explore → SSR initial + client refinement.** Server-render first paint, keep filters interactive.

### Security
- [ ] Encrypt bank details / identity documents at rest (KMS).
- [ ] Separate upload intents: public trip assets (CDN, resized) vs private identity files (private bucket, signed URLs, antivirus).
- [ ] Strict CSP/HSTS headers on all Next.js apps.
- [ ] CSRF/Origin checks on cookie-authenticated mutations.

### Code health
- [ ] Split oversized files (`admin/page.tsx`, trip create/edit wizards).
- [ ] Enable `strictNullChecks` / `noImplicitAny` in API tsconfig.
- [ ] Fix `production-smoke.yml` (Playwright JSON output path).
- [ ] Enforce `packages/ui` boundary — remove duplicated shadcn components in apps.

## Phase 3 — African expansion

- [ ] Multi-currency ledger (one wallet per currency, immutable FX snapshots).
- [ ] IANA timezones at agency/trip/session level.
- [ ] Remove Morocco/MAD hardcodes (phone, address, currency defaults → market config).
- [ ] Country-specific tax / consumer-protection / payment rule configs.

## Phase 4 — Global scale

- [ ] Multi-region deployment.
- [ ] Read replicas for analytics queries (move aggregations to DB).
- [ ] Full i18n locale coverage beyond ar/fr/en.
