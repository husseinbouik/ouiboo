# Architecture Overview

> Corrected 2026-10-27 (#442). The previous version of this document
> described a system Ouiboo does not run — Kubernetes orchestration, a
> wallet/payout ledger, Stripe/PayPal gateways, SendGrid/AWS SES, AWS S3
> or Azure Blob, an ELK/CloudWatch logging stack, and a `develop`-branch
> Git Flow. None of that is the live architecture. This version describes
> the stack as deployed; where a capability does not exist yet, it says
> so instead of presenting it as built.

## System Architecture

Ouiboo is a monorepo (npm workspaces + Turborepo) with five deployable
apps and shared packages. Everything is deployed to **Vercel** as
serverless projects — there are no containers, no Kubernetes, and no
separately deployed worker service in the live stack.

```
┌─────────────────────────────────────────────────────────────┐
│  Client layer — Vercel (Next.js)                             │
│  ┌────────────┐ ┌────────────┐ ┌───────────┐ ┌────────────┐ │
│  │  Traveler  │ │   Agency   │ │   Admin   │ │  Landing   │ │
│  └────────────┘ └────────────┘ └───────────┘ └────────────┘ │
└───────────────────────┬─────────────────────────────────────┘
                        │  HTTPS / REST (/api/v1)
┌───────────────────────┼─────────────────────────────────────┐
│  API — NestJS on Vercel (serverless)                         │
│  Controllers │ Guards │ Interceptors │ Filters │ WebSocket   │
│  gateway (Socket.io) for real-time notifications             │
└───────────────────────┬─────────────────────────────────────┘
                        │  Prisma ORM
┌───────────────────────┼─────────────────────────────────────┐
│  Data & services                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Neon         │ │ Upstash      │ │ Backblaze (S3-       │ │
│  │ Postgres     │ │ Redis        │ │ compatible) storage  │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  SMTP email (environment-configured nodemailer transport)    │
└──────────────────────────────────────────────────────────────┘
```

Each app exists twice: a production project deploying from `master`
and a staging twin deploying from `staging`. Promotion is the gated
manual path in `docs/launch-ops/RELEASE_RUNBOOK.md` — no workflow
promotes code, and migrations are applied by hand (see Deployment).

## Module Structure

The API (`apps/api/src/`) is organised by domain module:

```
apps/api/src/
├── auth/                    # Authentication & authorization (incl. MFA, break-glass)
├── users/                   # User management
├── trips/                   # Trip templates & sessions
├── bookings/                # Booking management
├── payments/                # Payment handling
├── staged-payments/         # Staged (deposit / balance) payment flow
├── external-payments/       # Payments made directly to the agency
├── payment-providers/       # Provider integration seam
├── refunds/                 # RefundCase lifecycle (agency pays the traveller)
├── cancellation/            # Cancellation policy handling
├── reviews/                 # Reviews & ratings
├── wishlist/                # Wishlist management
├── analytics/               # Analytics & reporting (incl. beta metrics)
├── notifications/           # Notifications & reminders
├── messages/                # Direct messaging
├── currency/                # Currency conversion
├── websocket/               # Real-time communication (Socket.io)
├── email/                   # Email service (trilingual templates)
├── admin/                   # Admin operations
├── agency/                  # Agency management
├── invoices/                # Agency invoicing
├── upload/                  # File upload (hostile-upload checks)
├── cron/                    # Scheduled backstops (e.g. refund-overdue sweep)
├── health/                  # Health endpoints
├── monitoring/              # Monitoring support
├── copyright/               # Copyright / takedown handling
├── database/                # Database module
├── common/                  # Common utilities
└── app.module.ts            # Main application module
```

There is **no wallet module and no payout flow**. The money model is
deliberate: the traveller pays the agency directly (bank transfer +
uploaded payment proof at launch), the agency pays refunds directly,
and Ouiboo never holds traveller money. `RefundCase` tracks money the
agency owes a traveller; it is a case record, not a balance Ouiboo
controls.

## Database Schema

The data model is built with Prisma ORM on Neon Postgres. Key entities:

### Core Entities
- **User**: Platform users (TRAVELER, AGENCY, ADMIN)
- **AgencyProfile**: Agency details and verification
- **TripTemplate**: Trip offerings
- **TripSession**: Specific trip departures
- **Booking**: Trip bookings by travellers

### Business Entities
- **Review**: Trip reviews and ratings
- **Wishlist**: Saved trips by travellers
- **Message**: Direct messages between travellers and agencies
- **Conversation**: Conversation threads

### Financial Entities
- **Booking**: Payment information and payment snapshot
- **RefundCase**: A refund the agency owes a traveller, with its due
  date (`refundDueAt`, 7-day SLA) and evidence requirements
- **PaymentTransaction**: Payment records

### Support Entities
- **NotificationPreference**: User notification settings
- **NotificationLog**: Sent notification tracking
- **ExchangeRate**: Cached currency rates
- **AuditLog**: System action tracking

## Authentication & Authorization

### JWT-based Authentication
- **Access Token**: Short-lived (15 minutes), used for API requests;
  held in memory by the clients, never in web storage
- **Refresh Token**: Long-lived (7 days), held in an `HttpOnly` cookie,
  used to obtain new access tokens
- **Token Rotation**: Refresh tokens rotate on use
- Admin accounts additionally use TOTP MFA, with a separate break-glass
  recovery path (`docs/launch-ops/BREAK_GLASS_RUNBOOK.md`)

### Role-Based Access Control (RBAC)
- **TRAVELER**: Can book trips, leave reviews, manage wishlist
- **AGENCY**: Can create/manage trips, view bookings, access analytics
- **ADMIN**: Full platform access, approval workflows

Server authorization is authoritative: every endpoint enforces role
and ownership checks.

## API Versioning

Current version: **v1**

All endpoints are prefixed with `/api/v1`. Clients must configure the
API base URL including that prefix (`NEXT_PUBLIC_API_URL`).

## External Integrations

### Payments
- **Bank transfer + manual payment proof** is the launch payment
  method: the traveller transfers to the agency and uploads a proof;
  the agency reviews the proof, and only the agency's bank confirmation
  settles the booking (an accepted proof is not settlement).
- No card gateway (Stripe, CMI, PayPal or other) is part of the live
  launch flow. Provider code exists behind the payment-providers seam
  only; do not document a gateway as live until it is enabled,
  verified on a deployed environment, and recorded in the release
  attestation.

### Email Service
- **SMTP** via the API's nodemailer transport, configured purely by
  environment (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).
  Transactional templates are trilingual (EN/FR/AR).

### File Storage
- **Backblaze** (S3-compatible) for trip images, payment proofs, and
  documents, accessed through the API's S3 storage provider.

### Real-time Communication
- **Socket.io** WebSocket gateway in the API for real-time
  notifications.

### Currency Exchange
- Exchange rates are cached in the database (`ExchangeRate`) and
  served by the currency module.

## Deployment Architecture

### Hosting
- **Vercel serverless** for all five apps, per environment (production
  from `master`, staging twins from `staging`).
- No Docker/Kubernetes deployment exists. Docker, where present in the
  repo, is a local-development convenience only.

### CI/CD Pipeline
- GitHub Actions run CI, Security scanning, and Browser-E2E on pull
  requests; `production-smoke.yml` is advisory only and never gates a
  release; `uptime-monitor.yml` checks production + staging health.
- **Promotion is manual and gated**: one attested staging SHA, one
  batched `staging` → `master` PR, human blocking smoke, per-surface
  verification on the deployed apps. Full procedure:
  `docs/launch-ops/RELEASE_RUNBOOK.md`.
- **Migrations never auto-apply** — not on Vercel deploy, not from CI.
  The release's named migration owner applies each migration once, by
  hand, in the Neon Console, and records it in `_prisma_migrations`.

### Rollback
App rollback restores the last known-good Vercel deployment; the
decision rules and post-deploy checks are in
`docs/launch-ops/ROLLBACK_AND_POST_DEPLOY_CHECKLIST.md`.

## Security Architecture

### Network Security
- HTTPS/TLS for all communications
- CORS configuration for web clients
- Rate limiting on sensitive endpoints (Upstash Redis)

### Application Security
- JWT token-based authentication (access token in memory, refresh
  token in an `HttpOnly` cookie — never web storage)
- Password hashing with bcrypt
- Input validation and sanitization at the DTO boundary
- SQL injection prevention via Prisma ORM
- Uploads treated as hostile: authenticated, size-limited,
  magic-byte/MIME-checked, safely named, privately accessed

### Data Protection
- Data in transit encryption (TLS); Neon-managed encryption at rest
- Secure password reset tokens
- PII data retention policies (`docs/PRIVACY_RIGHTS.md`,
  `docs/PRIVACY_ACCOUNT_DELETION_RETENTION.md`)

## Performance Optimization

### Caching Strategy
- **Upstash Redis**: rate limiting and cached data such as exchange
  rates
- **CDN**: Vercel serves static assets and optimized images

### Query Optimization
- Database indexes on frequently queried fields
- Query result pagination with metadata
- N+1 query prevention

### Frontend Optimization
- Code splitting and lazy loading
- Image optimization (responsive images via the framework optimizer)

## Monitoring & Observability

The full, current description is `docs/OPERATIONS_MONITORING.md`:

- **Alerting**: the GitHub Actions uptime monitor checks production +
  staging API health and frontend URLs; a failed run notifies the
  workflow owner via GitHub. There is no paging service.
- **Logs**: the API emits one structured JSON `http_error` line per
  error response, read in the Vercel dashboard → API project → Logs.
  External log drains are a Vercel Pro feature and are not configured.
- There is no ELK/CloudWatch/APM stack in the live setup.

## Disaster Recovery

- **Database**: Neon automated backups with point-in-time recovery;
  a production backup is taken and confirmed restorable before every
  promotion (Release Runbook, Gate B).
- **Rollback**: restore the last known-good Vercel deployment per the
  rollback checklist; schema-incompatible changes escalate before any
  rollback.
- There is no multi-region deployment; the apps and database run in
  their single configured regions.

## Development Workflow

### Branches
- `staging`: integration branch; staging apps deploy from it
- `master`: production; production apps deploy from it, only via the
  gated promotion path
- Topic branches merge into `staging` by pull request; issue lifecycle
  is `todo → in progress → in staging → verified in staging → in prod`,
  closing only after verification on the deployed environment

### Code Standards
- TypeScript for type safety
- ESLint for code style
- Unit tests with Jest
- E2E tests with Playwright (API and browser suites in CI)

### Testing Strategy
- Unit tests for services
- Integration tests for API endpoints
- Browser E2E for critical user flows
- A release is verified on the deployed staging/production apps, per
  surface — unit tests alone never establish launch readiness
